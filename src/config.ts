import { isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ImportMapImporter, loadImportMap } from "jsr:@lambdalisue/import-map-importer@^0.5.1";
import { ensureImportMap, importMapPath } from "./import_map.ts";
import { isLocalPathSpec, normalizeRepoSpec } from "./repo.ts";
import type { Context, Plugin } from "./types.ts";

export type NormalizedPlugin = {
  name: string;
  repo: string;
  rev: string;
  rtp: string;
  depends: string[];
  hooks: {
    post_update: string;
  };
  hook_add_path: string;
  hook_source_path: string;
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

export async function createImporter(idatenDir: string): Promise<ImportMapImporter> {
  await ensureImportMap(idatenDir);
  const map = await loadImportMap(importMapPath(idatenDir), {});
  return new ImportMapImporter(map);
}

export async function loadConfig(
  configPath: string,
  idatenDir: string,
  ctx: Context,
  importer?: ImportMapImporter,
): Promise<Plugin[]> {
  const actualImporter = importer ?? await createImporter(idatenDir);
  const moduleUrl = pathToFileURL(configPath).href;
  const mod = await actualImporter.import<{ configure?: (ctx: Context) => Promise<Plugin[]> }>(
    moduleUrl,
  );
  if (typeof mod.configure !== "function") {
    throw new Error("configure function is missing in config");
  }
  const plugins = await mod.configure(ctx);
  if (!Array.isArray(plugins)) {
    throw new Error("configure must return Plugin[]");
  }
  return plugins as Plugin[];
}

function userHome(): string {
  return Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
}

function expandHome(path: string): string {
  if (!path.startsWith("~")) {
    return path;
  }
  const home = userHome();
  if (!home) {
    throw new Error("HOME is not set for ~ expansion");
  }
  if (path === "~") {
    return home;
  }
  if (path.startsWith("~/") || path.startsWith("~\\")) {
    return home + path.slice(1);
  }
  throw new Error("only ~ is supported for hook path");
}

function normalizeHookPath(value: string | undefined, label: string): string {
  if (typeof value === "undefined") {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const expanded = expandHome(trimmed);
  if (!isAbsolute(expanded)) {
    throw new Error(`${label} must be an absolute path or ~`);
  }
  return expanded;
}

function normalizeStringList(values?: string[]): string[] {
  if (!values || values.length === 0) {
    return [];
  }
  const items = values.map((item) => item.trim()).filter((item) => item.length > 0);
  const unique = new Set(items);
  return [...unique].sort();
}

function sanitizeName(value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  return safe.length === 0 ? "_" : safe;
}

function trimTrailingSeparators(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

function basenameFromPath(path: string): string {
  const trimmed = trimTrailingSeparators(path);
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}

function autoNameFromPath(path: string, rev: string): string {
  const base = basenameFromPath(path);
  const combined = rev.length > 0 ? `${base}-${rev}` : base;
  return sanitizeName(combined);
}

async function resolveLocalPath(value: string, ctx: Context): Promise<string> {
  let path = value.trim();
  if (path.length === 0) {
    throw new Error("local path is empty");
  }
  if (path.startsWith("file://")) {
    try {
      path = fileURLToPath(path);
    } catch {
      throw new Error(`invalid file URL: ${value}`);
    }
  }
  const expanded = await ctx.denops.call("expand", path) as string;
  const absolute = await ctx.denops.call("fnamemodify", expanded, ":p") as string;
  if (typeof absolute !== "string" || absolute.length === 0) {
    throw new Error(`failed to resolve path: ${value}`);
  }
  const trimmed = trimTrailingSeparators(absolute);
  return trimmed.length > 0 ? trimmed : absolute;
}

async function normalizePlugin(plugin: Plugin, ctx: Context): Promise<NormalizedPlugin> {
  const rawRepo = plugin.repo?.trim() ?? "";
  const rawName = plugin.name?.trim() ?? "";
  if (rawRepo.length === 0) {
    throw new Error("repo is required");
  }
  const legacyHooks = plugin.hooks as Record<string, unknown> | undefined;
  if (legacyHooks && ("hook_add" in legacyHooks || "hook_source" in legacyHooks)) {
    const label = rawName.length > 0 ? rawName : rawRepo;
    throw new Error(`hook_add/hook_source is removed. use hookAdd/hookSource for ${label}`);
  }
  const hookAddPath = normalizeHookPath(plugin.hookAdd, "hookAdd");
  const hookSourcePath = normalizeHookPath(plugin.hookSource, "hookSource");
  const rev = plugin.rev?.trim() ?? "";
  const nameIsDefault = rawName.length === 0 || rawName === rawRepo;
  let name = rawName;
  let repo = "";
  let devEnable = plugin.dev?.enable ?? false;
  let overridePath = plugin.dev?.overridePath?.trim() ?? "";
  if (overridePath.length > 0) {
    overridePath = await resolveLocalPath(overridePath, ctx);
  }
  if (isLocalPathSpec(rawRepo)) {
    const resolvedRepoPath = await resolveLocalPath(rawRepo, ctx);
    if (overridePath.length > 0 && overridePath !== resolvedRepoPath) {
      throw new Error(`dev.overridePath conflicts with repo: ${rawRepo}`);
    }
    devEnable = true;
    overridePath = resolvedRepoPath;
    repo = resolvedRepoPath;
    if (nameIsDefault) {
      name = autoNameFromPath(resolvedRepoPath, rev);
    }
  } else {
    repo = normalizeRepoSpec(rawRepo);
    if (name.length === 0) {
      name = repo;
    }
  }
  if (name.length === 0) {
    throw new Error("plugin name is required");
  }
  return {
    name,
    repo,
    rev,
    rtp: plugin.rtp?.trim() ?? "",
    depends: normalizeStringList(plugin.depends),
    hooks: {
      post_update: plugin.hooks?.hook_post_update ?? "",
    },
    hook_add_path: hookAddPath,
    hook_source_path: hookSourcePath,
    lazy: {
      on_event: normalizeStringList(plugin.lazy?.on_event),
      on_ft: normalizeStringList(plugin.lazy?.on_ft),
      on_cmd: normalizeStringList(plugin.lazy?.on_cmd),
    },
    dev: {
      enable: devEnable,
      override_path: overridePath,
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

export async function normalizePlugins(
  plugins: Plugin[],
  ctx: Context,
): Promise<NormalizedPlugin[]> {
  const normalized: NormalizedPlugin[] = [];
  for (const plugin of plugins) {
    normalized.push(await normalizePlugin(plugin, ctx));
  }
  ensureUnique(normalized.map((plugin) => plugin.name));
  for (const plugin of normalized) {
    if (plugin.dev.enable && plugin.dev.override_path.length === 0) {
      throw new Error(`dev.overridePath is required for ${plugin.name}`);
    }
  }
  return normalized;
}
