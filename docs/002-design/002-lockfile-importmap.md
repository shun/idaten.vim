# 設計: lockfile と import map

## lockfile (`lock.json`)

### 目的

- `sync --locked`（同等）で使用する固定コミットを保持する。
- 変更差分が読みやすい JSON 形式とする。
- dev override は lock に含めない。

### 配置

`{idaten_dir}/lock.json`

### 形式

```json
{
  "schema": 1,
  "plugins": {
    "<name>": "<commit>"
  }
}
```

- `schema`: lockfile のスキーマバージョン。
- `plugins`: `name` をキーにして commit hash を保持する。
- commit は `git rev-parse` が返すハッシュ（フル推奨）。

### ルール

- `dev.enable` が `true` のプラグインは lockfile から除外する。
- `sync --locked` では lockfile に存在しない `name` をエラーとする。

## import map (`import_map.json`)

### 目的

- `import { ... } from "idaten"` を解決する。

### 生成タイミング

- 設定読み込みの前に常に再生成する。
- 対象コマンド: `:Idaten compile`/`:Idaten sync`/`:Idaten update`/`:Idaten status`/`:Idaten clean`/`:Idaten lock`
- `:Idaten sync` は compile を内包するため、実行後は必ず最新になる。

### 配置

`{idaten_dir}/import_map.json`

### 形式

```json
{
  "imports": {
    "idaten": "<specifier>"
  }
}
```

### 値

- リリース時: `"jsr:@shun/idaten-vim@<version>"`
- 開発時: `IDATEN_DEV=1` または `g:idaten_repo_path` が有効な場合はローカルパス
- `<version>` は `src/version.ts` の `IDATEN_VERSION` を使用する（`deno.json` に `version` は置かない）。

※ 競合回避用の別キー（例: `idaten_vim`）は v1 では扱わない。
