import type { Denops } from "jsr:@denops/core@^8.0.0";

export type Context = {
  denops: Denops;
};

export type HookSpec = {
  hook_add?: string;
  hook_source?: string;
};

export type Lazy = {
  on_event?: string[];
  on_ft?: string[];
  on_cmd?: string[];
};

export type Hooks = {
  hook_post_update?: string;
};

export type Dev = {
  enable?: boolean;
  overridePath?: string;
};

export type Plugin = {
  name?: string;
  repo: string;
  rev?: string;
  rtp?: string;
  depends?: string[];
  hooks?: Hooks;
  hookAdd?: string;
  hookSource?: string;
  lazy?: Lazy;
  dev?: Dev;
};
