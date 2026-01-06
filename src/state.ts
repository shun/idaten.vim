export type State = {
  schema: number;
  meta: {
    idaten_version: string;
    config_path: string;
    generated_at: string;
  };
  plugins: Record<string, StatePlugin>;
  order: string[];
  triggers: {
    event: Record<string, string[]>;
    ft: Record<string, string[]>;
    cmd: Record<string, string[]>;
  };
};

export type StatePlugin = {
  path: string;
  rtp: string;
  depends: string[];
  lazy: {
    on_event: string[];
    on_ft: string[];
    on_cmd: string[];
  };
  hooks: {
    add: string;
    source: string;
  };
  sources: string[];
  boot_sources: string[];
  ft_sources: {
    ftplugin: Record<string, string[]>;
    indent: Record<string, string[]>;
    syntax: Record<string, string[]>;
  };
  dev: {
    enable: boolean;
    override_path: string;
  };
};

function escapeString(value: string): string {
  return value.replace(/'/g, "''");
}

function renderValue(value: unknown, indent: number): string[] {
  const pad = " ".repeat(indent);
  if (typeof value === "string") {
    return [pad + `'${escapeString(value)}'`];
  }
  if (typeof value === "number") {
    return [pad + String(value)];
  }
  if (typeof value === "boolean") {
    return [pad + (value ? "v:true" : "v:false")];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [pad + "[]"];
    }
    const lines: string[] = [pad + "["];
    for (const item of value) {
      const itemLines = renderValue(item, indent + 2);
      const lastIndex = itemLines.length - 1;
      itemLines[lastIndex] = itemLines[lastIndex] + ",";
      lines.push(...itemLines);
    }
    lines.push(pad + "]");
    return lines;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [pad + "{}"];
    }
    const lines: string[] = [pad + "{"];
    for (const [key, val] of entries) {
      const valLines = renderValue(val, indent + 2);
      if (valLines.length === 1) {
        const trimmed = valLines[0].trimStart();
        lines.push(pad + "  " + `'${escapeString(key)}': ` + trimmed + ",");
      } else {
        const first = valLines[0].trimStart();
        lines.push(pad + "  " + `'${escapeString(key)}': ` + first);
        lines.push(...valLines.slice(1));
        lines[lines.length - 1] = lines[lines.length - 1] + ",";
      }
    }
    lines.push(pad + "}");
    return lines;
  }
  return [pad + "v:null"];
}

export function renderStateVim(state: State): string {
  const lines = renderValue(state, 0);
  lines[0] = "let s:state = " + lines[0].trimStart();
  const output = [lines[0], ...lines.slice(1).map((line) => "\\ " + line)];
  const runtime = renderRuntimeVim();
  return output.join("\n") + "\n" + runtime;
}

