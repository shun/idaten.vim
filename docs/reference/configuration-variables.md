# 設定変数リファレンス

## g:idaten_dir

管理ディレクトリのパス。

**既定値**:
- Linux: `$XDG_CACHE_HOME/idaten`（未設定時は `~/.cache/idaten`）
- macOS: `~/Library/Caches/idaten`
- Windows: `%LOCALAPPDATA%\idaten`

**用途**: プラグイン clone、state.vim、lockfile、import map を保持。

---

## g:idaten_config

TypeScript 設定ファイルのパス。

**既定値**: 空文字列

**用途**: `configure(ctx)` を export する TypeScript ファイルを指定。

**注意**: 空の場合、compile/sync は実行できません（案内を表示）。

---

## g:idaten_denops_repo

denops の clone 元 URL。

**既定値**: `https://github.com/vim-denops/denops.vim.git`

**用途**: bootstrap 時の denops 自動 clone に使用。

**制約**: https/ssh/git の URL のみ許可。

---

## g:idaten_repo_path

idaten 本体のローカルパス（開発用）。

**既定値**: 空文字列

**用途**: idaten 本体をローカルから読み込む。設定時は `IDATEN_DEV=1` 相当となり、import map がローカルパスに解決されます。

**効果**:
- import map が `file://...` に解決される
- `--self` 更新時はスキップされる

**自動dev有効化の仕組み**:
- コマンド実行時（compile/sync/update等）に、`g:idaten_repo_path`が有効なディレクトリを指している場合、自動的に`IDATEN_DEV=1`環境変数が設定されます
- これにより、import mapが`jsr:@shun/idaten-vim`ではなくローカルパスに解決されます
- 既に`IDATEN_DEV=1`が設定されている場合は、自動設定をスキップします

**使用例**:
```vim
let g:idaten_repo_path = '~/ghq/github.com/shun/idaten.vim'
```

---

## g:idaten_repo_url

idaten 本体の clone 元 URL。

**既定値**: `https://github.com/shun/idaten.vim.git`

**用途**: `:Idaten update --self` で idaten 本体を更新する際の URL。

**使用例**（fork を使う場合）:
```vim
let g:idaten_repo_url = 'https://github.com/yourname/idaten.vim.git'
```

---

## g:idaten_log_enabled

ログ出力の有効/無効。

**既定値**: `v:false`

**用途**: デバッグやトラブルシューティング時にログを有効化。

---

## g:idaten_log_path

ログ出力先。

**既定値**: `/tmp/idaten`

**用途**: ログファイルのパスまたはディレクトリを指定。

**解釈**:
- ディレクトリ指定時: `<path>/idaten.log` に出力
- ファイル指定時: そのファイルに追記

**形式**: 1行1レコード、先頭に ISO 風のタイムスタンプ。

**例**:
```
2024-01-01T00:00:00+0900 bootstrap: start
2024-01-01T00:00:00+0900 bootstrap: denops missing
```

---

## 内部フラグ（ユーザ設定不可）

### g:idaten_disabled

denops clone 失敗時に設定されます。以後の idaten 処理を停止します。

**設定タイミング**: bootstrap で denops clone が失敗した時。

**効果**: `:Idaten` コマンドは無効化メッセージを表示して終了。

---

### g:idaten_denops_clone_tried

1セッション1回の denops clone 試行ガード。

**設定タイミング**: bootstrap で denops clone を試行した時。

**効果**: 同一セッション内で2回目以降の clone 試行をスキップ。

---

### g:loaded_idaten

二重ロード防止フラグ。

**設定タイミング**: `plugin/idaten.vim` の最初。

**効果**: 2回目以降の `plugin/idaten.vim` 読み込みをスキップ。
