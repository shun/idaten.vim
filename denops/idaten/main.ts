import type { Denops } from "jsr:@denops/core@^8.0.0";
import { compileState } from "../../src/compile.ts";
import { loadConfig, type NormalizedPlugin, normalizePlugins } from "../../src/config.ts";
import {
  gitCheckout,
  gitClone,
  gitCurrentHead,
  gitFetch,
  gitStatusPorcelain,
  gitVersion,
} from "../../src/git.ts";
import { lockfilePath, readLockfile, writeLockfile } from "../../src/lock.ts";
import { joinPath, repoDir } from "../../src/paths.ts";
import { normalizeRepoSpec } from "../../src/repo.ts";
import type { Context } from "../../src/types.ts";

function toStringArgs(args: unknown[]): string[] {
  return args.map((arg) => (typeof arg === "string" ? arg : String(arg)));
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function createContext(denops: Denops): Context {
  return { denops };
}

type ConfigOptionResult = {
  configPath: string;
  rest: string[];
  error: string;
};

function parseConfigOption(args: string[]): ConfigOptionResult {
  let configPath = "";
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--config") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        return {
          configPath: "",
          rest: [],
          error: "idaten: --config requires a path.",
        };
      }
      configPath = value;
      i++;
      continue;
    }
    if (arg.startsWith("--config=")) {
      const value = arg.slice("--config=".length);
      if (!value) {
        return {
          configPath: "",
          rest: [],
          error: "idaten: --config requires a path.",
        };
      }
      configPath = value;
      continue;
    }
    rest.push(arg);
  }
  return { configPath, rest, error: "" };
}

type SyncOptionResult = {
  configPath: string;
  rest: string[];
  locked: boolean;
  error: string;
};

function parseSyncOptions(args: string[]): SyncOptionResult {
  let locked = false;
  const filtered: string[] = [];
  for (const arg of args) {
    if (arg === "--locked") {
      locked = true;
      continue;
    }
    filtered.push(arg);
  }
  const config = parseConfigOption(filtered);
  return {
    configPath: config.configPath,
    rest: config.rest,
    locked,
    error: config.error,
  };
}

type UpdateOptionResult = {
  rev: string;
  names: string[];
  unknown: string[];
  self: boolean;
  error: string;
};

function parseUpdateOptions(args: string[]): UpdateOptionResult {
  let rev = "";
  let self = false;
  const names: string[] = [];
  const unknown: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--self") {
      if (self) {
        return {
          rev: "",
          names: [],
          unknown: [],
          self: false,
          error: "idaten: --self is specified multiple times.",
        };
      }
      self = true;
      continue;
    }
    if (arg === "--rev") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        return {
          rev: "",
          names: [],
          unknown: [],
          self: false,
          error: "idaten: --rev requires a revision.",
        };
      }
      if (rev.length > 0) {
        return {
          rev: "",
          names: [],
          unknown: [],
          self: false,
          error: "idaten: --rev is specified multiple times.",
        };
      }
      rev = value;
      i++;
      continue;
    }
    if (arg.startsWith("--rev=")) {
      const value = arg.slice("--rev=".length);
      if (!value) {
        return {
          rev: "",
          names: [],
          unknown: [],
          self: false,
          error: "idaten: --rev requires a revision.",
        };
      }
      if (rev.length > 0) {
        return {
          rev: "",
          names: [],
          unknown: [],
          self: false,
          error: "idaten: --rev is specified multiple times.",
        };
      }
      rev = value;
      continue;
    }
    if (arg.startsWith("--")) {
      unknown.push(arg);
      continue;
    }
    names.push(arg);
  }
  return { rev, names, unknown, self, error: "" };
}

async function notify(
  denops: Denops,
  hl: string,
  message: string,
): Promise<void> {
  const expr = await denops.call("string", message) as string;
  await denops.cmd(`echohl ${hl} | echomsg ${expr} | echohl None`);
}

