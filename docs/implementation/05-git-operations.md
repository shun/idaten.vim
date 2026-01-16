# Git操作

## clone

```bash
git clone <repo> <dest>
```

### プラグイン

full clone を実行します（rev 指定に対応するため）。

### denops

`--depth 1` で shallow clone を実行します（起動時間短縮のため）。

```bash
git clone --depth 1 <repo> <dest>
```

## fetch

```bash
git fetch --prune
```

`--prune` オプションでリモートで削除されたブランチをローカルからも削除します。

## checkout

```bash
git checkout --detach <rev>
```

detached HEAD で checkout します。

## rev-parse

現在の commit hash を取得します。

```bash
git rev-parse HEAD
```

lockfile 生成時に使用します。

## status

dirty 状態を確認します。

```bash
git status --porcelain
```

出力が空でない場合は dirty とみなします。

## version

git の存在確認に使用します。

```bash
git --version
```

## エラーハンドリング

- `git` コマンドが存在しない場合は code 127 を返す
- その他のエラーは stderr を返す
- 成功時は code 0 を返す

## ファイル

- `src/git.ts`: Git操作の実装
- `autoload/idaten.vim`: denops clone 用の同期 git 実行
