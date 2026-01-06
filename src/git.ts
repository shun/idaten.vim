type GitResult = {
  code: number;
  stdout: string;
  stderr: string;
};

async function runGit(args: string[], cwd?: string): Promise<GitResult> {
  try {
    const command = new Deno.Command("git", {
      args,
      cwd,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await command.output();
    return {
      code,
      stdout: new TextDecoder().decode(stdout).trim(),
      stderr: new TextDecoder().decode(stderr).trim(),
    };
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return { code: 127, stdout: "", stderr: "git is not available" };
    }
    throw err;
  }
}

export async function gitClone(repo: string, dest: string): Promise<GitResult> {
  return await runGit(["clone", repo, dest]);
}

export async function gitFetch(path: string): Promise<GitResult> {
  return await runGit(["fetch", "--prune"], path);
}

export async function gitCheckout(path: string, rev: string): Promise<GitResult> {
  return await runGit(["checkout", "--detach", rev], path);
}

export async function gitCurrentHead(path: string): Promise<GitResult> {
  return await runGit(["rev-parse", "HEAD"], path);
}

export async function gitStatusPorcelain(path: string): Promise<GitResult> {
  return await runGit(["status", "--porcelain"], path);
}

export async function gitVersion(): Promise<GitResult> {
  return await runGit(["--version"]);
}
