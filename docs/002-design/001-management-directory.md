# 設計: 管理ディレクトリとファイル配置

## 目的

- 管理ディレクトリ配下の配置を固定し、runtime の探索を不要にする。
- パスが再現性を持ち、衝突しないこと（Windows で扱えること）を担保する。

## 管理ディレクトリ

管理ディレクトリは `g:idaten_dir` で上書き可能。未設定の場合は OS 標準のキャッシュパスを使用する。

- Linux: `$XDG_CACHE_HOME/idaten`（未設定時は `~/.cache/idaten`）
- macOS: `~/Library/Caches/idaten`
- Windows: `%LOCALAPPDATA%\\idaten`

## 配置ルール

```
{idaten_dir}/
  state.vim
  lock.json
  import_map.json
  repos/
    <owner>/
      <repo>/
```

- `state.vim` は compile の単一成果物。
- `lock.json` は lockfile（JSON）。
- `import_map.json` は `idaten` の解決用 import map（JSON）。
- `repos/` 配下に git clone を配置する。

## リポジトリ配置規則

`repos/` 配下のディレクトリ名は `name`（必須・ユニーク）から決定する。

- `owner/repo` 形式、または GitHub URL の場合は `repos/<owner>/<repo>` とする。
- `https://` などの URL で GitHub 以外の host の場合は `repos/<host>/<path...>` とする。
- `path` は URL のパスから先頭の `/` と末尾の `.git` を取り除く。
- 各セグメントは小文字化し、`[a-z0-9._-]` 以外を `_` に置換する。
- セグメントが空になる場合は `_` とする。
- host が `github.com`（または `www.github.com`）の場合は `<host>` を省略する。

例:

- `name = "vim-denops/denops.vim"` → `repos/vim-denops/denops.vim`
- `name = "https://github.com/vim-denops/denops.vim.git"` → `repos/vim-denops/denops.vim`
- `name = "https://git.example.com/foo/bar.git"` → `repos/git.example.com/foo/bar`

## 補足

- lockfile と import map の詳細スキーマは別途設計する。
