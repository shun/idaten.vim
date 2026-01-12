# 設計: State Builder（TypeScript/Deno）

## 目的

- TypeScript 設定を評価し、プラグイン定義を正規化する。
- runtime で探索しないために source 対象を列挙する。
- 単一の `state.vim` を生成する。

## 入力

- ユーザ設定（TypeScript）
- インストール済み実体（管理ディレクトリ）
- 任意: lockfile

## 出力

- `{idaten_dir}/state.vim`

## 主要手順

1. 設定ファイルを import し `configure(ctx)` を実行する（`ctx.denops` を利用可能）。
2. 返却された `Plugin[]` を検証し、`name` を確定した上で一意性を確認する。
3. `repo` を正規化する。
   - https/ssh/git の URL のみ許可する。
   - `file://`、`~`、相対パス（`./` または `../`）はローカルパスとみなし dev override のショートハンドとして扱う。
   - ローカルパスは `expand()` と `fnamemodify(:p)` で展開・絶対化する。
   - 相対パス（`./` または `../`）は compile 実行時の Vim のカレントディレクトリを基準に解決する。
4. `repo` がローカルパスの場合は `dev.enable = true` にし、`override_path` を設定する。
   - name 未指定（または name == repo）の場合は `basename(-rev)` から自動生成する（小文字化し、`[^a-z0-9._-]` は `_` に置換）。
   - ローカルではない場合に name を省略すると、repo の文字列が name になる。
5. 依存を解決し、循環依存を検出した場合は失敗とする。
6. `dev.enable` が `true` の場合は `override_path` を優先する。
   - `override_path` が空の場合は失敗とする。
7. `rtp` を正規化（空なら root）。
8. source 対象ファイルを列挙し `sources` に格納する。
9. 遅延トリガ表（event/ft/cmd）を生成する。
10. `hookAdd`/`hookSource` で指定された TypeScript を import し、`hook_add`/`hook_source` を生成する。
    - `hook_add`/`hook_source` の export、または `hooks(ctx)` の返り値を使用する。
    - `hooks(ctx)` は `{ hook_add?, hook_source? }` を返す。
11. `state.vim` を生成する。

## source 列挙

- 実行時の探索を避けるため、compile 時に列挙する。
- 列挙対象はプラグイン root（`path` または `override_path`）配下。
- ルールは以下に固定する。
  - 起動時に必ず source:
    - `ftdetect/**/*.vim`
  - プラグインロード時に source（遅延ロードで使用）:
    - `autoload/**/*.vim`
    - `plugin/**/*.vim`
    - `after/plugin/**/*.vim`
  - FileType トリガ時に source（該当 filetype のみ）:
    - `ftplugin/<ft>.vim`, `after/ftplugin/<ft>.vim`
    - `indent/<ft>.vim`, `after/indent/<ft>.vim`
    - `syntax/<ft>.vim`, `after/syntax/<ft>.vim`

## 失敗時の扱い

- いずれかのステップで失敗した場合、`state.vim` は更新しない。
- スキーマ不一致や破損時は `sync/compile` を促す。
- 対象プラグインの実体ディレクトリが存在しない場合は失敗とする。

## 補足

- class 構文は禁止。関数と plain object のみを使用する。
