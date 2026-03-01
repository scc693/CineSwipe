import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function requireAuthUser(request: NextRequest): Promise<{ uid: string }> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new Error("Missing authorization bearer token");
  }

  const token = header.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("Authorization token is empty");
  }

  if (process.env.E2E_BYPASS_AUTH === "true" && token.startsWith("e2e-token-")) {
    const requestedUid = request.headers.get("x-e2e-user-id");
    const uid = requestedUid?.trim() || token.replace("e2e-token-", "").trim() || "e2e-user";
    return { uid };
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  return { uid: decoded.uid };
}
