import { NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import { recordSwipe } from "@/lib/firestore";
import { fromError, ok } from "@/lib/http";
import { swipeRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthUser(request);
    const body = await request.json();
    const parsed = swipeRequestSchema.parse(body);

    const result = await recordSwipe(uid, {
      mediaId: parsed.mediaId,
      mediaType: parsed.mediaType,
      direction: parsed.direction,
      media: parsed.media
    });

    return ok({ ok: true, profileVersion: result.profileVersion, appliedListType: result.appliedListType });
  } catch (error) {
    return fromError(error);
  }
}
