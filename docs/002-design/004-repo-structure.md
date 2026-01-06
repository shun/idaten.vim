# 設計: リポジトリ構成

## 目的

- Vim9 Script と TypeScript の責務を分離する。
- 通常起動は `state.vim` の `source` のみで成立させる。
- Deno は `sync/compile` 等の明示操作時のみ起動する。

## ディレクトリ構成（案）

```
/
  plugin/
    idaten.vim
  autoload/
    idaten.vim
  denops/
    idaten/
      main.ts
  src/
    api.ts
    builder.ts
    compile.ts
    git.ts
    import_map.ts
    lock.ts
    model.ts
    paths.ts
    runtime.ts
    state.ts
    types.ts
  mod.ts
```

## 役割

- `plugin/idaten.vim`
  - Vim9 Script の最小 bootstrap。
  - `state.vim` の存在確認と `source`、起動時ガードを担当。
  - denops が無い場合の同期 clone をここで試行する。
- `autoload/idaten.vim`
  - Vim9 Script の補助関数（遅延ロード処理や表示用の小関数など）。
- `denops/idaten/main.ts`
  - denops のエントリポイント。
  - `:Idaten` 各サブコマンドを登録し、TypeScript 側の処理を呼び出す。
- `src/`
  - Deno 側の実装（class 禁止、関数 + plain object）。
  - `model.ts`/`types.ts` に型とデータモデルを集約する。
  - `builder.ts`/`compile.ts` に state 生成ロジックを集約する。
  - `git.ts` で clone/fetch/checkout 等の git 操作を行う。
  - `paths.ts` で `idaten_dir` と各ファイルパスを解決する。
  - `lock.ts` と `import_map.ts` に入出力を分離する。
  - `runtime.ts` は state から runtime 用の Vim9 Script を生成する。
- `mod.ts`
  - ユーザ設定のための public API（`ensure`/`lazy`/型定義）。

## 注意

- すべての Vim Script は Vim9 Script で書く。
- `state.vim` は生成物のため、リポジトリには置かない。
