import { buildState } from "./builder.ts";
import { writeImportMap } from "./import_map.ts";
import { renderStateVim } from "./state.ts";
import { joinPath } from "./paths.ts";

type CompileOptions = {
  configPath: string;
  idatenDir: string;
};

async function ensureDir(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
}

export async function compileState(options: CompileOptions): Promise<void> {
  const state = await buildState(options);
  const content = renderStateVim(state);

  await ensureDir(options.idatenDir);
  const target = joinPath(options.idatenDir, "state.vim");
  const tmp = joinPath(options.idatenDir, "state.vim.tmp");

  await Deno.writeTextFile(tmp, content);
  await writeImportMap(options.idatenDir);
  await Deno.rename(tmp, target);
}
