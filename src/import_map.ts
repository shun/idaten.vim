import { joinPath } from "./paths.ts";
import { IDATEN_VERSION } from "./version.ts";

export function importMapPath(idatenDir: string): string {
  return joinPath(idatenDir, "import_map.json");
}

function resolveIdatenSpecifier(): string {
  let dev = false;
  try {
    dev = Deno.env.get("IDATEN_DEV") === "1";
  } catch {
    dev = false;
  }
  if (dev) {
    return new URL("../mod.ts", import.meta.url).href;
  }
  return `jsr:@shun/idaten-vim@${IDATEN_VERSION}`;
}

export async function writeImportMap(idatenDir: string): Promise<void> {
  const data = {
    imports: {
      idaten: resolveIdatenSpecifier(),
    },
  };
  const text = JSON.stringify(data, null, 2) + "\n";
  await Deno.writeTextFile(importMapPath(idatenDir), text);
}

export async function ensureImportMap(idatenDir: string): Promise<void> {
  await Deno.mkdir(idatenDir, { recursive: true });
  try {
    await Deno.stat(importMapPath(idatenDir));
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      await writeImportMap(idatenDir);
      return;
    }
    throw err;
  }
}
