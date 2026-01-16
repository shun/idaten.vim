# 実装制約

## class 構文禁止

ユーザ設定/コア/拡張のすべてで class 構文を禁止します。
関数と plain object のみ使用します。

**理由**:
- シンプルさの維持
- デバッグの容易さ
- 状態管理の明確化

**許可**: functions, plain objects, type/interface/namespace

---

## Vim script 最小化

Vim script は最小限に留め、重い処理は denops/TypeScript に委譲します。

**理由**:
- 保守性の向上
- テスト容易性
- 型安全性

**Vim script の役割**:
- Bootstrap（最小限の初期化）
- Runtime（state.vim の source と遅延ロード）

**TypeScript の役割**:
- State Builder（設定評価、依存解決、列挙）
- コマンド処理（sync/compile/update 等）

---

## Vim9 禁止

従来の Vim script で記述します。

**理由**:
- Vim/Neovim 両対応
- 安定性

---

## 実行時探索禁止

compile 時に source 対象を列挙し、runtime で glob/探索を行いません。

**理由**:
- 起動速度最優先
- ディスク I/O の最小化

**実装**:
- compile 時に `ftdetect/`, `plugin/`, `autoload/`, `ftplugin/` 等を列挙
- runtime は列挙済みファイルのみを source

---

## 取得元は git のみ

https/ssh/git の URL のみ許可します。
ローカルパスは dev override のショートハンドとして扱います。

**理由**:
- v1 のスコープ制限
- シンプルさの維持

**許可**:
- `https://github.com/user/repo.git`
- `ssh://git@github.com/user/repo.git`
- `git://git.example.com/repo.git`

**不許可**:
- `owner/repo` 形式
- `git@github.com:user/repo.git` 形式（scp-like）
- zip/tar アーカイブ

**ローカルパス**（dev override）:
- `file://...`
- `~/...`
- `./...`, `../...`
- Windows: `C:\...`

---

## 遅延トリガは event/FileType/command のみ

v1 では A/B/C のみ対応します。

**理由**:
- v1 のスコープ制限

**対応**:
- event: autocmd による遅延ロード
- FileType: FileType autocmd による遅延ロード
- command: スタブコマンドを定義してロード後に再実行

**非対応**（v2 以降）:
- キー押下による遅延ロード
- 関数呼び出しによる遅延ロード

---

## sync は compile 内包

`:Idaten sync` は必ず compile を実行します。

**理由**:
- 不整合防止
- ユーザの混乱を避ける

**実装**:
- sync の最後に必ず `compileState()` を実行
- 一部失敗時は compile を実行しない

---

## ドキュメント優先

ドキュメントに無いものは実装しません。

**理由**:
- スコープクリープ防止
- 設計の明確化
- レビューの容易さ

**プロセス**:
1. ドキュメントに機能を記載
2. レビュー
3. 実装
4. ドキュメントと実装の整合性確認
