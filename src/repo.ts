function isWindowsDrivePath(spec: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(spec);
}

export function isLocalPathSpec(spec: string): boolean {
  if (spec.startsWith("file://")) {
    return true;
  }
  if (spec.startsWith("/") || spec.startsWith("./") || spec.startsWith("../")) {
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

function isOwnerRepo(spec: string): boolean {
  return /^[^/\\\s]+\/[^/\\\s]+$/.test(spec);
}

function isScpLike(spec: string): boolean {
  return /^[^@\s]+@[^:\s]+:.+$/.test(spec);
}

export function normalizeRepoSpec(spec: string): string {
  const trimmed = spec.trim();
  if (trimmed.length === 0) {
    throw new Error("repo is required");
  }
  if (isLocalPathSpec(trimmed)) {
    throw new Error(`local path repo is not allowed: ${trimmed}`);
  }
  if (isSchemeUrl(trimmed)) {
    if (trimmed.toLowerCase().startsWith("file://")) {
      throw new Error(`local path repo is not allowed: ${trimmed}`);
    }
    return trimmed;
  }
  if (isOwnerRepo(trimmed)) {
    return `https://github.com/${trimmed}.git`;
  }
  if (isScpLike(trimmed)) {
    return trimmed;
  }
  throw new Error(`invalid repo spec: ${trimmed}`);
}
