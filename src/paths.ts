function stripGitSuffix(path: string): string {
  return path.replace(/\.git$/, "");
}

function stripSlashes(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function sanitizeSegment(segment: string): string {
  const safe = segment.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  return safe.length === 0 ? "_" : safe;
}

function repoSegments(spec: string): string[] {
  let host = "";
  let path = "";
  if (/^[a-z][a-z0-9+.-]*:\/\//.test(spec)) {
    const rest = spec.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
    const parts = rest.split("/");
    host = parts[0] ?? "";
    if (parts.length > 1) {
      path = parts.slice(1).join("/");
    }
  } else {
    path = spec;
  }

  path = stripGitSuffix(path);
  path = stripSlashes(path);

  let segments = path.length ? path.split("/") : [];
  if (host && host !== "github.com" && host !== "www.github.com") {
    segments = [host, ...segments];
  }
  if (segments.length === 0) {
    segments = ["_"];
  }
  return segments.map(sanitizeSegment);
}

export function repoDir(idatenDir: string, spec: string): string {
  const segments = repoSegments(spec);
  return joinPath(idatenDir, "repos", ...segments);
}

export function joinPath(...parts: string[]): string {
  const cleaned = parts
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/\\/g, "/"));
  return cleaned.join("/").replace(/\/+/g, "/");
}
