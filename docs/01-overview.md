# 概要

## 目的

idaten.vim は Vim/Neovim の起動を高速化するために、TypeScript(Deno) 設定を単一の Vim script(`state.vim`) にコンパイルし、通常起動ではそれを `source` するだけで動作するプラグインマネージャです。

## 設計思想

### 起動速度最優先

- 通常起動では Deno を起動しない（`sync/compile` と必要な遅延処理時のみ使用）
- 起動時は `state.vim` の `source` のみで完結
- 実行時の探索を完全排除（compile 時に列挙）
- 実行時のディスク I/O を最小化

### TypeScript ファースト

- 設定は TypeScript のみで記述
- Vim script DSL は提供しない（bootstrap 最小設定を除く）
- 型安全な設定記述
- `ctx.denops` を利用して Vim/Neovim 側の値を取得可能

### シンプルな実装

- class 構文は全面禁止（関数と plain object のみ）
- Vim script は最小限に留め、重い処理は denops/TypeScript に委譲
- Vim9 を使わず、従来の Vim script で記述
- ドキュメント優先で実装（ドキュメントに無いものは実装しない）

## スコープ

### v1 で実現すること（インスコープ）

- TypeScript(Deno + denops) 設定
- 単一 state.vim へのコンパイル
- 起動時は state.vim の source のみ
- 遅延読み込み: event / FileType / command
- git URL のみで取得(clone/fetch/checkout)
- sync が compile をデフォルト内包
- update による最新化/指定rev checkout
- clean / status / check / lock(任意)
- dev override(ローカル作業ツリー)
- 起動時の denops 同期 clone

### v1 で実現しないこと（アウトスコープ）

- zip/tar などのアーカイブ取得
- git 以外のプロトコル抽象化
- キー押下/関数呼び出しの遅延ロード
- リモート差分の常時監視
- 汎用外部ビルドシステム(npm/pip 等)

## 対象環境

- **エディタ**: Vim と Neovim
- **OS**: Linux, macOS, Windows
- **外部要件**: git が利用可能、denops のための Deno が利用可能（denops 本体は bootstrap で自動取得）

## 命名と配布

- **リポジトリ**: shun/idaten.vim
- **Ex コマンド**: `:Idaten sync | compile | update | status | check | clean | lock`
- **TypeScript モジュール名**: `idaten`
- **JSR パッケージ**: `@shun/idaten-vim`
- **バージョン管理**: `src/version.ts` の `IDATEN_VERSION` を唯一のソースとする