function renderRuntimeVim(): string {
  const lines = [
    "if get(s:state, 'schema', 0) != 1",
    "  echohl WarningMsg",
    "  echomsg 'idaten: state.vim schema mismatch. run :Idaten sync or :Idaten compile.'",
    "  echohl None",
    "  finish",
    "endif",
    "",
    "let s:loaded = {}",
    "let s:command_running = {}",
    "",
    "function! s:TrimSpace(value) abort",
    "  return substitute(a:value, '\\\\s\\\\+$', '', '')",
    "endfunction",
    "",
    "function! s:IsLazy(plugin) abort",
    "  let l:lazy = get(a:plugin, 'lazy', {})",
    "  return len(get(l:lazy, 'on_event', [])) > 0",
    "    \\ || len(get(l:lazy, 'on_ft', [])) > 0",
    "    \\ || len(get(l:lazy, 'on_cmd', [])) > 0",
    "endfunction",
    "",
    "function! s:IsLoaded(name) abort",
    "  return get(s:loaded, a:name, v:false)",
    "endfunction",
    "",
    "function! s:PluginBasePath(plugin) abort",
    "  let l:dev = get(a:plugin, 'dev', {})",
    "  if get(l:dev, 'enable', v:false) && !empty(get(l:dev, 'override_path', ''))",
    "    return l:dev.override_path",
    "  endif",
    "  return get(a:plugin, 'path', '')",
    "endfunction",
    "",
    "function! s:PluginRtpPath(plugin) abort",
    "  let l:base = s:PluginBasePath(a:plugin)",
    "  if empty(l:base)",
    "    return ''",
    "  endif",
    "  let l:rtp = get(a:plugin, 'rtp', '')",
    "  if empty(l:rtp)",
    "    return l:base",
    "  endif",
    "  return l:base .. '/' .. l:rtp",
    "endfunction",
    "",
    "function! s:SourceFiles(base, files) abort",
    "  if empty(a:base)",
    "    return",
    "  endif",
    "  for l:file in a:files",
    "    let l:path = a:base .. '/' .. l:file",
    "    if filereadable(l:path)",
    "      execute 'source' fnameescape(l:path)",
    "    endif",
    "  endfor",
    "endfunction",
    "",
    "function! s:EnsureLoaded(name) abort",
    "  if s:IsLoaded(a:name)",
    "    return",
    "  endif",
    "  if !has_key(s:state.plugins, a:name)",
    "    return",
    "  endif",
    "  let l:plugin = s:state.plugins[a:name]",
    "  for l:dep in l:plugin.depends",
    "    call s:EnsureLoaded(l:dep)",
    "  endfor",
    "  let l:rtp = s:PluginRtpPath(l:plugin)",
    "  if empty(l:rtp) || !isdirectory(l:rtp)",
    "    return",
    "  endif",
    "  call idaten#EnsureRuntimePath(l:rtp)",
    "  call s:SourceFiles(l:rtp, l:plugin.sources)",
    "  if !empty(l:plugin.hooks.source)",
    "    execute l:plugin.hooks.source",
    "  endif",
    "  let s:loaded[a:name] = v:true",
    "endfunction",
    "",
    "function! s:SourceFiletype(name, ft) abort",
    "  if !s:IsLoaded(a:name)",
    "    return",
    "  endif",
    "  let l:plugin = s:state.plugins[a:name]",
    "  let l:rtp = s:PluginRtpPath(l:plugin)",
    "  if empty(l:rtp)",
    "    return",
    "  endif",
    "  let l:ft_sources = get(l:plugin, 'ft_sources', {})",
    "  let l:ftplugin = get(l:ft_sources, 'ftplugin', {})",
    "  let l:indent = get(l:ft_sources, 'indent', {})",
    "  let l:syntax = get(l:ft_sources, 'syntax', {})",
    "  if has_key(l:ftplugin, a:ft)",
    "    call s:SourceFiles(l:rtp, l:ftplugin[a:ft])",
    "  endif",
    "  if has_key(l:indent, a:ft)",
    "    call s:SourceFiles(l:rtp, l:indent[a:ft])",
    "  endif",
    "  if has_key(l:syntax, a:ft)",
    "    call s:SourceFiles(l:rtp, l:syntax[a:ft])",
    "  endif",
    "endfunction",
    "",
    "function! s:SourceFiletypeForLoaded(ft) abort",
    "  for l:name in keys(s:state.plugins)",
    "    if s:IsLoaded(l:name)",
    "      call s:SourceFiletype(l:name, a:ft)",
    "    endif",
    "  endfor",
    "endfunction",
    "",
    "function! s:OnEvent(event) abort",
    "  if !has_key(s:state.triggers.event, a:event)",
    "    return",
    "  endif",
    "  for l:name in s:state.triggers.event[a:event]",
    "    call s:EnsureLoaded(l:name)",
    "  endfor",
    "endfunction",
    "",
    "function! s:OnFileType(ft) abort",
    "  if has_key(s:state.triggers.ft, a:ft)",
    "    for l:name in s:state.triggers.ft[a:ft]",
    "      call s:EnsureLoaded(l:name)",
    "    endfor",
    "  endif",
    "  call s:SourceFiletypeForLoaded(a:ft)",
    "endfunction",
    "",
    "function! s:LoadCommandPlugins(cmd) abort",
    "  if !has_key(s:state.triggers.cmd, a:cmd)",
    "    return",
    "  endif",
    "  for l:name in s:state.triggers.cmd[a:cmd]",
    "    call s:EnsureLoaded(l:name)",
    "  endfor",
    "endfunction",
    "",
    "function! s:BuildCommand(cmd, qargs, bang, range, count, mods, reg) abort",
    "  let l:parts = []",
    "  let l:mods = s:TrimSpace(a:mods)",
    "  let l:range = s:TrimSpace(a:range)",
    "  if l:range ==# '0'",
    "    let l:range = ''",
    "  endif",
    "  if !empty(l:mods)",
    "    call add(l:parts, l:mods)",
    "  endif",
    "  if !empty(l:range)",
    "    call add(l:parts, l:range)",
    "  elseif a:count > 0",
    "    call add(l:parts, string(a:count))",
    "  endif",
    "  let l:cmd = a:cmd",
    "  if a:bang ==# '!'",
    "    let l:cmd = l:cmd .. '!'",
    "  endif",
    "  if !empty(a:reg)",
    "    let l:cmd = '\"' .. a:reg .. l:cmd",
    "  endif",
    "  call add(l:parts, l:cmd)",
    "  if !empty(a:qargs)",
    "    call add(l:parts, a:qargs)",
    "  endif",
    "  return join(l:parts, ' ')",
    "endfunction",
    "",
    "function! s:CommandStub(cmd, qargs, bang, range, count, mods, reg) abort",
    "  if get(s:command_running, a:cmd, v:false)",
    "    echohl ErrorMsg",
    "    echomsg 'idaten: command not found after load: ' .. a:cmd",
    "    echohl None",
    "    return",
    "  endif",
    "  let s:command_running[a:cmd] = v:true",
    "  try",
    "    call s:LoadCommandPlugins(a:cmd)",
    "    let l:cmdline = s:BuildCommand(a:cmd, a:qargs, a:bang, a:range, a:count, a:mods, a:reg)",
    "  finally",
    "    let s:command_running[a:cmd] = v:false",
    "  endtry",
    "  execute l:cmdline",
    "endfunction",
    "",
    "function! s:DefineCommand(cmd) abort",
    "  let l:escaped = escape(a:cmd, \"'\")",
    "  execute 'command! -nargs=* -range -count -bang -register -bar ' .. a:cmd",
    "    \\ .. ' call s:CommandStub(''' .. l:escaped .. ''', <q-args>, ''<bang>'', ''<range>'', <count>, ''<mods>'', ''<register>'')'",
    "endfunction",
    "",
    "for plugin in values(s:state.plugins)",
    "  let rtp = s:PluginRtpPath(plugin)",
    "  call s:SourceFiles(rtp, plugin.boot_sources)",
    "endfor",
    "",
    "for name in s:state.order",
    "  if has_key(s:state.plugins, name)",
    "    let plugin = s:state.plugins[name]",
    "    if !empty(plugin.hooks.add)",
    "      execute plugin.hooks.add",
    "    endif",
    "  endif",
    "endfor",
    "",
    "for name in keys(s:state.plugins)",
    "  let plugin = s:state.plugins[name]",
    "  if !s:IsLazy(plugin)",
    "    call s:EnsureLoaded(name)",
    "  endif",
    "endfor",
    "",
    "augroup idaten_state",
    "  autocmd!",
    "  for event in keys(s:state.triggers.event)",
    "    execute 'autocmd ' .. event .. ' * call s:OnEvent(''' .. event .. ''')'",
    "  endfor",
    "  for ft in keys(s:state.triggers.ft)",
    "    execute 'autocmd FileType ' .. ft .. ' call s:OnFileType(''' .. ft .. ''')'",
    "  endfor",
    "augroup END",
    "",
    "for cmd in keys(s:state.triggers.cmd)",
    "  call s:DefineCommand(cmd)",
    "endfor",
    "",
  ];
  return lines.join("\n") + "\n";
}
