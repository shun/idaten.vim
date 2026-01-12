# idaten.vim

Vim/Neovim の起動を高速化するために、TypeScript(Deno) 設定を単一の Vim script(`state.vim`) にコンパイルし、通常起動ではそれを `source` するだけで動作するプラグインマネージャです。

## 主要コンセプト

- 設定は TypeScript のみで記述します。
- コンパイル成果物は単一の `state.vim` です。
- 通常起動では Deno を起動しません（`sync/compile` と必要な遅延処理時のみ使用）。
- 実行時の探索は行わず、`compile` で列挙したファイルのみを `source` します。
- 遅延読み込み v1 は event / FileType / command のみ対応します。
- 取得元は git URL のみ（https/ssh/git）。ローカルパスは dev override のショートハンドとして扱います。
- class 構文は全面禁止です。
- Vim script は Vim9 を使わず、従来の Vim script で書きます。
- Vim script は最小限に留め、重い処理は denops/TypeScript に寄せます。

## 対象環境

- Vim / Neovim
- Linux / macOS / Windows
- 依存: git, Deno（denops は bootstrap で自動取得）

## 管理ディレクトリ

デフォルトの管理ディレクトリは OS 標準のキャッシュパスに従います。

- Linux: `$XDG_CACHE_HOME/idaten`（未設定時は `~/.cache/idaten`）
- macOS: `~/Library/Caches/idaten`
- Windows: `%LOCALAPPDATA%\\idaten`

`g:idaten_dir` を設定すると管理ディレクトリを上書きできます。

## 設定ファイル

TypeScript 設定ファイルのパスは `g:idaten_config` で指定します。  
`:Idaten sync`/`:Idaten compile` は `--config <path>`（または `--config=<path>`）でこの実行のみ上書きできます。

## ログ

- `g:idaten_log_enabled` でログ出力を有効化します（デフォルト無効）。
- `g:idaten_log_path` で出力先を指定します。
- 既定の出力先は `/tmp/idaten` です。
- `g:idaten_log_path` がディレクトリの場合は `<path>/idaten.log` に出力します。

## Ex コマンド

- `:Idaten sync`
- `:Idaten compile`
- `:Idaten update`
- `:Idaten status`
- `:Idaten check`
- `:Idaten clean`
- `:Idaten lock`（任意）

※ `:Idaten sync` は必ず compile を内包します。  
※ `:Idaten update` は compile を実行しないため、必要に応じて `:Idaten sync` を実行してください。  
※ `:Idaten update --self` は idaten 本体を更新します（`g:idaten_repo_path` が有効な場合はスキップ）。

## TypeScript 設定

エントリポイントは `export async function configure(ctx): Promise<Plugin[]>` です。  
API と型定義を提供し、low-level / high-level（`ensure`, `lazy`）を利用できます。

```ts
import { type Context, ensure, lazy } from "idaten";

export async function configure(ctx: Context) {
  return [
    ensure("https://github.com/vim-denops/denops.vim.git"),
    lazy("https://github.com/Shougo/ddc.vim.git", {
      on_event: ["InsertEnter"],
      hookSource: "~/.config/nvim/rc/plugins/ddc.ts",
    }),
    ensure("~/work/my-plugin", {
      rev: "main",
      hookAdd: "~/.config/nvim/rc/plugins/my-plugin.ts",
      hookSource: "~/.config/nvim/rc/plugins/my-plugin.ts",
    }),
  ];
}
```

`repo` は https/ssh/git の URL のみ対応します（owner/repo や scp-like は不可）。  
`repo` に `file://`、`~`、相対パス（`./` または `../`）を指定した場合は dev override として扱います。  
相対パスは compile 実行時の Vim のカレントディレクトリ基準で展開されます。  
`name` 未指定の場合は `basename(-rev)` から自動生成されます（衝突する場合は `name` を明示してください）。
リモートの `repo` で `name` を省略した場合は `repo` の文字列がそのまま `name` になります。

`hookAdd`/`hookSource` で指定した TypeScript は compile 時に import されます。  
`export const hook_add`/`hook_source`、または `export async function hooks(ctx)` を定義し、
Vim script 文字列を返します（`ctx.denops` が利用可能）。
パスは絶対パスまたは `~` のみ対応します。

```ts
// ~/.config/nvim/rc/plugins/my-plugin.ts
export const hook_add = "let g:my_plugin_auto = 1";
export const hook_source = "lua require('rc.my_plugin')";
```

```ts
// ~/.config/nvim/rc/plugins/my-plugin.ts
import type { Context } from "idaten";

export async function hooks(ctx: Context) {
  const enabled = await ctx.denops.eval("get(g:, 'my_plugin_enabled', 0)");
  return {
    hook_add: enabled ? "let g:my_plugin_auto = 1" : "",
  };
}
```

## 実行時ガード

- denops が runtimepath/管理ディレクトリに無い場合、起動時に 1 回だけ同期 clone を試行します。
- denops clone 失敗時は起動を継続し、idaten を無効化して原因と対処を案内します。
- `state.vim` 不在時は自動 compile せず、`:Idaten sync` または `:Idaten compile` の実行を案内します。

## モジュール名と配布

- TypeScript モジュール名: `idaten`
- JSR パッケージ: `@shun/idaten-vim`
- import map で `idaten` を `jsr:@shun/idaten-vim@<version>` に解決します（`g:idaten_repo_path` が有効な場合はローカルパス）。
- import map は設定読み込みの前に常に再生成されます。

## リリース

- バージョンは `src/version.ts` の `IDATEN_VERSION` を唯一のソースとします。
- 公開は `deno task publish` を使用します（`deno publish --set-version` を内包）。
- dry-run は `deno task publish:dry-run` を使います。
