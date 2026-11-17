export type CatalogCursor = { createdAt: string; id: string };

/** A cursor is a validated range boundary, never a permission or storage credential. */
export function encodeCatalogCursor(cursor: CatalogCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCatalogCursor(value: string): CatalogCursor {
  if (!value || value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid catalog cursor.");
  let input: unknown;
  try { input = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }
  catch { throw new Error("Invalid catalog cursor."); }
  if (!input || typeof input !== "object") throw new Error("Invalid catalog cursor.");
  const cursor = input as Partial<CatalogCursor>;
  if (typeof cursor.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cursor.createdAt) ||
      !Number.isFinite(Date.parse(cursor.createdAt)) || new Date(cursor.createdAt).toISOString() !== cursor.createdAt ||
      typeof cursor.id !== "string" || !/^[a-f\d]{24}$/i.test(cursor.id)) throw new Error("Invalid catalog cursor.");
  return { createdAt: cursor.createdAt, id: cursor.id.toLowerCase() };
}
