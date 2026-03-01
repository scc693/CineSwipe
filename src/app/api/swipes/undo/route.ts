import { NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import { fromError, ok } from "@/lib/http";
import { undoLastSwipe } from "@/lib/firestore";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthUser(request);
    const result = await undoLastSwipe(uid);
    return ok({ ok: true, restored: result.restored, profileVersion: result.profileVersion });
  } catch (error) {
    return fromError(error);
  }
}
