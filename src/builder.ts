import { loadConfig, normalizePlugins, type NormalizedPlugin } from "./config.ts";
import { type State, type StatePlugin } from "./state.ts";
import { joinPath, repoDir } from "./paths.ts";
import { IDATEN_VERSION } from "./version.ts";

type BuildOptions = {
  configPath: string;
  idatenDir: string;
};

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

function relativePath(base: string, full: string): string {
  const baseNorm = normalizePath(base);
  const fullNorm = normalizePath(full);
  if (fullNorm.startsWith(baseNorm + "/")) {
    return fullNorm.slice(baseNorm.length + 1);
  }
  return fullNorm;
}

async function walkDir(dir: string, callback: (path: string) => void): Promise<void> {
  for await (const entry of Deno.readDir(dir)) {
    const entryPath = joinPath(dir, entry.name);
    if (entry.isDirectory) {
      await walkDir(entryPath, callback);
      continue;
    }
    if (entry.isFile) {
      callback(entryPath);
    }
  }
}

async function collectRecursive(root: string, subdir: string): Promise<string[]> {
  const target = joinPath(root, subdir);
  if (!(await isDirectory(target))) {
    return [];
  }
  const results: string[] = [];
  await walkDir(target, (path) => {
    if (path.endsWith(".vim")) {
      const rel = relativePath(target, path);
      results.push(joinPath(subdir, rel));
    }
  });
  results.sort();
  return results;
}

async function collectFiletypeSources(
  root: string,
  subdir: string,
  target: Record<string, string[]>,
): Promise<void> {
  const dir = joinPath(root, subdir);
  if (!(await isDirectory(dir))) {
    return;
  }
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (!entry.isFile) {
      continue;
    }
    if (!entry.name.endsWith(".vim")) {
      continue;
    }
    files.push(entry.name);
  }
  files.sort();
  for (const file of files) {
    const ft = file.slice(0, -4);
    if (!target[ft]) {
      target[ft] = [];
    }
    target[ft].push(joinPath(subdir, file));
  }
}

function topoSort(plugins: Map<string, NormalizedPlugin>): string[] {
  const order: string[] = [];
  const temp = new Set<string>();
  const perm = new Set<string>();
  const names = [...plugins.keys()].sort();

  const visit = (name: string) => {
    if (perm.has(name)) {
      return;
    }
    if (temp.has(name)) {
      throw new Error(`dependency cycle detected at ${name}`);
    }
    const plugin = plugins.get(name);
    if (!plugin) {
      throw new Error(`missing plugin: ${name}`);
    }
    temp.add(name);
    for (const dep of plugin.depends) {
      if (!plugins.has(dep)) {
        throw new Error(`missing dependency: ${dep} (required by ${name})`);
      }
      visit(dep);
    }
    temp.delete(name);
    perm.add(name);
    order.push(name);
  };

  for (const name of names) {
    visit(name);
  }

  return order;
}

function addTrigger(
  table: Record<string, string[]>,
  key: string,
  name: string,
): void {
  if (!table[key]) {
    table[key] = [];
  }
  if (!table[key].includes(name)) {
    table[key].push(name);
  }
}

function normalizeTriggers(triggers: Record<string, string[]>): Record<string, string[]> {
  const entries = Object.entries(triggers);
  const normalized: Record<string, string[]> = {};
  for (const [key, names] of entries) {
    const unique = new Set(names);
    normalized[key] = [...unique].sort();
  }
  return normalized;
}

async function buildPluginState(
  plugin: NormalizedPlugin,
  idatenDir: string,
): Promise<StatePlugin> {
  const installPath = repoDir(idatenDir, plugin.name);
  const basePath = plugin.dev.enable ? plugin.dev.override_path : installPath;
  const rtpBase = plugin.rtp ? joinPath(basePath, plugin.rtp) : basePath;

  if (!(await isDirectory(rtpBase))) {
    throw new Error(`plugin directory missing: ${rtpBase}`);
  }

  const bootSources = await collectRecursive(rtpBase, "ftdetect");
  const sources = [
    ...(await collectRecursive(rtpBase, "autoload")),
    ...(await collectRecursive(rtpBase, "plugin")),
    ...(await collectRecursive(rtpBase, "after/plugin")),
  ];

  const ftSources = {
    ftplugin: {} as Record<string, string[]>,
    indent: {} as Record<string, string[]>,
    syntax: {} as Record<string, string[]>,
  };

  await collectFiletypeSources(rtpBase, "ftplugin", ftSources.ftplugin);
  await collectFiletypeSources(rtpBase, "after/ftplugin", ftSources.ftplugin);
  await collectFiletypeSources(rtpBase, "indent", ftSources.indent);
  await collectFiletypeSources(rtpBase, "after/indent", ftSources.indent);
  await collectFiletypeSources(rtpBase, "syntax", ftSources.syntax);
  await collectFiletypeSources(rtpBase, "after/syntax", ftSources.syntax);

  return {
    path: installPath,
    rtp: plugin.rtp,
    depends: plugin.depends,
    lazy: plugin.lazy,
    hooks: {
      add: plugin.hooks.add,
      source: plugin.hooks.source,
    },
    sources,
    boot_sources: bootSources,
    ft_sources: ftSources,
    dev: {
      enable: plugin.dev.enable,
      override_path: plugin.dev.override_path,
    },
  };
}

export async function buildState(options: BuildOptions): Promise<State> {
  const plugins = await loadConfig(options.configPath, options.idatenDir);
  const normalized = normalizePlugins(plugins);

  const byName = new Map<string, NormalizedPlugin>();
  for (const plugin of normalized) {
    byName.set(plugin.name, plugin);
  }

  const order = topoSort(byName);

  const triggers = {
    event: {} as Record<string, string[]>,
    ft: {} as Record<string, string[]>,
    cmd: {} as Record<string, string[]>,
  };

  for (const plugin of normalized) {
    for (const event of plugin.lazy.on_event) {
      addTrigger(triggers.event, event, plugin.name);
    }
    for (const ft of plugin.lazy.on_ft) {
      addTrigger(triggers.ft, ft, plugin.name);
    }
    for (const cmd of plugin.lazy.on_cmd) {
      addTrigger(triggers.cmd, cmd, plugin.name);
    }
  }

  const statePlugins: Record<string, StatePlugin> = {};
  for (const plugin of normalized) {
    statePlugins[plugin.name] = await buildPluginState(plugin, options.idatenDir);
  }

  return {
    schema: 1,
    meta: {
      idaten_version: IDATEN_VERSION,
      config_path: options.configPath,
      generated_at: new Date().toISOString(),
    },
    plugins: statePlugins,
    order,
    triggers: {
      event: normalizeTriggers(triggers.event),
      ft: normalizeTriggers(triggers.ft),
      cmd: normalizeTriggers(triggers.cmd),
    },
  };
}
