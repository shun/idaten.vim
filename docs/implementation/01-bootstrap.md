# Bootstrap実装

## 責務

- denops 自動 clone（不在時のみ）
- `state.vim` の source
- 失敗時の安全な停止

## 処理フロー

1. 二重ロード防止（`g:loaded_idaten`）
2. `g:idaten_disabled` チェック（真なら何もしない）
3. 管理ディレクトリ解決（`g:idaten_dir` または既定パス）
4. 設定ファイルパス解決（`g:idaten_config`）
5. denops 存在確認（runtimepath と管理ディレクトリ）
6. 不在なら同期 clone（`g:idaten_denops_clone_tried` が未設定なら）
7. clone 失敗時は `g:idaten_disabled` を立て、原因と対処を案内して終了
8. `state.vim` 存在確認
9. 不在なら `:Idaten sync` / `:Idaten compile` を案内して終了
10. `state.vim` を source
11. `:Idaten` コマンドを定義

## denops 検出

runtimepath と管理ディレクトリの両方を対象に `denops.vim` の存在を確認します。

**重要**: この探索は denops 検出のみに限定し、プラグイン列挙には用いません。

## 同期 clone

`system('git clone --depth 1 ...')` で実行（同期）。

- `executable('git')` が偽の場合は失敗扱い
- 失敗時は `v:shell_error` を確認し、原因と対処を明示
- clone URL は https/ssh/git の URL のみを許可

denops のみ `--depth 1` で shallow clone します（起動時間短縮のため）。

## 失敗時の挙動

### denops clone 失敗

- `g:idaten_disabled = v:true` を設定
- エディタ起動は継続
- 原因と対処を案内:
  - git 未導入
  - ネットワーク問題
  - `g:idaten_denops_repo` の URL 問題

### state.vim 不在

- 自動 compile は行わない
- `:Idaten sync` または `:Idaten compile` の実行を案内

## 設定変数

詳細は [../reference/configuration-variables.md](../reference/configuration-variables.md) を参照。

主要な変数:
- `g:idaten_dir`: 管理ディレクトリ
- `g:idaten_config`: TypeScript 設定ファイルパス
- `g:idaten_denops_repo`: denops の clone 元 URL
- `g:idaten_log_enabled`: ログ有効化
- `g:idaten_log_path`: ログ出力先

## ファイル

- `plugin/idaten.vim`: エントリポイント
- `autoload/idaten.vim`: 補助関数
  - `idaten#ResolveDir()`: 管理ディレクトリ解決
  - `idaten#ResolveConfig()`: 設定ファイルパス解決
  - `idaten#EnsureDenops()`: denops 存在確認
  - `idaten#CloneDenops()`: denops 同期 clone
  - `idaten#Log()`: ログ出力
  - `idaten#RepoDir()`: リポジトリ配置パス計算
  - `idaten#EnsureRuntimePath()`: runtimepath 更新
  - `idaten#NotifyDenopsFailure()`: denops 失敗案内
  - `idaten#NotifyStateMissing()`: state.vim 不在案内
