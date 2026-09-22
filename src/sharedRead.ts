// Share concurrent consumers of the same scoped read. Completed reads are not
// cached, so a later refresh always reaches the server (including after errors).
export function createSharedRead<T>() {
  let pending: Promise<T> | undefined;
  return (load: () => Promise<T>): Promise<T> => {
    pending ??= Promise.resolve().then(load).finally(() => { pending = undefined; });
    return pending;
  };
}
