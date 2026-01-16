# アーキテクチャ

## 3層構造

idaten.vim は以下の3層で構成されます。

### 1. Bootstrap（Vim script）

**責務**: 最小限の初期化

- denops 不在時に同期 clone を試行（1回のみ）
- `state.vim` の存在確認と `source`
- 失敗時の安全な停止（idaten を無効化して起動継続）

**ファイル**: 
- `plugin/idaten.vim` - エントリポイント
- `autoload/idaten.vim` - 補助関数

**特徴**:
- 通常起動で Deno を起動しない
- 最小限の Vim script のみ

### 2. State Builder（TypeScript/Deno）

**責務**: `state.vim` の生成

- TypeScript 設定の評価
- プラグイン定義の正規化
- 依存解決（トポロジカルソート）
- source 対象ファイルの列挙
- hook の解決（TypeScript から Vim script 生成）
- 単一 `state.vim` の出力

**ファイル**:
- `src/*.ts` - 実装本体
- `denops/idaten/main.ts` - denops エントリポイント

**特徴**:
- class 構文禁止（関数 + plain object のみ）
- 実行時探索を避けるため compile 時に列挙

### 3. Runtime（Vim script）

**責務**: プラグインのロード

- 起動時の即時ロード
- 遅延トリガ（event/FileType/command）の処理
- hook 実行
- 可能な限り denops/TypeScript に委譲

**ファイル**:
- `state.vim` - 生成物（管理ディレクトリ配下）

**特徴**:
- 起動時は `state.vim` の source のみ
- runtime で glob/探索を行わない

## データフロー

```
[TypeScript設定]
    ↓ (import & evaluate)
[Plugin[]]
    ↓ (normalize & resolve)
[State]
    ↓ (render)
[state.vim] + [import_map.json] + [lock.json]
    ↓ (source at startup)
[Runtime: プラグインロード]
```

## 起動時ガード

### denops 自動 clone

次を満たす場合のみ同期 clone を実施:
- runtimepath に denops.vim が無い
- idaten 管理ディレクトリにも存在しない

失敗時の挙動:
- エディタ起動は継続し、idaten を無効化
- git 未導入/ネットワーク/URL などの原因と対処を明示
- 1 セッション 1 回のみ試行

### state.vim 不在時

- 自動 compile は行わない
- `:Idaten sync` または `:Idaten compile` の実行を案内

## ディレクトリ構造

詳細は [reference/file-layout.md](reference/file-layout.md) を参照。

管理ディレクトリ（既定パス）:
- Linux: `$XDG_CACHE_HOME/idaten`（未設定時は `~/.cache/idaten`）
- macOS: `~/Library/Caches/idaten`
- Windows: `%LOCALAPPDATA%\idaten`

`g:idaten_dir` で上書き可能。
