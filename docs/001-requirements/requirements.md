# 要件定義書: idaten.vim

## 1. 概要

### 1.1 目的
idaten.vim は Vim/Neovim の起動を高速化するために、TypeScript(Deno) 設定を単一の Vim script(state.vim) にコンパイルし、通常起動ではそれを source するだけで動作するプラグインマネージャである。

### 1.2 主要コンセプト
- 設定は TypeScript のみで記述する。
- コンパイル成果物は単一の Vim script ファイル(state.vim)。
- 通常起動では Deno を起動しない。Deno を使うのは sync/compile と必要な遅延処理時のみ。
- 実行時のディスク I/O を最小化する(実行時の探索はしない)。
- 遅延読み込み v1 は event/FileType/command のみ。
- プラグイン取得元は git リポジトリのみ。dev override でローカル作業ツリーを読める。
- class 構文は全面禁止。

## 2. 命名と配布

### 2.1 リポジトリ
- GitHub リポジトリ: shun/idaten.vim

### 2.2 Ex コマンド
- :Idaten sync
- :Idaten compile
- :Idaten status
- :Idaten check
- :Idaten clean
- :Idaten lock(任意機能)

### 2.3 TypeScript モジュール名
- モジュール名(bare specifier): idaten

### 2.4 JSR パッケージ名
- JSR パッケージ: @shun/idaten-vim
- ユーザは import { ... } from "idaten" を維持し、import map で jsr:@shun/idaten-vim@<version> に解決する。

## 3. 対象環境

### 3.1 対象エディタ
- Vim と Neovim

### 3.2 対象 OS
- Linux, macOS, Windows

### 3.3 外部要件
- git が利用可能
- denops のための Deno が利用可能(denops 本体は bootstrap で自動取得)

## 4. スコープ

### 4.1 インスコープ(v1 必須)
- TypeScript(Deno + denops) 設定
- 単一 state.vim へのコンパイル
- 起動時は state.vim の source のみ
- 遅延読み込み: event / FileType / command
- git のみで取得(clone/fetch/checkout)
- sync が compile をデフォルト内包
- clean / status / check / lock(任意)
- dev override(ローカル作業ツリー)
- 起動時の denops 同期 clone

### 4.2 アウトスコープ(v1)
- zip/tar などのアーカイブ取得
- git 以外のプロトコル抽象化
- キー押下/関数呼び出しの遅延ロード
- リモート差分の常時監視
- 汎用外部ビルドシステム(npm/pip 等)

## 5. 基本制約(必須)

### 5.1 class 全面禁止
- class 構文はユーザ設定/コア/拡張のすべてで禁止。
- 許可: functions, plain objects, type/interface/namespace。

### 5.2 TypeScript のみ
- 設定は TypeScript API で記述する。
- Vim script DSL は提供しない(bootstrap 最小設定を除く)。

### 5.3 実行時探索の禁止
- runtime では glob/走査を行わず、compile で列挙する。

### 5.4 取得元は git のみ
- ローカルパスは dev override としてのみ扱う。

### 5.5 遅延トリガは A/B/C のみ
- event / FileType / command のみを v1 で扱う。

### 5.6 sync は compile 内包
- :Idaten sync は必ず compile を実行する。

### 5.7 Vim script 最小化
- Vim script は最小限に留め、可能な限り denops/TypeScript に処理を委譲する。

## 6. アーキテクチャ

### 6.1 Bootstrap(Vim script)
- state.vim を source 可能にする最小ローダ。
- denops 不在時に同期 clone を試行。
- 通常起動で Deno を起動しない。
- 管理ディレクトリは `g:idaten_dir` で上書き可能。

### 6.2 State Building(Deno/TypeScript)
- 設定を評価し依存/遅延トリガを正規化。
- 実行時探索を避けるため source 対象を列挙。
- 単一 state.vim を出力。

### 6.3 Runtime(Vim script)
- 起動時は state.vim の source のみ。
- 遅延ロードと hook 実行は Vim script を最小限にし、必要な処理は denops/TypeScript に委譲する。

