let memoryVisitor: string | undefined;
function resolveVisitorId() {
  try {
    const key = 'portfolio-visitor-v2';
    const stored = localStorage.getItem(key);
    if (
      stored &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        stored,
      )
    )
      return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return (memoryVisitor ??= crypto.randomUUID());
  }
}

/** Serialize identity creation across all engagement requests and tabs. */
export async function visitorId(): Promise<string> {
  if (navigator.locks)
    return navigator.locks.request('portfolio-visitor-v2', resolveVisitorId);
  return resolveVisitorId();
}

/** Memory-only identities must not inflate readership on every reload. */
export async function trackingVisitorId(): Promise<string | undefined> {
  const id = await visitorId();
  try {
    return localStorage.getItem('portfolio-visitor-v2') === id ? id : undefined;
  } catch {
    return undefined;
  }
}
