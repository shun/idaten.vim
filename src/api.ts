import { type Lazy, type Plugin } from "./types.ts";

type EnsureOptions = Omit<Plugin, "repo">;

type LazyOptions = Omit<Plugin, "repo" | "lazy"> &
  Pick<Lazy, "on_event" | "on_ft" | "on_cmd">;

function normalizeLazy(options?: Lazy): Lazy {
  return {
    on_event: options?.on_event ? [...options.on_event] : [],
    on_ft: options?.on_ft ? [...options.on_ft] : [],
    on_cmd: options?.on_cmd ? [...options.on_cmd] : [],
  };
}

export function ensure(repo: string, options: EnsureOptions = {}): Plugin {
  return {
    ...options,
    name: options.name ?? repo,
    repo,
  };
}

export function lazy(repo: string, options: LazyOptions = {}): Plugin {
  const { on_event, on_ft, on_cmd, ...rest } = options;
  return {
    ...rest,
    name: rest.name ?? repo,
    repo,
    lazy: normalizeLazy({ on_event, on_ft, on_cmd }),
  };
}
