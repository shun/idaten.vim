# idaten.vim ドキュメント

## 読む順序

### 要件を知りたい
- [要件定義](00-requirements.md) - 全要件を1つにまとめたドキュメント

### 概要を知りたい
1. [概要](01-overview.md) - プロジェクトの目的と設計思想
2. [アーキテクチャ](02-architecture.md) - 全体構造の理解
3. [データ構造](03-data-structures.md) - state.vim等の仕様
4. [設定API](04-configuration-api.md) - ユーザ向けAPI

## 実装者向け

- [implementation/](implementation/) - 各コンポーネントの実装詳細
  - [01-bootstrap.md](implementation/01-bootstrap.md) - Bootstrap実装
  - [02-state-builder.md](implementation/02-state-builder.md) - State Builder実装
  - [03-runtime.md](implementation/03-runtime.md) - Runtime実装
  - [04-commands.md](implementation/04-commands.md) - コマンド実装
  - [05-git-operations.md](implementation/05-git-operations.md) - Git操作

## リファレンス

- [reference/configuration-variables.md](reference/configuration-variables.md) - 全設定変数
- [reference/constraints.md](reference/constraints.md) - 実装制約
- [reference/file-layout.md](reference/file-layout.md) - ファイル配置

## テスト

- [testing/manual-checks.md](testing/manual-checks.md) - 動作確認手順
