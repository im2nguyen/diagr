import { DiagrPlugin, PluginContext } from '@/lib/diagr/types';
import { DiagrNodeRenderer, registerNodeRenderer } from '@/lib/diagr/diagram-engine/registry';

export function createPluginContext(): PluginContext {
  return {
    registerNodeType: (name, component) => {
      if (typeof component === 'function') {
        registerNodeRenderer(name, component as DiagrNodeRenderer);
      }
    },
    registerEdgeType: () => {},
    registerGroupType: () => {},
    extendSchema: () => {},
    registerLayoutHook: () => {},
  };
}

export function loadPlugins(plugins: DiagrPlugin[]): void {
  const context = createPluginContext();
  plugins.forEach((plugin) => {
    plugin.register(context);
  });
}
