vim9script

import autoload 'idaten.vim' as Idaten

if exists('g:loaded_idaten')
  finish
endif
g:loaded_idaten = 1

if get(g:, 'idaten_disabled', v:false)
  Idaten.Log('bootstrap: disabled')
  finish
endif

if !exists('g:idaten_denops_repo') || empty(g:idaten_denops_repo)
  g:idaten_denops_repo = 'vim-denops/denops.vim'
endif

def IdatenBootstrap()
  Idaten.Log('bootstrap: start')
  var dir = Idaten.ResolveDir()
  var config_path = Idaten.ResolveConfig()
  var state_path = dir .. '/state.vim'
  Idaten.Log('bootstrap: idaten_dir=' .. dir)
  if !empty(config_path)
    Idaten.Log('bootstrap: config=' .. config_path)
  endif

  if !Idaten.EnsureDenops(dir)
    Idaten.Log('bootstrap: denops missing')
    if !get(g:, 'idaten_denops_clone_tried', v:false)
      g:idaten_denops_clone_tried = v:true
      var err = Idaten.CloneDenops(dir)
      if err != ''
        Idaten.Log('bootstrap: denops clone failed: ' .. err)
        g:idaten_disabled = v:true
        Idaten.NotifyDenopsFailure(err)
        return
      endif
      Idaten.Log('bootstrap: denops clone ok')
    else
      return
    endif
  else
    Idaten.Log('bootstrap: denops ok')
  endif

  if !filereadable(state_path)
    Idaten.Log('bootstrap: state missing: ' .. state_path)
    Idaten.NotifyStateMissing(state_path)
    return
  endif

  Idaten.Log('bootstrap: source state')
  execute 'source' fnameescape(state_path)
enddef

IdatenBootstrap()
