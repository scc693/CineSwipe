import { NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import { fromError, ok } from "@/lib/http";
import { searchMulti } from "@/lib/tmdb";
import { searchRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    await requireAuthUser(request);

    const body = await request.json();
    const parsed = searchRequestSchema.parse(body);

    const results = await searchMulti(parsed.query, parsed.page ?? 1);
    return ok({ results });
  } catch (error) {
    return fromError(error);
  }
}