## 7. 機能要件

### 7.1 Bootstrap: denops 自動 clone
- 次を満たす場合のみ同期 clone を実施する:
  - runtimepath に denops.vim が無い
  - idaten 管理ディレクトリにも存在しない
- clone URL は設定で上書き可能(デフォルト: vim-denops/denops.vim)。
- 管理ディレクトリは `g:idaten_dir` で上書き可能。
- 失敗時の挙動:
  - エディタ起動は継続し、idaten を無効化。
  - git 未導入/ネットワーク/URL などの原因と対処を明示。
  - 1 セッション 1 回のみ試行。

### 7.2 state.vim 不在時
- 自動 compile は行わない。
- :Idaten sync または :Idaten compile の実行を案内する。

### 7.3 TypeScript 設定
- 設定ファイルは TypeScript(パスは bootstrap で指定可能)。
- エントリポイント:
  - export async function configure(ctx): Promise<Plugin[]>
- API:
  - Low-level: Plugin を直接構成できる関数群。
  - High-level: ensure(repo 省略), lazy(A/B/C) を提供。
  - 型定義を提供(type/interface)。
- bootstrap で設定パスを `g:idaten_config` で上書きできる。

### 7.4 モジュール解決
- import from "idaten" を利用可能。
- import map で次を解決:
  - リリース時: jsr:@shun/idaten-vim@<version>
  - 開発時: ローカルパス
- 競合回避用の別キー(idaten_vim 等)を将来許容。

### 7.5 プラグイン定義モデル
- 必須フィールド:
  - name(ユニーク)
  - repo(git URL または owner/repo)
- 任意フィールド:
  - rev, rtp, depends
  - hooks: hook_add, hook_source, hook_post_update
  - lazy: on_event, on_ft, on_cmd
  - dev: enable, overridePath

### 7.6 遅延読み込み(A/B/C)
- event: autocmd による遅延ロード。
- FileType: FileType autocmd による遅延ロード。
- command: スタブコマンドを定義してロード後に再実行。

### 7.7 インストール配置とロード
- 管理ディレクトリ配下に clone。
- パスは再現性があり衝突しないこと。Windows に配慮。
- packadd に依存せず runtimepath を直接更新。

### 7.8 compile(State Builder)
- 入力: TS 設定、インストール実体、任意で lockfile。
- 出力: 単一 state.vim。内容:
  - プラグイン一覧(パス/rtp)
  - 依存解決順
  - 遅延トリガ表(event/ft/cmd)
  - source 対象ファイルの列挙
  - hook_add / hook_source 情報
  - スキーマ/生成元メタデータ
- スキーマ不一致や破損時は停止し sync を促す。

### 7.9 Runtime アルゴリズム
- 起動時に行うこと:
  - event/FileType の autocmd 定義
  - command スタブ定義
  - hook_add 実行
- トリガ発火時:
  1. loaded[name] を確認
  2. 未ロードなら:
     - dev override を優先して実体パス決定
     - 依存を先にロード
     - runtimepath を直接更新
     - 列挙済みファイルを source
     - hook_source 実行
     - 可能な限り denops/TypeScript に委譲する
  3. command の場合は本来のコマンドを再実行

### 7.10 Git sync
- :Idaten sync の手順:
  1. 未インストールを clone
  2. 既存を fetch/checkout
  3. hook_post_update 実行
  4. compile(必須)
- clone/fetch は並列実行(最大並列は設定可能)。
- 一部失敗時は全体失敗とし compile は実行しない。

### 7.11 Dev override
- dev.enable が true の場合:
  - overridePath をロード対象にする
  - sync は override を操作しない
  - clean は override を削除しない
  - status に override を明示
  - lock から除外

### 7.12 Lock(任意)
- :Idaten lock で lockfile を生成/更新。
- lockfile は repo または name から commit hash を保持。
- sync --locked(同等) で lock を強制。
- 通常 sync は lock を強制しない。

