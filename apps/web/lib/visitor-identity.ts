let memoryVisitor: string | undefined;
export function visitorId() {
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