async function resolveConfigPath(denops: Denops): Promise<string> {
  const path = await denops.eval("idaten#ResolveConfig()") as string;
  return typeof path === "string" ? path : "";
}

async function resolveIdatenDir(denops: Denops): Promise<string> {
  const path = await denops.eval("idaten#ResolveDir()") as string;
  return typeof path === "string" ? path : "";
}

async function handleCompile(denops: Denops, args: string[]): Promise<void> {
  const parsed = parseConfigOption(args);
  if (parsed.error) {
    await notify(denops, "WarningMsg", parsed.error);
    return;
  }
  for (const arg of parsed.rest) {
    await notify(denops, "WarningMsg", `idaten: unsupported option: ${arg}`);
  }

  const configPath = parsed.configPath || await resolveConfigPath(denops);
  if (!configPath) {
    await notify(
      denops,
      "WarningMsg",
      "idaten: g:idaten_config is empty. Set a config path or use --config.",
    );
    return;
  }

  const idatenDir = await resolveIdatenDir(denops);
  await denops.call("idaten#Log", `compile: start config=${configPath}`);

  try {
    await compileState({ configPath, idatenDir, context: createContext(denops) });
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `compile: failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: compile failed: ${message}`);
    return;
  }

  await denops.call("idaten#Log", "compile: done");
  await notify(denops, "MoreMsg", "idaten: compile finished.");
}

function formatGitError(label: string, message: string): string {
  return `${label}: ${message}`;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

async function resolvePath(denops: Denops, path: string): Promise<string> {
  const expanded = await denops.call("expand", path) as string;
  const absolute = await denops.call("fnamemodify", expanded, ":p") as string;
  if (typeof absolute === "string" && absolute.length > 0) {
    return absolute;
  }
  return typeof expanded === "string" ? expanded : path;
}

async function loadPlugins(
  configPath: string,
  idatenDir: string,
  denops: Denops,
): Promise<NormalizedPlugin[]> {
  const ctx = createContext(denops);
  const plugins = await loadConfig(configPath, idatenDir, ctx);
  return await normalizePlugins(plugins, ctx);
}

async function notifyLines(
  denops: Denops,
  hl: string,
  lines: string[],
): Promise<void> {
  for (const line of lines) {
    await notify(denops, hl, line);
  }
}

async function collectGitRoots(root: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isDirectory) {
        continue;
      }
      const entryPath = joinPath(dir, entry.name);
      const gitDir = joinPath(entryPath, ".git");
      if (await isDirectory(gitDir)) {
        results.push(entryPath);
        continue;
      }
      await walk(entryPath);
    }
  }
  if (await isDirectory(root)) {
    await walk(root);
  }
  return results.sort();
}

