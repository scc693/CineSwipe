import { NextResponse } from "next/server";

export function ok<T extends Record<string, unknown>>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function fromError(error: unknown) {
  if (error instanceof Error) {
    const isAuthError = /auth|token|authorization/i.test(error.message);
    return fail(error.message, isAuthError ? 401 : 400);
  }
  return fail("Unknown server error", 500);
}
