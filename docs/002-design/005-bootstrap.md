# 設計: bootstrap（Vim9 Script）

## 目的

- 通常起動は `state.vim` の `source` のみで成立させる。
- Deno を起動せずに起動時ガードを実行する。
- denops 不在時は同期 clone を 1 回だけ試行する。

## 対象ファイル

- `plugin/idaten.vim`
- `autoload/idaten.vim`

## 設定と内部フラグ

- `g:idaten_dir`: 管理ディレクトリを上書きする（未設定時は既定パス）。
- `g:idaten_config`: TypeScript 設定ファイルのパスを上書きする。
- `g:idaten_denops_repo`: denops の clone 元（既定: `vim-denops/denops.vim`）。
- `g:idaten_log_enabled`: ログの有効/無効（既定は無効）。
- `g:idaten_log_path`: ログの出力先（既定: `/tmp/idaten`）。
- `g:idaten_denops_clone_tried`: 1 セッション 1 回の clone 試行ガード。
- `g:idaten_disabled`: denops clone 失敗時に `v:true` を設定し、以後の処理を止める。

## 主要フロー

1. 二重ロード防止（`g:loaded_idaten`）。
2. `g:idaten_disabled` が真なら何もしない。
3. `g:idaten_dir` を解決し、`state.vim` のパスを組み立てる。
3. `g:idaten_config` を解決し、TypeScript 設定のパスを決める。
4. denops が runtimepath か管理ディレクトリに存在するかを確認する。
5. 未存在の場合は `g:idaten_denops_clone_tried` が未設定なら同期 clone を試行する。
6. clone 失敗時は `g:idaten_disabled` を立て、原因と対処を案内して終了する。
7. `state.vim` 不在時は自動 compile せず、`:Idaten sync`/`:Idaten compile` を案内して終了する。
8. `state.vim` が存在する場合は `source` する。

## denops 検出

- runtimepath と管理ディレクトリの両方を対象に `denops.vim` の存在を確認する。
- この探索は denops 検出のみに限定し、プラグイン列挙には用いない。

## 同期 clone

- `system()` で `git clone` を実行する（同期）。
- `executable('git')` が偽の場合は失敗扱いとする。
- 失敗時は `v:shell_error` を確認し、原因と対処を明示する。
- `owner/repo` 形式の場合は `https://github.com/<owner>/<repo>.git` に変換して clone する。

## Vim9 Script 例（概要）

```vim
vim9script

if exists('g:loaded_idaten')
  finish
endif
g:loaded_idaten = 1

if get(g:, 'idaten_disabled', v:false)
  finish
endif

def IdatenResolveDir(): string
  if exists('g:idaten_dir') && !empty(g:idaten_dir)
    return g:idaten_dir
  endif
  " OS 既定パスの解決は別関数で行う。
  return IdatenDefaultDir()
enddef

def IdatenBootstrap()
  var dir = IdatenResolveDir()
  var state_path = dir .. '/state.vim'
  if !IdatenHasDenops(dir)
    if !get(g:, 'idaten_denops_clone_tried', v:false)
      g:idaten_denops_clone_tried = v:true
      if !IdatenCloneDenops(dir)
        g:idaten_disabled = v:true
        IdatenNotifyDenopsFailure()
        return
      endif
    endif
  endif
  if !filereadable(state_path)
    IdatenNotifyStateMissing()
    return
  endif
  execute 'source' fnameescape(state_path)
enddef

IdatenBootstrap()
```
