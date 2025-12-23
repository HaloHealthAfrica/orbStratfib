export async function readRawBody(req: Request): Promise<{ raw: string; json: unknown | null }> {
  const raw = await req.text();
  if (!raw) return { raw: "", json: null };
  try {
    return { raw, json: JSON.parse(raw) as unknown };
  } catch {
    return { raw, json: null };
  }
}


