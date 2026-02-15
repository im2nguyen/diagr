import { ComponentType } from 'react';

export type DiagrRendererProps = {
  label: string;
  subtitle?: string;
  data?: Record<string, unknown>;
};

export type DiagrNodeRenderer = ComponentType<DiagrRendererProps>;

const nodeRendererRegistry = new Map<string, DiagrNodeRenderer>();

export function registerNodeRenderer(name: string, renderer: DiagrNodeRenderer): void {
  nodeRendererRegistry.set(name, renderer);
}

export function getNodeRenderer(name: string): DiagrNodeRenderer | undefined {
  return nodeRendererRegistry.get(name);
}

export function listNodeRenderers(): string[] {
  return [...nodeRendererRegistry.keys()].sort();
}
