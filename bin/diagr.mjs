#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { applyThemeOverride, validateInput } from '../lib/diagr/cli/validation.mjs';

const HOST = '127.0.0.1';

function printUsage() {
  console.log(`Usage:
  diagr FILENAME [STYLE_OVERRIDE_FILE] [--output PATH] [--theme THEME] [--base-url URL]

Options:
  --output PATH   Output PNG path. Overrides YAML filename.
  --theme THEME   Theme override (light | dark).
  --base-url URL  Use an already running Diagr app URL.
  --help          Show this help message.`);
}

function parseArgs(argv) {
  const positional = [];
  let output;
  let theme;
  let baseUrl;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      return { help: true };
    }
    if (arg === '--output') {
      output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--theme') {
      theme = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--base-url') {
      baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
  }

  if (!positional[0]) {
    throw new Error('FILENAME is required.');
  }

  return {
    help: false,
    sourcePath: positional[0],
    stylePath: positional[1],
    output,
    theme,
    baseUrl,
  };
}

function sanitizeFilename(value) {
  const cleaned = (value ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '');
  return cleaned || '';
}

function ensurePngExtension(filename) {
  if (/\.png$/i.test(filename)) {
    return filename;
  }
  return `${filename.replace(/\.[a-z0-9]+$/i, '')}.png`;
}

function resolveOutputPath({ outputArg, yamlFilename, sourcePath, cwd }) {
  if (outputArg) {
    const abs = path.resolve(cwd, outputArg);
    const dir = path.dirname(abs);
    const file = ensurePngExtension(path.basename(abs));
    return path.join(dir, file);
  }

  const fromYaml = sanitizeFilename(yamlFilename);
  if (fromYaml) {
    return path.join(cwd, ensurePngExtension(fromYaml));
  }

  const base = path.basename(sourcePath, path.extname(sourcePath));
  const safe = sanitizeFilename(base) || 'diagr-diagram';
  return path.join(cwd, ensurePngExtension(safe));
}

function findFreePort() {
  const min = 4100;
  const max = 4999;
  return min + Math.floor(Math.random() * (max - min));
}

async function canReachServer(url) {
  try {
    const res = await fetch(url);
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30000, processRef) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    if (processRef && processRef.exitCode !== null) {
      const stderr = (processRef.stderrBuffer || '').trim();
      const stdout = (processRef.stdoutBuffer || '').trim();
      const details = stderr || stdout || 'No process output captured.';
      throw new Error(`Next server exited before startup at ${url}.\n${details}`);
    }
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Timed out waiting for Next server at ${url}. ${lastError ? String(lastError) : ''}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill('SIGTERM');
  try {
    await Promise.race([
      once(child, 'exit'),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // Ignore and force kill below if needed.
  }
  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

function nextBinPath() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dirname, '../node_modules/next/dist/bin/next');
}

function startNextDev(cwd, port) {
  const child = spawn(process.execPath, [nextBinPath(), 'dev', '--hostname', HOST, '--port', String(port)], {
    cwd,
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdoutBuffer = '';
  child.stderrBuffer = '';
  child.stdout.on('data', (chunk) => {
    child.stdoutBuffer += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    child.stderrBuffer += chunk.toString();
  });
  return child;
}

async function startManagedNextServer(cwd, attempts = 3) {
  let lastError = null;

  for (let i = 0; i < attempts; i += 1) {
    const port = findFreePort();
    const baseUrl = `http://${HOST}:${port}`;
    const processRef = startNextDev(cwd, port);
    try {
      await waitForServer(baseUrl, 120000, processRef);
      return { baseUrl, processRef };
    } catch (error) {
      lastError = error;
      await stopProcess(processRef);
    }
  }

  throw lastError || new Error('Unable to start local Next server for CLI export.');
}

async function capturePng(baseUrl, source, style, outputPath) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 2600, height: 1800 } });

  await page.addInitScript(
    ({ sourceValue, styleValue }) => {
      localStorage.setItem('diagr:source', sourceValue);
      localStorage.setItem('diagr:theme', styleValue);
    },
    { sourceValue: source, styleValue: style ?? '' },
  );

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#diagr-diagram-canvas .react-flow__node', { timeout: 30000 });
  await page.waitForTimeout(400);

  const clip = await page.evaluate(() => {
    const host = document.getElementById('diagr-diagram-canvas');
    if (!host) return null;
    const hostRect = host.getBoundingClientRect();
    const targets = host.querySelectorAll('.react-flow__node, .react-flow__edge, .react-flow__edge-text, .react-flow__edge-label');

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    targets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return {
        x: Math.max(0, hostRect.left),
        y: Math.max(0, hostRect.top),
        width: Math.max(1, hostRect.width),
        height: Math.max(1, hostRect.height),
      };
    }

    const padding = 20;
    const x = Math.max(0, Math.floor(minX - padding));
    const y = Math.max(0, Math.floor(minY - padding));
    const width = Math.max(1, Math.ceil(maxX - minX + padding * 2));
    const height = Math.max(1, Math.ceil(maxY - minY + padding * 2));
    return { x, y, width, height };
  });

  if (!clip) {
    await browser.close();
    throw new Error('Unable to determine export bounds.');
  }

  await page.screenshot({ path: outputPath, type: 'png', clip });
  await browser.close();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const cwd = process.cwd();
  const sourcePath = path.resolve(cwd, args.sourcePath);
  const stylePath = args.stylePath ? path.resolve(cwd, args.stylePath) : undefined;

  const rawSource = await fs.readFile(sourcePath, 'utf8');
  const source = applyThemeOverride(rawSource, args.theme);
  const style = stylePath ? await fs.readFile(stylePath, 'utf8') : '';

  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let baseUrl = args.baseUrl;
  let nextDev = null;

  if (baseUrl) {
    if (!(await canReachServer(baseUrl))) {
      throw new Error(`Unable to reach --base-url ${baseUrl}`);
    }
  } else {
    const server = await startManagedNextServer(projectRoot);
    baseUrl = server.baseUrl;
    nextDev = server.processRef;
  }

  try {
    const validation = await validateInput(source, style);
    const outputPath = resolveOutputPath({
      outputArg: args.output,
      yamlFilename: typeof validation?.filename === 'string' ? validation.filename : undefined,
      sourcePath,
      cwd,
    });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await capturePng(baseUrl, source, style, outputPath);
    console.log(`Exported: ${outputPath}`);
  } finally {
    await stopProcess(nextDev);
  }
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
