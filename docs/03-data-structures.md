# データ構造

## state.vim

### スキーマ

```vim
let s:state = {
  \ 'schema': 1,
  \ 'meta': {
  \   'idaten_version': '0.1.5',
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

- `schema`: スキーマバージョン（現在は 1）
- `meta`: 生成元メタデータ
- `plugins`: プラグイン定義（name をキー）
- `order`: 依存解決済みの name 配列
- `triggers`: 遅延トリガ表

### plugins エントリ

各プラグインの情報:

```vim
let s:state.plugins = {
  \ 'https://github.com/vim-denops/denops.vim.git': {
  \   'path': '/abs/path/to/repos/github.com/vim-denops/denops.vim',
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

- `path`: 管理ディレクトリ配下の clone 先の絶対パス
- `rtp`: プラグイン root からの相対パス（空文字は root）
- `depends`: 依存する name の配列
- `lazy`: 遅延トリガ
- `hooks`: hook_add/hook_source の Vim script 文字列
- `sources`: プラグインロード時に source する相対パス配列
- `boot_sources`: 起動時に必ず source する相対パス配列
- `ft_sources`: filetype ごとの列挙済みソース
- `dev`: dev override 情報

### triggers

遅延トリガの索引:

```vim
let s:state.triggers = {
  \ 'event': { 'InsertEnter': ['Shougo/ddc.vim'] },
  \ 'ft': { 'typescript': ['Shougo/ddc.vim'] },
  \ 'cmd': { 'DdcEnable': ['Shougo/ddc.vim'] },
  \ }
```

- `event` と `ft` は複数プラグインを配列で保持
- `cmd` も配列で保持し、該当コマンド実行時にすべてをロード

### スキーマ不一致時の扱い

`schema` が未知の場合は runtime を停止し、`:Idaten sync` または `:Idaten compile` の実行を案内。

## lockfile (lock.json)

### 形式

```json
{
  "schema": 1,
  "plugins": {
    "plugin-name": "commit-hash"
  }
}
```

- `schema`: lockfile のスキーマバージョン
- `plugins`: name をキーにして commit hash を保持

### ルール

- `dev.enable` が `true` のプラグインは lockfile から除外
- `sync --locked` では lockfile に存在しない name をエラーとする

### 配置

`{idaten_dir}/lock.json`

## import_map.json

### 形式

```json
{
  "imports": {
    "idaten": "jsr:@shun/idaten-vim@0.1.5"
  }
}
```

### 値

- **リリース時**: `"jsr:@shun/idaten-vim@<version>"`
- **開発時**: `IDATEN_DEV=1` または `g:idaten_repo_path` が有効な場合はローカルパス
- `<version>` は `src/version.ts` の `IDATEN_VERSION` を使用

### 生成タイミング

- 設定読み込み時に必要に応じて生成
- compile 実行時は必ず再生成

### 配置

`{idaten_dir}/import_map.json`
