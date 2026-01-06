import { pathToFileURL } from "node:url";
import { ImportMapImporter, loadImportMap } from "jsr:@lambdalisue/import-map-importer@^0.5.1";
import { ensureImportMap, importMapPath } from "./import_map.ts";
import { normalizeRepoSpec } from "./repo.ts";
import type { Context, Plugin } from "./types.ts";

export type NormalizedPlugin = {
  name: string;
  repo: string;
  rev: string;
  rtp: string;
  depends: string[];
  hooks: {
    add: string;
    source: string;
    post_update: string;
  };
  lazy: {
    on_event: string[];
    on_ft: string[];
    on_cmd: string[];
  };
  dev: {
    enable: boolean;
    override_path: string;
  };
};

export async function loadConfig(configPath: string, idatenDir: string): Promise<Plugin[]> {
  await ensureImportMap(idatenDir);
  const map = await loadImportMap(importMapPath(idatenDir), {});
  const importer = new ImportMapImporter(map);
  const moduleUrl = pathToFileURL(configPath).href;
  const mod = await importer.import<{ configure?: (ctx: Context) => Promise<Plugin[]> }>(
    moduleUrl,
  );
  if (typeof mod.configure !== "function") {
    throw new Error("configure function is missing in config");
  }
  const ctx: Context = {};
  const plugins = await mod.configure(ctx);
  if (!Array.isArray(plugins)) {
    throw new Error("configure must return Plugin[]");
  }
  return plugins as Plugin[];
}

function normalizeStringList(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  const items = values.map((item) => item.trim()).filter((item) => item.length > 0);
  const unique = new Set(items);
  return [...unique].sort();
}

function normalizePlugin(plugin: Plugin): NormalizedPlugin {
  const name = plugin.name?.trim() ?? "";
  if (name.length === 0) {
    throw new Error("plugin name is required");
  }
  if (!plugin.repo || plugin.repo.trim().length === 0) {
    throw new Error(`repo is required for ${name}`);
  }
  return {
    name,
    repo: normalizeRepoSpec(plugin.repo),
    rev: plugin.rev?.trim() ?? "",
    rtp: plugin.rtp?.trim() ?? "",
    depends: normalizeStringList(plugin.depends),
    hooks: {
      add: plugin.hooks?.hook_add ?? "",
      source: plugin.hooks?.hook_source ?? "",
      post_update: plugin.hooks?.hook_post_update ?? "",
    },
    lazy: {
      on_event: normalizeStringList(plugin.lazy?.on_event),
      on_ft: normalizeStringList(plugin.lazy?.on_ft),
      on_cmd: normalizeStringList(plugin.lazy?.on_cmd),
    },
    dev: {
      enable: plugin.dev?.enable ?? false,
      override_path: plugin.dev?.overridePath?.trim() ?? "",
    },
  };
}

function ensureUnique(names: string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      throw new Error(`duplicate plugin name: ${name}`);
    }
    seen.add(name);
  }
}

export function normalizePlugins(plugins: Plugin[]): NormalizedPlugin[] {
  const normalized = plugins.map(normalizePlugin);
  ensureUnique(normalized.map((plugin) => plugin.name));
  for (const plugin of normalized) {
    if (plugin.dev.enable && plugin.dev.override_path.length === 0) {
      throw new Error(`dev.overridePath is required for ${plugin.name}`);
    }
  }
  return normalized;
}
