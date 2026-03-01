import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT_ID = "demo-cineswipe";

let testEnv: RulesTestEnvironment;

function emulatorHostPort(): { host: string; port: number } {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [hostname, portText] = host.split(":");
  return {
    host: hostname,
    port: Number(portText ?? "8080")
  };
}

beforeAll(async () => {
  const { host, port } = emulatorHostPort();
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8")
    }
  });
});

afterEach(async () => {
  if (!testEnv) {
    return;
  }
  await testEnv.clearFirestore();
});

afterAll(async () => {
  if (!testEnv) {
    return;
  }
  await testEnv.cleanup();
});

describe("firestore.rules", () => {
  it("allows a user to read and write their own profile", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(db, "users/alice/profile/main"), {
        userId: "alice",
        exploreRatio: 0.25,
        updatedAt: new Date().toISOString()
      })
    );

    await assertSucceeds(getDoc(doc(db, "users/alice/profile/main")));
  });

  it("denies reading another user's profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/bob/profile/main"), {
        userId: "bob",
        exploreRatio: 0.25
      });
    });

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "users/bob/profile/main")));
  });

  it("denies all user data access to unauthenticated clients", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice/profile/main")));
    await assertFails(setDoc(doc(db, "users/alice/profile/main"), { userId: "alice" }));
  });

  it("allows only watchlist/rewatch list namespaces", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(db, "users/alice/lists/watchlist/items/movie_1"), {
        title: "Dune",
        mediaType: "movie"
      })
    );

    await assertSucceeds(
      setDoc(doc(db, "users/alice/lists/rewatch/items/movie_2"), {
        title: "Heat",
        mediaType: "movie"
      })
    );

    await assertFails(
      setDoc(doc(db, "users/alice/lists/favorites/items/movie_3"), {
        title: "Invalid namespace",
        mediaType: "movie"
      })
    );
  });

  it("denies client read/write for tmdb_cache", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      setDoc(doc(db, "tmdb_cache/search:inception"), {
        payload: { id: 1 },
        expiresAt: new Date().toISOString()
      })
    );

    await assertFails(getDoc(doc(db, "tmdb_cache/search:inception")));
  });
});
