"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

export async function authedJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let token = "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string> | undefined)
  };

  if (process.env.NEXT_PUBLIC_E2E_MODE === "true") {
    const e2eUserId =
      typeof window !== "undefined" ? window.localStorage.getItem("e2e_user_id") ?? "e2e-user" : "e2e-user";
    token = `e2e-token-${e2eUserId}`;
    headers["x-e2e-user-id"] = e2eUserId;
  } else {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase client configuration is missing in .env.local");
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user found");
    }
    token = await user.getIdToken();
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...headers
    }
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "API request failed");
  }

  return payload as T;
}
