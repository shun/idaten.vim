vim9script

def DefaultDir(): string
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
enddef

export def ResolveDir(): string
  if exists('g:idaten_dir') && !empty(g:idaten_dir)
    return g:idaten_dir
  endif
  return DefaultDir()
enddef

export def ResolveConfig(): string
  if exists('g:idaten_config') && !empty(g:idaten_config)
    return g:idaten_config
  endif
  return ''
enddef

def LogEnabled(): bool
  return get(g:, 'idaten_log_enabled', v:false)
enddef

def LogPath(): string
  if exists('g:idaten_log_path') && !empty(g:idaten_log_path)
    return g:idaten_log_path
  endif
  return '/tmp/idaten'
enddef

def LogFilePath(): string
  var path = LogPath()
  if empty(path)
    return ''
  endif
  if isdirectory(path)
    return path .. '/idaten.log'
  endif
  return path
enddef

export def Log(message: string)
  if !LogEnabled()
    return
  endif
  var path = LogFilePath()
  if empty(path)
    return
  endif
  var dir = fnamemodify(path, ':h')
  if !empty(dir) && !isdirectory(dir)
    mkdir(dir, 'p')
  endif
  var line = strftime('%Y-%m-%dT%H:%M:%S%z') .. ' ' .. message
  try
    writefile([line], path, 'a')
  catch
  endtry
enddef

def StripGitSuffix(path: string): string
  return substitute(path, '\.git$', '', '')
enddef

def StripSlashes(path: string): string
  var stripped = substitute(path, '^/*', '', '')
  stripped = substitute(stripped, '/*$', '', '')
  return stripped
enddef

def SanitizeSegment(segment: string): string
  var safe = tolower(segment)
  safe = substitute(safe, '[^a-z0-9._-]', '_', 'g')
  if empty(safe)
    return '_'
  endif
  return safe
enddef

def RepoSegments(spec: string): list<string>
  var host = ''
  var path = ''
  if spec =~# '^[a-z][a-z0-9+.-]*://'
    var rest = substitute(spec, '^[a-z][a-z0-9+.-]*://', '', '')
    var parts = split(rest, '/', 1)
    host = parts[0]
    if len(parts) > 1
      path = join(parts[1 :], '/')
    endif
  else
    path = spec
  endif
  path = StripGitSuffix(path)
  path = StripSlashes(path)

  var segments: list<string> = []
  if !empty(path)
    segments = split(path, '/', 1)
  endif
  if !empty(host) && host !=# 'github.com' && host !=# 'www.github.com'
    segments = [host] + segments
  endif
  if empty(segments)
    segments = ['_']
  endif
  var sanitized: list<string> = []
  for seg in segments
    sanitized += [SanitizeSegment(seg)]
  endfor
  return sanitized
enddef

export def RepoDir(base: string, spec: string): string
  var segments = RepoSegments(spec)
  return base .. '/repos/' .. join(segments, '/')
enddef

export def EnsureRuntimePath(path: string)
  if empty(path)
    return
  endif
  if index(split(&runtimepath, ','), path) != -1
    return
  endif
  execute 'set runtimepath^=' .. fnameescape(path)
enddef

export def EnsureDenops(idaten_dir: string): bool
  for entry in split(&runtimepath, ',')
    if filereadable(entry .. '/plugin/denops.vim')
      return true
    endif
  endfor

  var denops_repo = get(g:, 'idaten_denops_repo', 'vim-denops/denops.vim')
  var denops_path = RepoDir(idaten_dir, denops_repo)
  if filereadable(denops_path .. '/plugin/denops.vim')
    EnsureRuntimePath(denops_path)
    return true
  endif

  return false
enddef

export def CloneDenops(idaten_dir: string): string
  if !executable('git')
    return 'git is not available. Please install git.'
  endif

  var denops_repo = get(g:, 'idaten_denops_repo', '')
  if empty(denops_repo)
    return 'g:idaten_denops_repo is empty. Set a clone source.'
  endif
  if denops_repo !~# '^[a-z][a-z0-9+.-]*://' && denops_repo =~# '^[^/][^ ]*/[^/][^ ]*$'
    denops_repo = 'https://github.com/' .. denops_repo .. '.git'
  endif

  var repos_dir = idaten_dir .. '/repos'
  if !isdirectory(repos_dir)
    mkdir(repos_dir, 'p')
  endif

  var denops_path = RepoDir(idaten_dir, denops_repo)
  if isdirectory(denops_path)
    return 'denops clone destination already exists: ' .. denops_path
  endif

  var cmd = 'git clone --depth 1 ' .. shellescape(denops_repo) .. ' ' .. shellescape(denops_path)
  var result = system(cmd)
  if v:shell_error != 0
    return 'git clone failed: ' .. result
  endif

  EnsureRuntimePath(denops_path)
  return ''
enddef

export def NotifyDenopsFailure(reason: string)
  echohl ErrorMsg
  echomsg 'idaten: denops clone failed. idaten is disabled for this session.'
  echomsg 'idaten: ' .. reason
  echomsg 'idaten: check git, network, or g:idaten_denops_repo.'
  echohl None
enddef

export def NotifyStateMissing(state_path: string)
  echohl WarningMsg
  echomsg 'idaten: state.vim not found: ' .. state_path
  echomsg 'idaten: run :Idaten sync or :Idaten compile.'
  echohl None
enddef