async function handleSync(denops: Denops, args: string[]): Promise<void> {
  const parsed = parseSyncOptions(args);
  if (parsed.error) {
    await notify(denops, "WarningMsg", parsed.error);
    return;
  }
  for (const arg of parsed.rest) {
    await notify(denops, "WarningMsg", `idaten: unsupported option: ${arg}`);
  }

  const configPath = parsed.configPath || await resolveConfigPath(denops);
  if (!configPath) {
    await notify(
      denops,
      "WarningMsg",
      "idaten: g:idaten_config is empty. Set a config path or use --config.",
    );
    return;
  }
  const locked = parsed.locked;
  const idatenDir = await resolveIdatenDir(denops);
  await denops.call("idaten#Log", `sync: start config=${configPath}`);

  let lock = null;
  if (locked) {
    lock = await readLockfile(idatenDir);
    if (!lock) {
      await notify(denops, "ErrorMsg", "idaten: lockfile is missing.");
      return;
    }
    if (lock.schema !== 1) {
      await notify(denops, "ErrorMsg", "idaten: lockfile schema mismatch.");
      return;
    }
  }

  let plugins: NormalizedPlugin[] = [];
  try {
    plugins = await loadPlugins(configPath, idatenDir, denops);
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `sync: config failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: sync failed: ${message}`);
    return;
  }

  await Deno.mkdir(joinPath(idatenDir, "repos"), { recursive: true });

  for (const plugin of plugins) {
    if (plugin.dev.enable) {
      continue;
    }
    if (locked && lock && !lock.plugins[plugin.name]) {
      await notify(
        denops,
        "ErrorMsg",
        `idaten: lockfile missing entry for ${plugin.name}`,
      );
      return;
    }
    const installPath = repoDir(idatenDir, plugin.repo);
    const exists = await isDirectory(installPath);
    if (!exists) {
      const result = await gitClone(plugin.repo, installPath);
      if (result.code !== 0) {
        const message = formatGitError("clone failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `sync: ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    } else {
      const result = await gitFetch(installPath);
      if (result.code !== 0) {
        const message = formatGitError("fetch failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `sync: ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    }

    let rev = "";
    if (locked && lock) {
      rev = lock.plugins[plugin.name];
    } else if (plugin.rev.length > 0) {
      rev = plugin.rev;
    } else if (exists) {
      rev = "FETCH_HEAD";
    }

    if (rev.length > 0) {
      const result = await gitCheckout(installPath, rev);
      if (result.code !== 0) {
        const message = formatGitError("checkout failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `sync: ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    }
  }

  for (const plugin of plugins) {
    if (plugin.dev.enable) {
      continue;
    }
    if (plugin.hooks.post_update.length === 0) {
      continue;
    }
    try {
      await denops.cmd(plugin.hooks.post_update);
    } catch (err) {
      const message = formatError(err);
      await denops.call("idaten#Log", `sync: hook_post_update failed ${message}`);
      await notify(
        denops,
        "ErrorMsg",
        `idaten: hook_post_update failed: ${message}`,
      );
      return;
    }
  }

  try {
    await compileState({ configPath, idatenDir, context: createContext(denops) });
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `sync: compile failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: sync failed: ${message}`);
    return;
  }

  await denops.call("idaten#Log", "sync: done");
  await notify(denops, "MoreMsg", "idaten: sync finished.");
}

async function handleUpdate(denops: Denops, args: string[]): Promise<void> {
  const parsed = parseUpdateOptions(args);
  if (parsed.error) {
    await notify(denops, "WarningMsg", parsed.error);
    return;
  }
  for (const arg of parsed.unknown) {
    await notify(denops, "WarningMsg", `idaten: unsupported option: ${arg}`);
  }
  if (parsed.self && parsed.names.length > 0) {
    await notify(denops, "WarningMsg", "idaten: --self does not take plugin names.");
    return;
  }
  if (parsed.rev.length > 0 && parsed.names.length === 0) {
    if (!parsed.self) {
      await notify(denops, "WarningMsg", "idaten: --rev requires plugin names.");
      return;
    }
  }

  const idatenDir = await resolveIdatenDir(denops);
  if (parsed.self) {
    const rawLocalPath = await denops.eval("get(g:, 'idaten_repo_path', '')") as string;
    if (typeof rawLocalPath === "string" && rawLocalPath.trim().length > 0) {
      const localPath = await resolvePath(denops, rawLocalPath);
      if (await isDirectory(localPath)) {
        await notify(
          denops,
          "WarningMsg",
          `idaten: update skipped (local repo): ${localPath}`,
        );
        return;
      }
    }

    const rawRepoUrl = await denops.eval("get(g:, 'idaten_repo_url', '')") as string;
    const repoUrl = typeof rawRepoUrl === "string" && rawRepoUrl.trim().length > 0
      ? rawRepoUrl.trim()
      : "https://github.com/shun/idaten.vim.git";
    let repo = "";
    try {
      repo = normalizeRepoSpec(repoUrl);
    } catch (err) {
      const message = formatError(err);
      await denops.call("idaten#Log", `update: self failed ${message}`);
      await notify(denops, "ErrorMsg", `idaten: update failed: ${message}`);
      return;
    }
    await denops.call("idaten#Log", `update: self start repo=${repo}`);
    const installPath = repoDir(idatenDir, repo);
    const exists = await isDirectory(installPath);
    if (!exists) {
      const result = await gitClone(repo, installPath);
      if (result.code !== 0) {
        const message = formatGitError("clone failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `update: self ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    } else {
      const result = await gitFetch(installPath);
      if (result.code !== 0) {
        const message = formatGitError("fetch failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `update: self ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    }

    let rev = parsed.rev;
    if (rev.length === 0 && exists) {
      rev = "FETCH_HEAD";
    }
    if (rev.length > 0) {
      const result = await gitCheckout(installPath, rev);
      if (result.code !== 0) {
        const message = formatGitError("checkout failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `update: self ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    }

    await denops.call("idaten#Log", "update: self done");
    await notify(denops, "MoreMsg", "idaten: update self finished.");
    return;
  }

  const configPath = await resolveConfigPath(denops);
  if (!configPath) {
    await notify(
      denops,
      "WarningMsg",
      "idaten: g:idaten_config is empty. Set a config path.",
    );
    return;
  }
  await denops.call("idaten#Log", `update: start config=${configPath}`);

  let plugins: NormalizedPlugin[] = [];
  try {
    plugins = await loadPlugins(configPath, idatenDir, denops);
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `update: config failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: update failed: ${message}`);
    return;
  }

  let targets: NormalizedPlugin[] = [];
  if (parsed.names.length === 0) {
    targets = plugins;
  } else {
    const map = new Map(plugins.map((plugin) => [plugin.name, plugin]));
    const unique = [...new Set(parsed.names)];
    for (const name of unique) {
      const plugin = map.get(name);
      if (!plugin) {
        await notify(denops, "ErrorMsg", `idaten: update failed: ${name} not found.`);
        return;
      }
      targets.push(plugin);
    }
  }

  for (const plugin of targets) {
    if (plugin.dev.enable) {
      await notify(
        denops,
        "WarningMsg",
        `idaten: update skipped (dev override): ${plugin.name}`,
      );
      continue;
    }
    const installPath = repoDir(idatenDir, plugin.repo);
    const exists = await isDirectory(installPath);
    if (!exists) {
      const result = await gitClone(plugin.repo, installPath);
      if (result.code !== 0) {
        const message = formatGitError("clone failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `update: ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    } else {
      const result = await gitFetch(installPath);
      if (result.code !== 0) {
        const message = formatGitError("fetch failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `update: ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    }

    let rev = parsed.rev;
    if (rev.length === 0 && plugin.rev.length > 0) {
      rev = plugin.rev;
    }
    if (rev.length === 0 && exists) {
      rev = "FETCH_HEAD";
    }
    if (rev.length > 0) {
      const result = await gitCheckout(installPath, rev);
      if (result.code !== 0) {
        const message = formatGitError("checkout failed", result.stderr || result.stdout);
        await denops.call("idaten#Log", `update: ${message}`);
        await notify(denops, "ErrorMsg", `idaten: ${message}`);
        return;
      }
    }
  }

  await denops.call("idaten#Log", "update: done");
  await notify(denops, "MoreMsg", "idaten: update finished.");
}

async function handleStatus(denops: Denops, args: string[]): Promise<void> {
  if (args.length > 0) {
    await notify(denops, "WarningMsg", "idaten: status does not take arguments.");
  }
  const configPath = await resolveConfigPath(denops);
  if (!configPath) {
    await notify(
      denops,
      "WarningMsg",
      "idaten: g:idaten_config is empty. Set a config path.",
    );
    return;
  }
  const idatenDir = await resolveIdatenDir(denops);
  await denops.call("idaten#Log", `status: start config=${configPath}`);

  let plugins: NormalizedPlugin[] = [];
  try {
    plugins = await loadPlugins(configPath, idatenDir, denops);
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `status: config failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: status failed: ${message}`);
    return;
  }

  const desired = new Set<string>();
  const missing: string[] = [];
  const dirty: string[] = [];
  const devOverride: string[] = [];

  for (const plugin of plugins) {
    if (plugin.dev.enable) {
      devOverride.push(plugin.name);
      continue;
    }
    const path = repoDir(idatenDir, plugin.repo);
    desired.add(path);
    if (!(await isDirectory(path))) {
      missing.push(plugin.name);
      continue;
    }
    const status = await gitStatusPorcelain(path);
    if (status.code === 0 && status.stdout.length > 0) {
      dirty.push(plugin.name);
    }
  }

  const reposRoot = joinPath(idatenDir, "repos");
  const roots = await collectGitRoots(reposRoot);
  const extra = roots.filter((path) => !desired.has(path));

  const lock = await readLockfile(idatenDir);
  const lockMismatch: string[] = [];
  if (lock && lock.schema === 1) {
    for (const plugin of plugins) {
      if (plugin.dev.enable) {
        continue;
      }
      const expected = lock.plugins[plugin.name];
      if (!expected) {
        continue;
      }
      const path = repoDir(idatenDir, plugin.repo);
      if (!(await isDirectory(path))) {
        continue;
      }
      const head = await gitCurrentHead(path);
      if (head.code === 0 && head.stdout.length > 0 && head.stdout !== expected) {
        lockMismatch.push(plugin.name);
      }
    }
  }

  const lines = [
    `missing: ${missing.length ? missing.join(", ") : "-"}`,
    `extra: ${extra.length ? extra.join(", ") : "-"}`,
    `dirty: ${dirty.length ? dirty.join(", ") : "-"}`,
    `lock mismatch: ${lockMismatch.length ? lockMismatch.join(", ") : "-"}`,
    `dev override: ${devOverride.length ? devOverride.join(", ") : "-"}`,
  ];

  await denops.call("idaten#Log", "status: done");
  await notifyLines(denops, "MoreMsg", lines);
}

async function handleCheck(denops: Denops, args: string[]): Promise<void> {
  if (args.length > 0) {
    await notify(denops, "WarningMsg", "idaten: check does not take arguments.");
  }
  const idatenDir = await resolveIdatenDir(denops);
  const statePath = joinPath(idatenDir, "state.vim");
  await denops.call("idaten#Log", "check: start");

  const results: string[] = [];
  const denopsLoaded = await denops.eval("exists('g:loaded_denops')") as number;
  results.push(`denops: ${denopsLoaded ? "ok" : "missing"}`);
  results.push(`deno: ${Deno.version.deno}`);

  const gitCheck = await gitVersion();
  results.push(`git: ${gitCheck.code === 0 ? "ok" : "missing"}`);

  try {
    await Deno.mkdir(idatenDir, { recursive: true });
    results.push("idaten_dir: ok");
  } catch (err) {
    results.push(`idaten_dir: failed (${formatError(err)})`);
  }

  try {
    const text = await Deno.readTextFile(statePath);
    if (text.includes("let s:state")) {
      results.push("state.vim: ok");
    } else {
      results.push("state.vim: invalid");
    }
  } catch {
    results.push("state.vim: missing");
  }

  await denops.call("idaten#Log", "check: done");
  await notifyLines(denops, "MoreMsg", results);
}

async function handleClean(denops: Denops, args: string[]): Promise<void> {
  if (args.length > 0) {
    await notify(denops, "WarningMsg", "idaten: clean does not take arguments.");
  }
  const configPath = await resolveConfigPath(denops);
  if (!configPath) {
    await notify(
      denops,
      "WarningMsg",
      "idaten: g:idaten_config is empty. Set a config path.",
    );
    return;
  }
  const idatenDir = await resolveIdatenDir(denops);
  await denops.call("idaten#Log", `clean: start config=${configPath}`);

  let plugins: NormalizedPlugin[] = [];
  try {
    plugins = await loadPlugins(configPath, idatenDir, denops);
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `clean: config failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: clean failed: ${message}`);
    return;
  }

  const desired = new Set<string>();
  for (const plugin of plugins) {
    if (plugin.dev.enable) {
      continue;
    }
    desired.add(repoDir(idatenDir, plugin.repo));
  }
  const reposRoot = joinPath(idatenDir, "repos");
  const roots = await collectGitRoots(reposRoot);
  const extra = roots.filter((path) => !desired.has(path));
  if (extra.length === 0) {
    await notify(denops, "MoreMsg", "idaten: clean skipped (no extra repos).");
    return;
  }

  const message = `idaten: remove ${extra.length} repos?`;
  const prompt = extra.join("\n");
  const choice = await denops.call(
    "confirm",
    `${message}\n${prompt}`,
    "&Yes\n&No",
    2,
  ) as number;
  if (choice !== 1) {
    await notify(denops, "MoreMsg", "idaten: clean canceled.");
    return;
  }

  for (const path of extra) {
    await Deno.remove(path, { recursive: true });
  }

  await denops.call("idaten#Log", "clean: done");
  await notify(denops, "MoreMsg", "idaten: clean finished.");
}

async function handleLock(denops: Denops, args: string[]): Promise<void> {
  if (args.length > 0) {
    await notify(denops, "WarningMsg", "idaten: lock does not take arguments.");
  }
  const configPath = await resolveConfigPath(denops);
  if (!configPath) {
    await notify(
      denops,
      "WarningMsg",
      "idaten: g:idaten_config is empty. Set a config path.",
    );
    return;
  }
  const idatenDir = await resolveIdatenDir(denops);
  await denops.call("idaten#Log", `lock: start config=${configPath}`);

  let plugins: NormalizedPlugin[] = [];
  try {
    plugins = await loadPlugins(configPath, idatenDir, denops);
  } catch (err) {
    const message = formatError(err);
    await denops.call("idaten#Log", `lock: config failed ${message}`);
    await notify(denops, "ErrorMsg", `idaten: lock failed: ${message}`);
    return;
  }

  const entries: Record<string, string> = {};
  for (const plugin of plugins) {
    if (plugin.dev.enable) {
      continue;
    }
    const path = repoDir(idatenDir, plugin.repo);
    if (!(await isDirectory(path))) {
      await notify(
        denops,
        "ErrorMsg",
        `idaten: lock failed, missing repo: ${plugin.name}`,
      );
      return;
    }
    const head = await gitCurrentHead(path);
    if (head.code !== 0 || head.stdout.length === 0) {
      const message = formatGitError("rev-parse failed", head.stderr || head.stdout);
      await denops.call("idaten#Log", `lock: ${message}`);
      await notify(denops, "ErrorMsg", `idaten: lock failed: ${message}`);
      return;
    }
    entries[plugin.name] = head.stdout;
  }

  await writeLockfile(idatenDir, { schema: 1, plugins: entries });
  await denops.call("idaten#Log", `lock: wrote ${lockfilePath(idatenDir)}`);
  await notify(denops, "MoreMsg", "idaten: lock finished.");
}

export function main(denops: Denops): void {
  denops.dispatcher = {
    async command(...args: unknown[]): Promise<void> {
      const items = toStringArgs(args);
      const subcommand = items[0] ?? "";
      const rest = items.slice(1);

      if (subcommand === "compile") {
        await handleCompile(denops, rest);
        return;
      }
      if (subcommand === "sync") {
        await handleSync(denops, rest);
        return;
      }
      if (subcommand === "update") {
        await handleUpdate(denops, rest);
        return;
      }
      if (subcommand === "status") {
        await handleStatus(denops, rest);
        return;
      }
      if (subcommand === "check") {
        await handleCheck(denops, rest);
        return;
      }
      if (subcommand === "clean") {
        await handleClean(denops, rest);
        return;
      }
      if (subcommand === "lock") {
        await handleLock(denops, rest);
        return;
      }

      if (!subcommand) {
        await notify(denops, "WarningMsg", "idaten: subcommand is required.");
        return;
      }

      await notify(
        denops,
        "WarningMsg",
        `idaten: unsupported command: ${subcommand}`,
      );
    },
  };
}
