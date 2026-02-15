export type PluginManifest = {
  id: string;
  version: string;
  description?: string;
};

export type PluginModule = {
  manifest: PluginManifest;
  register: () => void;
};
