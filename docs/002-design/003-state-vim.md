# 設計: state.vim スキーマと生成内容

## 目的

- 通常起動は `state.vim` の `source` のみで成立させる。
- runtime で探索せず、compile 時に列挙した情報だけを使う。
- スキーマ不一致や破損時は安全に停止し、`sync/compile` を促す。

## 配置

`{idaten_dir}/state.vim`

## 生成内容（概要）

`state.vim` は以下を含む。

- スキーマと生成元メタデータ
- プラグイン定義（パス/rtp/依存/遅延条件/フック/ソース列挙）
- 依存解決順
- 遅延トリガ表（event/ft/cmd）
- runtime 用の Vim script 関数（ロード処理とトリガ処理）

## スキーマ

`state.vim` 内部で script-local の辞書 `s:state` を定義する。

```vim
let s:state = {
      \ 'schema': 1,
      \ 'meta': {
      \   'idaten_version': '0.0.0',
      \   'config_path': '/abs/path/to/config.ts',
      \   'generated_at': '2024-01-01T00:00:00Z',
      \ },
      \ 'plugins': {},
      \ 'order': [],
      \ 'triggers': {
      \   'event': {},
      \   'ft': {},
      \   'cmd': {},
      \ },
      \ }
```

## プラグイン定義

`s:state.plugins` は `name` をキーとする辞書。

```vim
let s:state.plugins = {
      \ 'vim-denops/denops.vim': {
      \   'path': '/abs/path/to/repos/vim-denops/denops.vim',
      \   'rtp': '',
      \   'depends': [],
      \   'lazy': {
      \     'on_event': ['InsertEnter'],
      \     'on_ft': [],
      \     'on_cmd': ['DdcEnable'],
      \   },
      \   'hooks': {
      \     'add': 'ddc#custom#patch_global(...)',
      \     'source': 'ddc#enable()',
      \   },
      \   'sources': [
      \     'plugin/ddc.vim',
      \     'autoload/ddc.vim',
      \   ],
      \   'boot_sources': [
      \     'ftdetect/ddc.vim',
      \   ],
      \   'ft_sources': {
      \     'ftplugin': {},
      \     'indent': {},
      \     'syntax': {},
      \   },
      \   'dev': {
      \     'enable': v:false,
      \     'override_path': '',
      \   },
      \ },
      \ }
```

- `path` は管理ディレクトリ配下の clone 先の絶対パス。
- `rtp` はプラグイン root からの相対パス（空文字は root）。
- `depends` は依存する `name` の配列。
- `sources` はプラグインロード時に source する相対パス配列（compile 時に列挙）。
- `boot_sources` は起動時に必ず source する相対パス配列（`ftdetect`）。
- `ft_sources` は filetype ごとの列挙済みソース。
- `hooks.add` と `hooks.source` は Vim script 文字列。
- `dev.enable` が `true` の場合、runtime は `override_path` を優先する。

## 依存解決順

`s:state.order` に依存解決済みの `name` を配列で保持する。  
起動時の `hook_add` 実行順序の基準にする。

## 遅延トリガ表

`s:state.triggers` は以下の辞書構造とする。

```vim
let s:state.triggers = {
      \ 'event': { 'InsertEnter': ['Shougo/ddc.vim'] },
      \ 'ft': { 'typescript': ['Shougo/ddc.vim'] },
      \ 'cmd': { 'DdcEnable': ['Shougo/ddc.vim'] },
      \ }
```

- `event` と `ft` は複数プラグインを配列で保持する。
- `cmd` も配列で保持し、該当コマンド実行時にすべてをロードする。

## スキーマ不一致時の扱い

`schema` が未知の場合は runtime を停止し、`:Idaten sync` または
`:Idaten compile` の実行を案内する。
