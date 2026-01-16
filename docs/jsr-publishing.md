# JSR公開ガイド - idaten.vim

## 概要

idaten.vimをJSR（JavaScript Registry）に公開するための構成と手順をまとめたドキュメント。

## JSR公開の目的

ユーザーが設定ファイル（`~/.config/nvim/idaten.ts`）で以下のように記述できるようにする：

```typescript
import { ensure, lazy, type Context } from "idaten";
```

import mapにより、`idaten`が`jsr:@shun/idaten-vim@<version>`に自動解決されます。

## 公開構成

### 1. `deno.json` - パッケージ設定

```json
{
  "name": "@shun/idaten-vim",
  "exports": "./mod.ts",
  "license": "MIT",
  "readme": "README.md",
  "tasks": {
    "publish": "deno run --allow-run --allow-read scripts/publish.ts",
    "publish:dry-run": "deno run --allow-run --allow-read scripts/publish.ts --dry-run --allow-dirty"
  }
}
```

**重要なポイント:**
- `name`: JSRパッケージ名（`@shun/idaten-vim`）
- `exports`: 公開APIのエントリーポイント（`./mod.ts`）
- `license`: MIT License
- `tasks`: 公開用のタスク定義

### 2. `mod.ts` - 公開APIエントリーポイント

```typescript
export { ensure, lazy } from "./src/api.ts";
export type { Context, Dev, HookSpec, Hooks, Lazy, Plugin } from "./src/types.ts";
```

**公開範囲の方針:**
- **拡張不要**: idaten.vimはプラグインマネージャとして完結し、拡張プラグインは想定しない
- **ユーザー設定用API**: `ensure`, `lazy`関数と基本型のみを公開
- **最小限の公開**: 内部実装（`builder.ts`, `config.ts`など）は公開しない

**公開している要素:**
- `ensure(repo, options)` - プラグインを即座に読み込む
- `lazy(repo, options)` - プラグインを遅延読み込みする
- `Context` - hookファイルで使用する型
- `Plugin`, `Lazy`, `Dev`, `HookSpec`, `Hooks` - 型補完用

### 3. `src/version.ts` - バージョン管理

```typescript
export const IDATEN_VERSION = "0.1.5";
```

**重要なポイント:**
- バージョンを一元管理
- セマンティックバージョニング（major.minor.patch）
- `scripts/publish.ts`から参照される

### 4. `scripts/publish.ts` - 公開スクリプト

```typescript
import { IDATEN_VERSION } from "../src/version.ts";

async function run(): Promise<number> {
  const args = [...Deno.args];
  if (args[0] === "--") {
    args.shift();
  }
  const command = new Deno.Command(Deno.execPath(), {
    args: ["publish", "--set-version", IDATEN_VERSION, ...args],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await command.spawn().status;
  return status.code;
}

const code = await run();
if (code !== 0) {
  Deno.exit(code);
}
```

**重要なポイント:**
- `--set-version`でバージョンを指定
- コマンドライン引数を透過的に渡す
- `--dry-run`や`--allow-dirty`などのオプションをサポート

### 5. `src/import_map.ts` - import map生成

```typescript
function resolveIdatenSpecifier(): string {
  let dev = false;
  try {
    dev = Deno.env.get("IDATEN_DEV") === "1";
  } catch {
    dev = false;
  }
  if (dev) {
    return new URL("../mod.ts", import.meta.url).href;
  }
  return `jsr:@shun/idaten-vim@${IDATEN_VERSION}`;
}
```

**重要なポイント:**
- 通常時: `jsr:@shun/idaten-vim@<version>`に解決
- 開発時: `IDATEN_DEV=1`または`g:idaten_repo_path`設定時はローカルパスに解決

## 公開ワークフロー

### 1. 開発中の検証

```bash
# Lintチェック
deno lint

# フォーマットチェック
deno fmt --check

# Dry-run（実際には公開しない）
deno task publish:dry-run
```

### 2. バージョン更新

`src/version.ts`を編集：

```typescript
export const IDATEN_VERSION = "0.2.0";
```

### 3. 本番公開

```bash
# JSRに公開
deno task publish
```

初回公開時はJSRでスコープとパッケージを作成する必要があります：
https://jsr.io/new

## ローカル開発時の設定

開発中にローカルのidaten.vimを参照する場合：

```vim
" vimrcで設定
let g:idaten_repo_path = '~/ghq/github.com/shun/idaten.vim'
```

これにより、import mapが以下のように生成されます：

```json
{
  "imports": {
    "idaten": "file:///Users/xxx/ghq/github.com/shun/idaten.vim/mod.ts"
  }
}
```

**効果:**
- JSRからではなく、ローカルのコードを参照
- 開発中の変更をすぐにテスト可能
- `:Idaten update --self`はスキップされる

**自動dev有効化:**
- `g:idaten_repo_path`が有効なディレクトリの場合、自動的に`IDATEN_DEV=1`が設定される
- 手動で`IDATEN_DEV=1`を設定することも可能

## JSR公開の制約事項

### 許可されるimport

- `jsr:@scope/package` - JSRパッケージ
- `npm:package-name` - npmパッケージ
- `node:fs` - Node.js組み込みモジュール
- `data:` - データURL
- `bun:` - Bunランタイム

### 許可されないimport

- `https://deno.land/x/...` - HTTPSスペシファイア
- `https://esm.sh/...` - CDN URL

### idaten.vimの準拠状況

✅ すべてのimportが制約に準拠：
- `jsr:@denops/core` - denops本体
- `jsr:@lambdalisue/import-map-importer` - import map処理
- `node:path`, `node:url` - Node.js組み込みモジュール

## 公開範囲の設計思想

### なぜ最小限の公開か

idaten.vimは**プラグインマネージャ**であり、以下の理由から最小限の公開範囲としています：

1. **拡張プラグインは不要**
   - 拡張エコシステムは想定しない
   - プラグインマネージャとして完結

2. **ユーザー設定用APIのみ**
   - ユーザーが設定ファイルで使う`ensure`, `lazy`と型のみ
   - 内部実装は公開しない

3. **シンプルさの維持**
   - 公開APIが少ないほど、破壊的変更のリスクが低い
   - メンテナンスが容易

## トラブルシューティング

### エラー: invalid-external-import

**原因**: `https://`スペシファイアを含むファイルをexportしている

**解決策**: `mod.ts`から該当ファイルのexportを削除

### エラー: no-unused-vars

**原因**: 未使用の変数やimportが存在

**解決策**:
- 未使用のimportを削除
- 未使用のパラメータに`_`プレフィックスを付ける

```typescript
// Before
function foo(unused: string) {}

// After
function foo(_unused: string) {}
```

## 参考リンク

- JSR公式ドキュメント: https://jsr.io/docs
- Deno公開ガイド: https://docs.deno.com/runtime/manual/basics/modules/publishing_modules/
- JSRパッケージ設定: https://jsr.io/docs/package-configuration
- idaten.vim設定変数: `docs/reference/configuration-variables.md`
