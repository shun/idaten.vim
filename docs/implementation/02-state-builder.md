# State Builder実装

## 責務

- TypeScript 設定の評価
- プラグイン定義の正規化
- 依存解決
- source 対象の列挙
- hook の解決
- `state.vim` の生成

## 処理フロー

1. import_map 生成（`ensureImportMap()`）
2. 設定ファイル import（`loadConfig()`）
3. `configure(ctx)` 実行
4. `Plugin[]` の正規化（`normalizePlugins()`）
   - repo の解釈（URL/ローカルパス）
   - name の自動生成
   - dev override の設定
   - hook パスの検証
5. 一意性確認（name の重複チェック）
6. 依存解決（トポロジカルソート）
7. source 列挙（`collectRecursive()`, `collectFiletypeSources()`）
8. hook 解決（`resolvePluginHooks()`）
9. `state.vim` 生成（`renderStateVim()`）

## repo の解釈

### ローカルパス判定

以下の場合はローカルパスとして扱う:
- `file://` で始まる
- `/`, `./`, `../` で始まる
- `~` で始まる
- Windows ドライブパス（`C:\...`）

### 正規化

- **ローカルパス**: `expand()` と `fnamemodify(:p)` で展開・絶対化
  - 相対パス（`./`, `../`）は compile 実行時の Vim のカレントディレクトリを基準に解決
  - 実装: `denops.call("expand", path)` → `denops.call("fnamemodify", expanded, ":p")`
  - Vim側の関数を使用することで、Vim/Neovimのカレントディレクトリを正確に反映
  - `dev.enable = true` に設定
  - `override_path` を設定
- **git URL**: `https://`, `ssh://`, `git://` のみ許可
  - それ以外はエラー

## name の自動生成

- **ローカルパス**: `basename(-rev)` から生成
  - 小文字化し、`[^a-z0-9._-]` を `_` に置換
- **リモート**: `repo` の文字列がそのまま `name` になる

## 依存解決

トポロジカルソートで依存順を決定:
- 循環依存を検出した場合は失敗
- 存在しない依存を検出した場合は失敗

## source 列挙ルール

compile 時に以下を列挙し、runtime で探索を行わない。

### 起動時（boot_sources）

- `ftdetect/**/*.vim`

### ロード時（sources）

- `autoload/**/*.vim`
- `plugin/**/*.vim`
- `after/plugin/**/*.vim`

### FileType 時（ft_sources）

- `ftplugin/<ft>.vim`, `after/ftplugin/<ft>.vim`
- `indent/<ft>.vim`, `after/indent/<ft>.vim`
- `syntax/<ft>.vim`, `after/syntax/<ft>.vim`

## hook 解決

`hookAdd`/`hookSource` で指定された TypeScript を import:

1. hook 用 TypeScript を import
2. 以下のいずれかを取得:
   - `hook_add`/`hook_source` の export
   - `hooks(ctx)` の返り値（`{ hook_add?, hook_source? }`）
3. 指定された hook が存在しない場合は compile エラー

hook は同じファイルを複数回 import しないようキャッシュします。

## 失敗時の扱い

いずれかのステップで失敗した場合、`state.vim` は更新しません。

- スキーマ不一致や破損時は `sync/compile` を促す
- 対象プラグインの実体ディレクトリが存在しない場合は失敗

## 制約

詳細は [../reference/constraints.md](../reference/constraints.md) を参照。

- class 構文禁止
- 関数と plain object のみ使用

## ファイル

- `src/builder.ts`: State Builder 本体
- `src/config.ts`: 設定読み込み・正規化
- `src/state.ts`: state.vim 生成・レンダリング
- `src/compile.ts`: compile 処理
- `src/import_map.ts`: import map 生成
- `src/repo.ts`: repo 正規化
- `src/paths.ts`: パス解決
