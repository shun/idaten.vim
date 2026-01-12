if exists('g:loaded_idaten')
  finish
endif
let g:loaded_idaten = 1

if get(g:, 'idaten_disabled', v:false)
  call idaten#Log('bootstrap: disabled')
  finish
endif

if !exists('g:idaten_denops_repo') || empty(g:idaten_denops_repo)
  let g:idaten_denops_repo = 'https://github.com/vim-denops/denops.vim.git'
endif

function! s:IdatenBootstrap() abort
  call idaten#Log('bootstrap: start')
  let l:dir = idaten#ResolveDir()
  let l:config_path = idaten#ResolveConfig()
  let l:state_path = l:dir .. '/state.vim'
  call idaten#Log('bootstrap: idaten_dir=' .. l:dir)
  if !empty(l:config_path)
    call idaten#Log('bootstrap: config=' .. l:config_path)
  endif

  if !idaten#EnsureDenops(l:dir)
    call idaten#Log('bootstrap: denops missing')
    if !get(g:, 'idaten_denops_clone_tried', v:false)
      let g:idaten_denops_clone_tried = v:true
      let l:err = idaten#CloneDenops(l:dir)
      if !empty(l:err)
        call idaten#Log('bootstrap: denops clone failed: ' .. l:err)
        let g:idaten_disabled = v:true
        call idaten#NotifyDenopsFailure(l:err)
        return
      endif
      call idaten#Log('bootstrap: denops clone ok')
    else
      return
    endif
  else
    call idaten#Log('bootstrap: denops ok')
  endif

  if !filereadable(l:state_path)
    call idaten#Log('bootstrap: state missing: ' .. l:state_path)
    call idaten#NotifyStateMissing(l:state_path)
    return
  endif

  call idaten#Log('bootstrap: source state')
  execute 'source' fnameescape(l:state_path)
endfunction

function! s:HasConfigOption(words) abort
  for l:word in a:words
    if l:word =~# '^--config'
      return v:true
    endif
  endfor
  return v:false
endfunction

function! s:IdatenComplete(arglead, cmdline, cursorpos) abort
  let l:subcommands = ['sync', 'compile', 'status', 'check', 'clean', 'lock']
  let l:words = split(a:cmdline)
  let l:ends_with_space = a:cmdline =~# '\s$'

  if len(l:words) <= 1
    return empty(a:arglead)
      \ ? l:subcommands
      \ : filter(copy(l:subcommands), 'v:val =~# "^" .. a:arglead')
  endif

  if len(l:words) == 2 && !l:ends_with_space
    return empty(a:arglead)
      \ ? l:subcommands
      \ : filter(copy(l:subcommands), 'v:val =~# "^" .. a:arglead')
  endif

  let l:sub = l:words[1]
  if l:sub ==# 'sync'
    let l:options = ['--locked', '--config']
    if index(l:words, '--locked') != -1
      call filter(l:options, 'v:val !=# "--locked"')
    endif
    if s:HasConfigOption(l:words)
      call filter(l:options, 'v:val !=# "--config"')
    endif
    return empty(a:arglead)
      \ ? l:options
      \ : filter(copy(l:options), 'v:val =~# "^" .. a:arglead')
  endif

  if l:sub ==# 'compile'
    let l:options = ['--config']
    if s:HasConfigOption(l:words)
      call filter(l:options, 'v:val !=# "--config"')
    endif
    return empty(a:arglead)
      \ ? l:options
      \ : filter(copy(l:options), 'v:val =~# "^" .. a:arglead')
  endif

  return []
endfunction

function! s:IdatenCommand(...) abort
  call idaten#Log('command: Idaten ' .. join(a:000, ' '))
  if get(g:, 'idaten_disabled', v:false)
    echohl ErrorMsg
    echomsg 'idaten: disabled (denops clone failed)'
    echohl None
    return
  endif

  let l:dir = idaten#ResolveDir()
  if !idaten#EnsureDenops(l:dir)
    echohl ErrorMsg
    echomsg 'idaten: denops is not available'
    echohl None
    return
  endif

  let l:name = 'idaten'
  let l:root = fnamemodify(expand('<sfile>:p'), ':h:h')
  let l:script = l:root .. '/denops/idaten/main.ts'
  try
    if !exists('g:loaded_denops')
      silent! runtime plugin/denops.vim
    endif
    call denops#server#connect_or_start()
    let l:server_wait = denops#server#wait(#{silent: 1})
    if l:server_wait < 0
      echohl ErrorMsg
      echomsg 'idaten: denops server is not ready'
      echohl None
      return
    endif
    call denops#plugin#load(l:name, l:script)
    let l:wait = denops#plugin#wait(l:name, #{silent: 1})
    if l:wait != 0
      echohl ErrorMsg
      echomsg 'idaten: denops failed to start'
      echohl None
      return
    endif
    call denops#request(l:name, 'command', a:000)
  catch
    echohl ErrorMsg
    echomsg 'idaten: denops request failed: ' .. v:exception
    echohl None
  endtry
endfunction

command! -nargs=* -complete=customlist,s:IdatenComplete Idaten call s:IdatenCommand(<f-args>)

call s:IdatenBootstrap()
