# ファイル配置

## 管理ディレクトリ

```
{idaten_dir}/
  state.vim          # コンパイル成果物
  lock.json          # lockfile
  import_map.json    # モジュール解決用
  repos/
    <host>/
      <path...>/     # git clone 配置
```

### 既定パス

- Linux: `$XDG_CACHE_HOME/idaten`（未設定時は `~/.cache/idaten`）
- macOS: `~/Library/Caches/idaten`
- Windows: `%LOCALAPPDATA%\idaten`

`g:idaten_dir` で上書き可能。

---

## リポジトリ配置規則

`repos/` 配下のディレクトリ名は repo の URL から決定します。

### 規則

1. URL をパース（host と path を抽出）
2. host は常に含める（ポート含む場合は `_` に置換）
3. path から先頭 `/` と末尾 `.git` を除去
4. 各セグメントを小文字化し、`[^a-z0-9._-]` を `_` に置換
5. セグメントが空になる場合は `_` とする

### 例

- `https://github.com/vim-denops/denops.vim.git`
  → `repos/github.com/vim-denops/denops.vim`

- `ssh://github.com/vim-denops/denops.vim.git`
  → `repos/github.com/vim-denops/denops.vim`

- `git://git.example.com:2222/foo/bar.git`
  → `repos/git.example.com_2222/foo/bar`

### 補足

- dev override は `repos/` に配置しない
- lockfile と import map の詳細スキーマは [../03-data-structures.md](../03-data-structures.md) を参照

---

## idaten.vim リポジトリ構造

```
idaten.vim/
  plugin/
    idaten.vim                # Bootstrap エントリポイント
  autoload/
    idaten.vim                # Bootstrap 補助関数
  denops/
    idaten/
      main.ts                 # denops エントリポイント
  src/
    api.ts                    # ユーザ向けAPI (ensure/lazy)
    builder.ts                # State Builder
    compile.ts                # compile処理
    config.ts                 # 設定読み込み・正規化
    git.ts                    # Git操作
    import_map.ts             # import map生成
    lock.ts                   # lockfile読み書き
    paths.ts                  # パス解決
    repo.ts                   # repo正規化
    state.ts                  # state.vim生成・レンダリング
    types.ts                  # 型定義
    version.ts                # バージョン定義
  docs/
    README.md                 # ドキュメントナビゲーション
    01-overview.md            # 概要
    02-architecture.md        # アーキテクチャ
    03-data-structures.md     # データ構造
    04-configuration-api.md   # 設定API
    implementation/           # 実装詳細
      01-bootstrap.md
      02-state-builder.md
      03-runtime.md
      04-commands.md
      05-git-operations.md
    reference/                # リファレンス
      configuration-variables.md
      constraints.md
      file-layout.md
    testing/                  # テスト
      manual-checks.md
  scripts/
    publish.ts                # JSR公開スクリプト
  mod.ts                      # JSR公開用エントリポイント
  deno.json                   # Deno設定
  AGENTS.md                   # AI向け指示（開発用）
  README.md                   # プロジェクトREADME
  .gitignore
```

### ディレクトリ別の責務

#### `plugin/`, `autoload/`

Vim script による Bootstrap。最小限の初期化のみ。

#### `denops/idaten/`

denops プラグインのエントリポイント。`:Idaten` コマンドを処理。

#### `src/`

TypeScript による実装本体。class 禁止、関数 + plain object のみ。

#### `docs/`

設計・実装ドキュメント。

#### `scripts/`

開発用スクリプト（JSR 公開等）。

#### `mod.ts`

JSR パッケージのエントリポイント。ユーザ設定から `import { ... } from "idaten"` で使用。
