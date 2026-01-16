# 設定API

## エントリポイント

TypeScript 設定ファイルは `export async function configure(ctx): Promise<Plugin[]>` をエントリポイントとします。

```typescript
import type { Context } from "idaten";

export async function configure(ctx: Context): Promise<Plugin[]> {
  return [
    // プラグイン定義
  ];
}
```

`ctx.denops` を利用して Vim/Neovim 側の値を取得できます。

## API関数

### ensure(repo, options?)

即時ロードプラグインを定義します。

```typescript
import { ensure } from "idaten";

ensure("https://github.com/vim-denops/denops.vim.git")
ensure("https://github.com/vim-denops/denops.vim.git", {
  rev: "main",
  rtp: "denops",
})
```

### lazy(repo, options)

遅延ロードプラグインを定義します。

```typescript
import { lazy } from "idaten";

lazy("https://github.com/Shougo/ddc.vim.git", {
  on_event: ["InsertEnter"],
  hookSource: "~/.config/nvim/rc/plugins/ddc.ts",
})
```

## Plugin型

```typescript
type Plugin = {
  name?: string;           // 省略時は repo から自動生成
  repo: string;            // git URL またはローカルパス
  rev?: string;            // git revision
  rtp?: string;            // runtimepath 相対パス
  depends?: string[];      // 依存プラグイン名
  hooks?: Hooks;           // hook_post_update
  hookAdd?: string;        // hook_add 用 TypeScript パス
  hookSource?: string;     // hook_source 用 TypeScript パス
  lazy?: Lazy;             // 遅延トリガ
  dev?: Dev;               // dev override
};
```

### フィールド詳細

#### name

プラグイン名。省略時は以下のルールで自動生成:
- ローカルパスの場合: `basename(-rev)` から生成（小文字化し、`[^a-z0-9._-]` は `_` に置換）
- リモートの場合: `repo` の文字列がそのまま `name` になる

衝突する場合は `name` を明示してください。

#### repo

プラグインの取得元。以下の形式を許可:

- **git URL**: `https://`, `ssh://`, `git://` で始まる URL
- **ローカルパス**: `file://`, `~/`, `./`, `../` で始まるパス、または Windows ドライブパス（`C:\...`）

ローカルパスは dev override のショートハンドとして扱われます。

#### rev

git revision（branch/tag/commit hash）。省略時は既存 clone を `FETCH_HEAD` に checkout。

#### rtp

プラグイン root からの相対パス。空文字は root を意味します。

#### depends

依存するプラグイン名の配列。依存は先にロードされます。

#### hooks

```typescript
type Hooks = {
  hook_post_update?: string;  // update 後に実行する Vim script
};
```

#### hookAdd / hookSource

hook 用 TypeScript ファイルのパス。絶対パスまたは `~` のみ対応（相対パス不可）。

hook 用 TypeScript は以下のいずれかを export:
- `hook_add` / `hook_source` の export const
- `hooks(ctx)` 関数

指定された hook が存在しない場合は compile エラー。

#### lazy

```typescript
type Lazy = {
  on_event?: string[];  // event トリガ
  on_ft?: string[];     // FileType トリガ
  on_cmd?: string[];    // command トリガ
};
```

#### dev

```typescript
type Dev = {
  enable?: boolean;       // dev override 有効化
  overridePath?: string;  // override するローカルパス
};
```

`repo` にローカルパスを指定した場合、自動的に `dev.enable = true` になります。

## hook 用 TypeScript

### パターン1: export const

```typescript
export const hook_add = "let g:my_plugin_auto = 1";
export const hook_source = "lua require('rc.my_plugin')";
```

### パターン2: hooks 関数

```typescript
import type { Context } from "idaten";

export async function hooks(ctx: Context) {
  const enabled = await ctx.denops.eval("get(g:, 'my_plugin_enabled', 0)");
  return {
    hook_add: enabled ? "let g:my_plugin_auto = 1" : "",
    hook_source: "call my_plugin#init()",
  };
}
```

`hooks(ctx)` は `{ hook_add?, hook_source? }` を返します。

## 設定例

```typescript
import { type Context, ensure, lazy } from "idaten";

export async function configure(ctx: Context) {
  return [
    // 即時ロード
    ensure("https://github.com/vim-denops/denops.vim.git"),
    
    // 遅延ロード（event）
    lazy("https://github.com/Shougo/ddc.vim.git", {
      on_event: ["InsertEnter"],
      hookSource: "~/.config/nvim/rc/plugins/ddc.ts",
    }),
    
    // dev override（ローカルパス）
    ensure("~/work/my-plugin", {
      rev: "main",
      hookAdd: "~/.config/nvim/rc/plugins/my-plugin.ts",
    }),
    
    // 依存関係
    ensure("https://github.com/Shougo/ddc-ui-native.git", {
      depends: ["https://github.com/Shougo/ddc.vim.git"],
    }),
  ];
}
```

## 設定ファイルのパス指定

設定ファイルのパスは以下の方法で指定:

1. `g:idaten_config` で指定（bootstrap で設定）
2. `:Idaten compile --config <path>` で実行時に上書き
3. `:Idaten sync --config <path>` で実行時に上書き

設定パスが空の場合、compile/sync は実行できません（案内を表示）。
