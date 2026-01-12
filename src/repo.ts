function isWindowsDrivePath(spec: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(spec);
}

export function isLocalPathSpec(spec: string): boolean {
  if (spec.startsWith("file://")) {
    return true;
  }
  if (
    spec.startsWith("/") ||
    spec.startsWith("./") ||
    spec.startsWith("../") ||
    spec.startsWith(".\\") ||
    spec.startsWith("..\\") ||
    spec === "." ||
    spec === ".."
  ) {
    return true;
  }
  if (spec.startsWith("~")) {
    return true;
  }
  return isWindowsDrivePath(spec);
}

function isSchemeUrl(spec: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(spec);
}

function extractScheme(spec: string): string {
  const match = spec.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (!match) {
    return "";
  }
  return match[1].toLowerCase();
}

export function normalizeRepoSpec(spec: string): string {
  const trimmed = spec.trim();
  if (trimmed.length === 0) {
    throw new Error("repo is required");
  }
  if (isLocalPathSpec(trimmed)) {
    throw new Error(`local path repo is not allowed: ${trimmed}`);
  }
  if (!isSchemeUrl(trimmed)) {
    throw new Error(`repo must be a URL: ${trimmed}`);
  }
  const scheme = extractScheme(trimmed);
  if (scheme === "file") {
    throw new Error(`local path repo is not allowed: ${trimmed}`);
  }
  if (scheme !== "https" && scheme !== "ssh" && scheme !== "git") {
    throw new Error(`repo scheme is not allowed: ${scheme}`);
  }
  return trimmed;
}
