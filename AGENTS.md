# AGENTS

## プロジェクト概要
- idaten.vim は Vim/Neovim 向けのプラグインマネージャで、TypeScript(Deno) 設定を単一の Vim9 Script(state.vim) にコンパイルする。
- 通常起動は state.vim の source のみで成立し、Deno を起動しない。

## 絶対要件
- class 構文は禁止（ユーザ設定/コア/拡張すべて）。関数と plain object のみ。
- 設定は TypeScript のみ。Vim9 Script DSL は最小 bootstrap 以外提供しない。
- 取得元は git のみ。ローカルパスは dev override のみ許可。
- 遅延読み込み v1 は event/FileType/command のみ。
- :Idaten sync は compile を必ず内包。
- 実行時の glob/探索は禁止。compile で source 対象を列挙する。
- Vim Script を書く場合は必ず Vim9 Script の書式を使う。

## 命名と配布
- Repo: shun/idaten.vim
- Ex コマンド: :Idaten sync | compile | status | check | clean | lock(任意)
- TypeScript モジュール名: idaten
- JSR パッケージ: @shun/idaten-vim

## 起動時ガード
- denops が無い場合は起動時に 1 回だけ同期 git clone を試行する。
- denops の clone 失敗時はエディタ起動を継続し、idaten を無効化して明確な案内を出す。
- state.vim 不在時は自動 compile しない。:Idaten sync または :Idaten compile を案内する。
