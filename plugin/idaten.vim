if exists('g:loaded_idaten')
  finish
endif
let g:loaded_idaten = 1

if get(g:, 'idaten_disabled', v:false)
  call idaten#Log('bootstrap: disabled')
  finish
endif

if !exists('g:idaten_denops_repo') || empty(g:idaten_denops_repo)
  let g:idaten_denops_repo = 'vim-denops/denops.vim'
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

call s:IdatenBootstrap()