### 7.13 Clean / Status / Check
- clean:
  - Desired State に無い管理対象を削除
  - dry-run または確認フローを必須
  - 管理外/overridePath は削除しない
- status:
  - Missing / Extra / Dirty / Lock mismatch / Dev override を表示
  - デフォルトはローカル情報のみで高速
- check:
  - denops/Deno/git の可用性
  - 管理ディレクトリ権限
  - state.vim の整合性

### 7.14 Logging
- ログ出力は任意（無効がデフォルト）。
- `g:idaten_log_enabled` で有効/無効を制御する。
- 出力先は `g:idaten_log_path` で指定する。
- 既定の出力先は `/tmp/idaten` とする。

## 8. データ仕様

### 8.1 管理ディレクトリ
- プラグイン clone、state.vim、lockfile、import map(必要時)を保持。
- 既定は OS 標準のキャッシュパスに従う。
  - Linux: `$XDG_CACHE_HOME/idaten`（未設定時は `~/.cache/idaten`）
  - macOS: `~/Library/Caches/idaten`
  - Windows: `%LOCALAPPDATA%\\idaten`
- `g:idaten_dir` で管理ディレクトリを上書きできる。

### 8.2 state.vim
- v1 の単一成果物。
- スキーマバージョンと生成元メタデータを含む。

### 8.3 lockfile
- JSON/TOML などの機械可読で差分が読みやすい形式。
- dev override を除外できる表現。

## 9. 非機能要件

### 9.1 パフォーマンス(構造)
- 起動時は state.vim の 1 回 source のみ。
- 通常起動で Deno を起動しない。
- runtime で glob/探索を行わない。

### 9.2 パフォーマンス目標
- マネージャ由来オーバーヘッド 10ms 以下(構造要件優先)。

### 9.3 堅牢性
- state.vim の破損や不整合は安全に停止し sync を促す。
- denops clone 失敗時は idaten を無効化し起動は継続。
- sync 失敗時に不整合な state.vim を生成しない。

### 9.4 セキュリティ
- Deno/denops の必要権限を文書化し最小権限を推奨。
- denops clone URL の上書きを許可。

### 9.5 実装制約
- class 禁止。
- 関数と plain object を基本とする。
- グローバル状態は最小化。

## 10. 受け入れ基準

1. idaten 未有効化時は自動処理を行わない。
2. denops が runtimepath/管理ディレクトリに無い場合、起動時に 1 回だけ同期 clone し、そのセッションで利用可能になる。
3. denops clone 失敗時は起動を継続し idaten を無効化、原因と対処を明示する。
4. state.vim 不在時は自動 compile せず、:Idaten sync または :Idaten compile を案内する。
5. :Idaten sync 実行後に state.vim が生成/更新され、次回起動は単回 source で成立する。
6. 遅延トリガ(event/FileType/command)で必要なプラグインのみロードされる。
7. runtime で glob/探索を行わず、列挙済みファイルのみ source する。
8. dev override 有効時はローカル作業ツリーがロードされ、status に明示される。
9. clean は dry-run/確認フローを必須とし、管理外や overridePath を削除しない。
10. check が denops/Deno/git/権限/state.vim 整合性を検査し対処を提示する。
11. ユーザ設定/コア/拡張のいずれにも class が存在しない。
12. import map により "idaten" が jsr:@shun/idaten-vim に解決される。

## 11. 付録: 設定例

```ts
import { type Context, ensure, lazy } from "idaten";

export async function configure(ctx: Context) {
  return [
    ensure("vim-denops/denops.vim"),
    lazy("Shougo/ddc.vim", {
      on_event: ["InsertEnter"],
      hooks: { source: "ddc#enable()" },
    }),
    ensure("shun/my-plugin", {
      dev: {
        enable: Deno.env.get("DEVELOPMENT") === "1",
        overridePath: "/abs/path/to/local/worktree",
      },
    }),
  ];
}
```
