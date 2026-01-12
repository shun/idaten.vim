# 設計: コマンド（sync/compile/status/check/clean/lock）

## 目的

- `:Idaten` サブコマンドの責務と振る舞いを定義する。
- 要件にある失敗時の扱いと制約を守る。

## 共通事項

- Deno を起動するのは `:Idaten` 実行時のみ。
- `state.vim` は失敗時に更新しない。
- dev override は `sync/clean/lock` の対象外。
- `:Idaten` はサブコマンド補完を提供する（`compile/sync/status/check/clean/lock`）。

## :Idaten compile

- TypeScript 設定を評価し `state.vim` を生成する。
- 設定ファイルのパスは bootstrap で決定されたものを使用する。
- `--config <path>`（または `--config=<path>`）指定時はそのパスを優先する。
- 設定パスが空の場合は compile を行わず案内する。
- 失敗時は `state.vim` を更新せず、原因を表示する。
- 必要に応じて `import_map.json` を生成/更新する。

## :Idaten sync

- git clone/fetch/checkout を行い、最後に `compile` を必ず実行する。
- 設定パスは `compile` と同様に解決する（`--config` で上書き可能）。
- 手順は以下に固定する。
  1. 未インストールを clone
  2. 既存を fetch/checkout
  3. hook_post_update 実行
  4. compile（必須）
- clone/fetch は並列実行し、最大並列は設定可能とする（設定方法は別途）。
- 一部失敗時は全体失敗とし、compile は実行しない。

### sync --locked

- lockfile を強制する（lockfile が無い場合はエラー）。
- lockfile に存在しない `name` はエラーとする。
- `:Idaten sync` の補完で `--locked` を提示する。

## :Idaten status

- Missing / Extra / Dirty / Lock mismatch / Dev override を表示する。
- デフォルトはローカル情報のみで高速に動作する。

## :Idaten check

- denops/Deno/git の可用性を検査する。
- 管理ディレクトリの権限を検査する。
- `state.vim` の整合性を検査する。

## :Idaten clean

- Desired State に無い管理対象を削除する。
- dry-run または確認フローを必須とする。
- 管理外/overridePath は削除しない。

## :Idaten lock

- `lock.json` を生成/更新する。
- `name` をキーに commit hash を保存する。
- dev override は lock から除外する。
