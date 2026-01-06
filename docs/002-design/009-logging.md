# 設計: ログ出力

## 目的

- 動作確認やデバッグのためにログを任意で出力できるようにする。
- ログは無効がデフォルトで、明示的に有効化する。

## 設定

- `g:idaten_log_enabled`: `v:true` でログ有効（既定は無効）。
- `g:idaten_log_path`: 出力先パス（既定: `/tmp/idaten`）。

## 出力先の解釈

- `g:idaten_log_path` がディレクトリの場合は `<path>/idaten.log` に出力する。
- `g:idaten_log_path` がファイルパスの場合はそのファイルに追記する。

## 形式

- 1 行 1 レコードで出力する。
- 先頭に ISO 風のタイムスタンプを付与する。

例:

```
2024-01-01T00:00:00+0900 bootstrap: start
2024-01-01T00:00:00+0900 bootstrap: denops missing
```

## 対象

- bootstrap（Vim9 Script）
- Deno 側（sync/compile/check 等）も同じパスに追記できる設計とする。
