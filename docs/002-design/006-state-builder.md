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

1. 設定ファイルを import し `configure(ctx)` を実行する。
2. 返却された `Plugin[]` を検証し、`name` の一意性を確認する。
3. `repo` を正規化（`owner/repo` → `https://github.com/owner/repo.git` 等）。
4. 依存を解決し、循環依存を検出した場合は失敗とする。
5. `dev.enable` が `true` の場合は `override_path` を優先する。
   - `override_path` が空の場合は失敗とする。
6. `rtp` を正規化（空なら root）。
7. source 対象ファイルを列挙し `sources` に格納する。
8. 遅延トリガ表（event/ft/cmd）を生成する。
9. `hook_add`/`hook_source` を収集する。
10. `state.vim` を生成する。

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
