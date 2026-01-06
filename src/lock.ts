import { joinPath } from "./paths.ts";

export type Lockfile = {
  schema: number;
  plugins: Record<string, string>;
};

export function lockfilePath(idatenDir: string): string {
  return joinPath(idatenDir, "lock.json");
}

export async function readLockfile(idatenDir: string): Promise<Lockfile | null> {
  const path = lockfilePath(idatenDir);
  try {
    const text = await Deno.readTextFile(path);
    const data = JSON.parse(text) as Lockfile;
    if (!data || typeof data.schema !== "number" || !data.plugins) {
      throw new Error("lockfile is invalid");
    }
    return data;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return null;
    }
    throw err;
  }
}

export async function writeLockfile(idatenDir: string, data: Lockfile): Promise<void> {
  const path = lockfilePath(idatenDir);
  const text = JSON.stringify(data, null, 2) + "\n";
  await Deno.writeTextFile(path, text);
}
