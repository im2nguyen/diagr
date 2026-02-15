'use client';

import { toPng, toSvg } from 'html-to-image';

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const EXPORT_PADDING = 20;
const DEFAULT_EXPORT_NAME = 'diagr-diagram.png';

export function toPngFilename(rawFilename?: string): string {
  if (!rawFilename) {
    return DEFAULT_EXPORT_NAME;
  }

  const cleaned = rawFilename
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '');

  if (!cleaned) {
    return DEFAULT_EXPORT_NAME;
  }

  const withoutExt = cleaned.replace(/\.[a-z0-9]+$/i, '');
  return `${withoutExt || 'diagr-diagram'}.png`;
}

function collectElementBounds(element: HTMLElement): Bounds | null {
  const hostRect = element.getBoundingClientRect();
  const targets = element.querySelectorAll<HTMLElement>(
    '.react-flow__node, .react-flow__edge, .react-flow__edge-text, .react-flow__edge-label',
  );

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  targets.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }
    minX = Math.min(minX, rect.left - hostRect.left);
    minY = Math.min(minY, rect.top - hostRect.top);
    maxX = Math.max(maxX, rect.right - hostRect.left);
    maxY = Math.max(maxY, rect.bottom - hostRect.top);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function getCropRect(element: HTMLElement): CropRect | null {
  const bounds = collectElementBounds(element);
  if (!bounds) {
    return null;
  }

  const hostRect = element.getBoundingClientRect();
  const x = Math.max(0, Math.floor(bounds.minX - EXPORT_PADDING));
  const y = Math.max(0, Math.floor(bounds.minY - EXPORT_PADDING));
  const width = Math.min(
    Math.ceil(bounds.maxX - bounds.minX + EXPORT_PADDING * 2),
    Math.max(1, Math.ceil(hostRect.width - x)),
  );
  const height = Math.min(
    Math.ceil(bounds.maxY - bounds.minY + EXPORT_PADDING * 2),
    Math.max(1, Math.ceil(hostRect.height - y)),
  );

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load export image.'));
    image.src = dataUrl;
  });
}

export async function exportCanvasToPng(element: HTMLElement, filename: string): Promise<void> {
  const fullDataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    // Prevent html-to-image from traversing cross-origin stylesheets for @font-face inlining.
    fontEmbedCSS: '',
  });

  const cropRect = getCropRect(element);
  let dataUrl = fullDataUrl;

  if (cropRect) {
    const hostRect = element.getBoundingClientRect();
    const image = await loadImage(fullDataUrl);
    const scaleX = image.width / Math.max(1, hostRect.width);
    const scaleY = image.height / Math.max(1, hostRect.height);
    const sx = Math.max(0, Math.floor(cropRect.x * scaleX));
    const sy = Math.max(0, Math.floor(cropRect.y * scaleY));
    const sw = Math.min(image.width - sx, Math.ceil(cropRect.width * scaleX));
    const sh = Math.min(image.height - sy, Math.ceil(cropRect.height * scaleY));

    if (sw > 0 && sh > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        dataUrl = canvas.toDataURL('image/png');
      }
    }
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportCanvasToSvg(element: HTMLElement, filename: string): Promise<void> {
  const hostRect = element.getBoundingClientRect();
  const cropRect = getCropRect(element);

  if (!cropRect) {
    const fullDataUrl = await toSvg(element, { cacheBust: true });
    const link = document.createElement('a');
    link.download = filename;
    link.href = fullDataUrl;
    link.click();
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${cropRect.width}px`;
  wrapper.style.height = `${cropRect.height}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.background = 'transparent';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${Math.ceil(hostRect.width)}px`;
  clone.style.height = `${Math.ceil(hostRect.height)}px`;
  clone.style.margin = '0';
  clone.style.transformOrigin = 'top left';
  clone.style.transform = `translate(${-cropRect.x}px, ${-cropRect.y}px)`;

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const dataUrl = await toSvg(wrapper, {
    cacheBust: true,
    width: cropRect.width,
    height: cropRect.height,
  });

  wrapper.remove();

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
