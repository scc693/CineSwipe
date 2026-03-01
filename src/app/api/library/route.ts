import { NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import { getLibraryItems } from "@/lib/firestore";
import { fromError, ok } from "@/lib/http";
import { libraryQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthUser(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = libraryQuerySchema.parse(params);

    const items = await getLibraryItems(uid, parsed.listType, parsed.mediaType, parsed.genre);

    return ok({ items, listType: parsed.listType, mediaType: parsed.mediaType, genre: parsed.genre ?? null });
  } catch (error) {
    return fromError(error);
  }
}
