export type Context = Record<string, unknown>;

export type Lazy = {
  on_event?: string[];
  on_ft?: string[];
  on_cmd?: string[];
};

export type Hooks = {
  hook_add?: string;
  hook_source?: string;
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
  lazy?: Lazy;
  dev?: Dev;
};
