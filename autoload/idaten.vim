function! s:DefaultDir() abort
  if has('win32') || has('win64')
    return $LOCALAPPDATA .. '/idaten'
  endif

  if has('mac') || has('macunix')
    return expand('~/Library/Caches/idaten')
  endif

  if empty($XDG_CACHE_HOME)
    return expand('~/.cache/idaten')
  endif
  return $XDG_CACHE_HOME .. '/idaten'
endfunction

function! idaten#ResolveDir() abort
  if exists('g:idaten_dir') && !empty(g:idaten_dir)
    return g:idaten_dir
  endif
  return s:DefaultDir()
endfunction

function! idaten#ResolveConfig() abort
  if exists('g:idaten_config') && !empty(g:idaten_config)
    return g:idaten_config
  endif
  return ''
endfunction

function! s:LogEnabled() abort
  return get(g:, 'idaten_log_enabled', v:false)
endfunction

function! s:LogPath() abort
  if exists('g:idaten_log_path') && !empty(g:idaten_log_path)
    return g:idaten_log_path
  endif
  return '/tmp/idaten'
endfunction

function! s:LogFilePath() abort
  let l:path = s:LogPath()
  if empty(l:path)
    return ''
  endif
  if isdirectory(l:path)
    return l:path .. '/idaten.log'
  endif
  return l:path
endfunction

function! idaten#Log(message) abort
  if !s:LogEnabled()
    return
  endif
  let l:path = s:LogFilePath()
  if empty(l:path)
    return
  endif
  let l:dir = fnamemodify(l:path, ':h')
  if !empty(l:dir) && !isdirectory(l:dir)
    call mkdir(l:dir, 'p')
  endif
  let l:line = strftime('%Y-%m-%dT%H:%M:%S%z') .. ' ' .. a:message
  try
    call writefile([l:line], l:path, 'a')
  catch
  endtry
endfunction

function! s:StripGitSuffix(path) abort
  return substitute(a:path, '\.git$', '', '')
endfunction

function! s:StripSlashes(path) abort
  let l:stripped = substitute(a:path, '^/*', '', '')
  let l:stripped = substitute(l:stripped, '/*$', '', '')
  return l:stripped
endfunction

function! s:SanitizeSegment(segment) abort
  let l:safe = tolower(a:segment)
  let l:safe = substitute(l:safe, '[^a-z0-9._-]', '_', 'g')
  if empty(l:safe)
    return '_'
  endif
  return l:safe
endfunction

function! s:RepoSegments(spec) abort
  let l:host = ''
  let l:path = ''
  if a:spec =~# '^[a-z][a-z0-9+.-]*://'
    let l:rest = substitute(a:spec, '^[a-z][a-z0-9+.-]*://', '', '')
    let l:parts = split(l:rest, '/', 1)
    let l:host = l:parts[0]
    if l:host =~# '@'
      let l:host = split(l:host, '@')[-1]
    endif
    if len(l:parts) > 1
      let l:path = join(l:parts[1 : ], '/')
    endif
  else
    let l:path = a:spec
  endif
  let l:path = s:StripGitSuffix(l:path)
  let l:path = s:StripSlashes(l:path)

  let l:segments = []
  if !empty(l:path)
    let l:segments = split(l:path, '/', 1)
  endif
  if !empty(l:host)
    call insert(l:segments, l:host, 0)
  endif
  if empty(l:segments)
    let l:segments = ['_']
  endif
  return map(l:segments, 's:SanitizeSegment(v:val)')
endfunction

function! idaten#RepoDir(base, spec) abort
  let l:segments = s:RepoSegments(a:spec)
  return a:base .. '/repos/' .. join(l:segments, '/')
endfunction

function! idaten#EnsureRuntimePath(path) abort
  if empty(a:path)
    return
  endif
  if index(split(&runtimepath, ','), a:path) != -1
    return
  endif
  execute 'set runtimepath^=' .. fnameescape(a:path)
endfunction

function! idaten#EnsureDenops(idaten_dir) abort
  for l:entry in split(&runtimepath, ',')
    if filereadable(l:entry .. '/plugin/denops.vim')
      return v:true
    endif
  endfor

  let l:denops_repo = get(g:, 'idaten_denops_repo', 'https://github.com/vim-denops/denops.vim.git')
  let l:denops_path = idaten#RepoDir(a:idaten_dir, l:denops_repo)
  if filereadable(l:denops_path .. '/plugin/denops.vim')
    call idaten#EnsureRuntimePath(l:denops_path)
    return v:true
  endif

  return v:false
endfunction

function! idaten#CloneDenops(idaten_dir) abort
  if !executable('git')
    return 'git is not available. Please install git.'
  endif

  let l:denops_repo = get(g:, 'idaten_denops_repo', '')
  if empty(l:denops_repo)
    return 'g:idaten_denops_repo is empty. Set a clone source.'
  endif
  if l:denops_repo !~# '^\%(https\|ssh\|git\)://'
    return 'g:idaten_denops_repo must be a https/ssh/git URL.'
  endif

  let l:repos_dir = a:idaten_dir .. '/repos'
  if !isdirectory(l:repos_dir)
    call mkdir(l:repos_dir, 'p')
  endif

  let l:denops_path = idaten#RepoDir(a:idaten_dir, l:denops_repo)
  if isdirectory(l:denops_path)
    return 'denops clone destination already exists: ' .. l:denops_path
  endif

  let l:cmd = 'git clone --depth 1 ' .. shellescape(l:denops_repo) .. ' ' .. shellescape(l:denops_path)
  let l:result = system(l:cmd)
  if v:shell_error != 0
    return 'git clone failed: ' .. l:result
  endif

  call idaten#EnsureRuntimePath(l:denops_path)
  return ''
endfunction

function! idaten#NotifyDenopsFailure(reason) abort
  echohl ErrorMsg
  echomsg 'idaten: denops clone failed. idaten is disabled for this session.'
  echomsg 'idaten: ' .. a:reason
  echomsg 'idaten: check git, network, or g:idaten_denops_repo.'
  echohl None
endfunction

function! idaten#NotifyStateMissing(state_path) abort
  echohl WarningMsg
  echomsg 'idaten: state.vim not found: ' .. a:state_path
  echomsg 'idaten: run :Idaten sync or :Idaten compile.'
  echohl None
endfunction
