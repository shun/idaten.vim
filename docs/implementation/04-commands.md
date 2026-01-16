# コマンド実装

## :Idaten compile

TypeScript 設定を評価して `state.vim` を生成します。

### オプション

- `--config <path>` / `--config=<path>`: 設定パス上書き

### 処理

1. 設定パス解決（`--config` または `g:idaten_config`）
2. 設定パスが空の場合は案内して終了
3. import_map 生成
4. `compileState()` 実行
5. 失敗時は `state.vim` を更新せず、原因を表示

### 補完

- `--config`

---

## :Idaten sync

git 操作 + compile を実行します。

### オプション

- `--locked`: lockfile 強制
- `--config <path>`: 設定パス上書き

### 処理

1. 設定パス解決
2. lockfile 読み込み（`--locked` 時）
   - lockfile が無い場合はエラー
   - schema が 1 でない場合はエラー
3. 未インストールを clone
4. 既存を fetch
5. checkout
   - `--locked` 時: lockfile の commit hash
   - それ以外: `plugin.rev` または `FETCH_HEAD`
6. `hook_post_update` 実行
7. compile（必須）

一部失敗時は全体失敗とし、compile は実行しません。

### 補完

- `--locked`
- `--config`

---

## :Idaten update

git 操作のみを行います（compile なし）。

### オプション

- `--rev <rev>` / `--rev=<rev>`: revision 指定
- `--self`: idaten 本体を更新
- `[names...]`: 対象プラグイン名

### 処理

#### --self 時

1. `g:idaten_repo_path` が有効な場合はスキップ（ローカルリポジトリ）
2. `g:idaten_repo_url` から URL 取得（既定: `https://github.com/shun/idaten.vim.git`）
3. clone/fetch/checkout
4. 設定ファイルの有無に関わらず実行可能

#### それ以外

1. 設定パス解決
2. 対象プラグイン決定（names 指定があればそれのみ、無ければ全件）
3. dev override はスキップ
4. 各プラグインに対して clone/fetch/checkout
   - `--rev` 指定時: その revision
   - それ以外: `plugin.rev` または `FETCH_HEAD`

### エラー

- `--self` とプラグイン名の同時指定
- `--rev` 指定時にプラグイン名が無い（`--self` 以外）

### 補完

- `--rev`
- `--self`

---

## :Idaten status

Missing/Extra/Dirty/Lock mismatch/Dev override を表示します。

### 処理

1. 設定パス解決
2. プラグイン定義読み込み
3. 各状態を確認:
   - **Missing**: 定義されているが clone されていない
   - **Extra**: clone されているが定義に無い
   - **Dirty**: `git status --porcelain` が空でない
   - **Lock mismatch**: lockfile と現在の commit hash が不一致
   - **Dev override**: `dev.enable` が true

### 補完

なし

---

## :Idaten check

denops/Deno/git/管理ディレクトリ/state.vim の整合性を確認します。

### 処理

1. denops の存在確認（`g:loaded_denops`）
2. Deno のバージョン確認
3. git の存在確認（`git --version`）
4. 管理ディレクトリの書き込み権限確認
5. state.vim の存在と内容確認（`let s:state` を含むか）

### 補完

なし

---

## :Idaten clean

不要な clone を削除します（確認必須）。

### 処理

1. 設定パス解決
2. プラグイン定義読み込み
3. Desired State に無い clone を列挙
4. 確認ダイアログ表示（`confirm()`）
5. Yes の場合のみ削除

### 注意

- 管理外のディレクトリは削除しない
- `overridePath` は削除しない

### 補完

なし

---

## :Idaten lock

lockfile を生成/更新します。

### 処理

1. 設定パス解決
2. プラグイン定義読み込み
3. 各プラグインの現在の commit hash を取得（`git rev-parse HEAD`）
   - dev override は除外
   - clone されていない場合はエラー
4. lockfile 書き込み

### 補完

なし

---

## 共通事項

- Deno を起動するのは `:Idaten` 実行時のみ
- `state.vim` は失敗時に更新しない
- dev override は `sync/update/clean/lock` の対象外
- `:Idaten` はサブコマンド補完を提供（`compile/sync/update/status/check/clean/lock`）

## ファイル

- `denops/idaten/main.ts`: コマンド実装本体
