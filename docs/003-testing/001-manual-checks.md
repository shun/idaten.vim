# 動作確認手順（手動）

## 前提

- `g:idaten_config` が有効な TypeScript 設定を指していること。
- `git` と `Deno` が利用可能であること。

## 手順

1. `:Idaten compile` を実行し、`{idaten_dir}/state.vim` が生成されること。
2. `:Idaten sync` を実行し、clone/checkout → compile が完了すること。
3. `:Idaten status` を実行し、Missing/Extra/Dirty/Lock mismatch/Dev override が表示されること。
4. `:Idaten check` を実行し、denops/Deno/git/権限/state が確認できること。
5. `:Idaten clean` を実行し、確認後に Extra のみ削除されること。
6. `:Idaten lock` を実行し、`{idaten_dir}/lock.json` が生成されること。
7. event/ft/cmd の lazy load が意図通りに動作すること。

## 確認の目安

- `state.vim` が更新され、起動時は `state.vim` の `source` のみで起動できる。
- `import_map.json` が生成/更新されている。
- `sync --locked` が lockfile で固定される。
