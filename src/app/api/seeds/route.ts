import { NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth-server";
import { saveSeeds } from "@/lib/firestore";
import { fromError, ok } from "@/lib/http";
import { seedsRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthUser(request);
    const body = await request.json();
    const parsed = seedsRequestSchema.parse(body);

    const profile = await saveSeeds(uid, parsed.items);
    return ok({ ok: true, profileVersion: profile.profileVersion });
  } catch (error) {
    return fromError(error);
  }
}
