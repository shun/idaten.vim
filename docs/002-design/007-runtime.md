# 設計: Runtime（Vim script）

## 目的

- 起動時は `state.vim` の `source` のみで成立させる。
- 遅延トリガで必要なプラグインのみロードする。
- runtime で探索せず、`state.vim` に列挙された情報のみを使う。
- Vim script は最小限に留め、重い処理は denops/TypeScript に委譲する。

## 入力

- `{idaten_dir}/state.vim`

## 出力

- runtime でのロード・フック実行（副作用のみ）

## 主要処理

### 起動時

- `s:state.plugins` を参照し、`hook_add` を依存解決順に実行する。
- `s:state.triggers.event` と `s:state.triggers.ft` に対して autocmd を定義する。
- `s:state.triggers.cmd` に対して stub command を定義する。

### トリガ発火時

1. `loaded[name]` を確認。
2. 未ロードなら denops にロードを委譲する。
   - `dev.enable` が `true` の場合は `override_path` を使用する。
   - 依存を先にロードする。
   - `runtimepath` を直接更新する。
   - `sources` を `source` する。
   - `hook_source` を実行する。
3. command の場合は本来のコマンドを再実行する。

## 命名と状態

- `loaded` は `name` をキーにした辞書で管理する。
- `s:state` は `state.vim` から読み込まれる script-local 変数。

## stub command の再実行

- stub コマンドが呼ばれたらロード後に `execute` で再実行する。
- 互換性重視の最小構成で以下を保持して再構築する。
  - `mods`（`silent`/`keepjumps` 等）
  - `range`（`line1,line2`）
  - `count`
  - `bang`（`!`）
  - `register`
  - `q-args`（生文字列）
- `range` が指定されている場合は `count` より優先する。
- `-nargs=* -range -count -bang -register -bar` で受けて passthrough する。

## エラー処理

- 依存解決が失敗した場合は対象プラグインをロードせずに停止する。
- `s:state.schema` が未知の場合は runtime を停止し、`sync/compile` を案内する。
