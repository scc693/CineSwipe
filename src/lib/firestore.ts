import {
  CARD_BATCH_SIZE,
  DOWN_SWIPE_HIDE_DAYS,
  RECOMMENDATION_EXPLORE_RATIO,
  SEEN_POSITIVE_WEIGHT,
  SWIPE_PROFILE_DELTAS
} from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import { mediaKey } from "@/lib/media";
import { tokensFromMedia } from "@/lib/recommendations";
import {
  LibraryItem,
  ListType,
  MediaSummary,
  SeedItem,
  SwipeDirection,
  SwipeEventInput,
  UserProfile
} from "@/lib/types";

interface FirestoreTimestamp {
  toDate?: () => Date;
}

interface InteractionRecord {
  mediaId: number;
  mediaType: "movie" | "tv";
  direction: SwipeDirection;
  media: MediaSummary;
  createdAt: FirestoreTimestamp | Date;
  undone?: boolean;
  appliedDelta?: number;
  appliedListType?: ListType | null;
}

function toIso(value: FirestoreTimestamp | Date | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = value.toDate?.();
  return date ? date.toISOString() : new Date().toISOString();
}

function defaultProfile(uid: string): UserProfile {
  return {
    userId: uid,
    featureWeights: {},
    totalInteractions: 0,
    exploreRatio: RECOMMENDATION_EXPLORE_RATIO,
    profileVersion: 0,
    updatedAt: new Date().toISOString()
  };
}

function applyFeatureDelta(
  weights: Record<string, number>,
  media: Pick<MediaSummary, "genreIds" | "mediaType">,
  delta: number
): Record<string, number> {
  const next = { ...weights };
  for (const token of tokensFromMedia(media)) {
    next[token] = (next[token] ?? 0) + delta;
    if (Math.abs(next[token]) < 0.01) {
      delete next[token];
    }
  }
  return next;
}

function profilePath(uid: string) {
  return `users/${uid}/profile/main`;
}

export async function getOrCreateProfile(uid: string): Promise<UserProfile> {
  const db = getAdminDb();
  const ref = db.doc(profilePath(uid));
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const fresh = defaultProfile(uid);
    await ref.set({ ...fresh, updatedAt: new Date() }, { merge: true });
    return fresh;
  }

  const data = snapshot.data() ?? {};
  return {
    userId: uid,
    featureWeights: (data.featureWeights as Record<string, number>) ?? {},
    totalInteractions: Number(data.totalInteractions ?? 0),
    exploreRatio: Number(data.exploreRatio ?? RECOMMENDATION_EXPLORE_RATIO),
    profileVersion: Number(data.profileVersion ?? 0),
    updatedAt: toIso(data.updatedAt as FirestoreTimestamp | Date | undefined)
  };
}

export async function saveSeeds(uid: string, seeds: SeedItem[]): Promise<UserProfile> {
  const db = getAdminDb();
  const deduped = Array.from(
    new Map(seeds.map((seed) => [mediaKey(seed.mediaType, seed.mediaId), seed])).values()
  );

  const batch = db.batch();
  const seedCollection = db.collection(`users/${uid}/seeds`);

  for (const seed of deduped) {
    batch.set(
      seedCollection.doc(mediaKey(seed.mediaType, seed.mediaId)),
      {
        ...seed,
        createdAt: new Date()
      },
      { merge: true }
    );
  }

  await batch.commit();

  const profileRef = db.doc(profilePath(uid));
  await db.runTransaction(async (tx) => {
    const currentSnapshot = await tx.get(profileRef);
    const current = currentSnapshot.exists
      ? ((currentSnapshot.data() ?? {}) as Partial<UserProfile>)
      : defaultProfile(uid);

    let featureWeights = current.featureWeights ?? {};

    for (const seed of deduped) {
      featureWeights = applyFeatureDelta(
        featureWeights,
        {
          genreIds: seed.genreIds,
          mediaType: seed.mediaType
        },
        2
      );
    }

    tx.set(
      profileRef,
      {
        userId: uid,
        featureWeights,
        totalInteractions: Number(current.totalInteractions ?? 0),
        exploreRatio: Number(current.exploreRatio ?? RECOMMENDATION_EXPLORE_RATIO),
        profileVersion: Number(current.profileVersion ?? 0) + 1,
        updatedAt: new Date()
      },
      { merge: true }
    );
  });

  return getOrCreateProfile(uid);
}

export async function getSeeds(uid: string): Promise<SeedItem[]> {
  const db = getAdminDb();
  const snapshot = await db.collection(`users/${uid}/seeds`).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      mediaId: Number(data.mediaId),
      mediaType: data.mediaType,
      title: data.title,
      genreIds: Array.isArray(data.genreIds) ? data.genreIds.map((id: unknown) => Number(id)) : []
    } as SeedItem;
  });
}

async function hasSeen(uid: string, media: Pick<MediaSummary, "id" | "mediaType">): Promise<boolean> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(`users/${uid}/interactions`)
    .where("mediaId", "==", media.id)
    .where("mediaType", "==", media.mediaType)
    .where("undone", "==", false)
    .limit(20)
    .get();

  return snapshot.docs.some((doc) => {
    const direction = doc.get("direction") as SwipeDirection;
    return direction === "left" || direction === "right";
  });
}

export async function recordSwipe(
  uid: string,
  payload: SwipeEventInput
): Promise<{ profileVersion: number; appliedListType: ListType | null }> {
  const db = getAdminDb();
  const now = new Date();

  const seenBefore = payload.direction === "up" ? await hasSeen(uid, payload.media) : false;
  const appliedListType = payload.direction === "up" ? (seenBefore ? "rewatch" : "watchlist") : null;
  const appliedDelta = payload.direction === "up" && seenBefore
    ? SEEN_POSITIVE_WEIGHT
    : SWIPE_PROFILE_DELTAS[payload.direction];

  const profileRef = db.doc(profilePath(uid));
  const interactionRef = db.collection(`users/${uid}/interactions`).doc();

  let profileVersion = 0;

  await db.runTransaction(async (tx) => {
    const currentProfileSnapshot = await tx.get(profileRef);
    const current = currentProfileSnapshot.exists
      ? ((currentProfileSnapshot.data() ?? {}) as Partial<UserProfile>)
      : defaultProfile(uid);

    const nextWeights = applyFeatureDelta(current.featureWeights ?? {}, payload.media, appliedDelta);
    profileVersion = Number(current.profileVersion ?? 0) + 1;

    tx.set(
      profileRef,
      {
        userId: uid,
        featureWeights: nextWeights,
        totalInteractions: Number(current.totalInteractions ?? 0) + 1,
        exploreRatio: Number(current.exploreRatio ?? RECOMMENDATION_EXPLORE_RATIO),
        profileVersion,
        updatedAt: now
      },
      { merge: true }
    );

    tx.set(interactionRef, {
      userId: uid,
      mediaId: payload.mediaId,
      mediaType: payload.mediaType,
      direction: payload.direction,
      media: payload.media,
      appliedDelta,
      appliedListType,
      hiddenUntil:
        payload.direction === "down"
          ? new Date(now.getTime() + DOWN_SWIPE_HIDE_DAYS * 24 * 60 * 60 * 1000)
          : null,
      undone: false,
      createdAt: now
    });

    if (appliedListType) {
      const listRef = db.doc(
        `users/${uid}/lists/${appliedListType}/items/${mediaKey(payload.mediaType, payload.mediaId)}`
      );
      tx.set(
        listRef,
        {
          ...payload.media,
          mediaId: payload.mediaId,
          mediaType: payload.mediaType,
          listType: appliedListType,
          addedAt: now
        },
        { merge: true }
      );
    }

    if (payload.direction === "down") {
      const hiddenRef = db.doc(`users/${uid}/hidden/${mediaKey(payload.mediaType, payload.mediaId)}`);
      tx.set(hiddenRef, {
        mediaId: payload.mediaId,
        mediaType: payload.mediaType,
        hiddenUntil: new Date(now.getTime() + DOWN_SWIPE_HIDE_DAYS * 24 * 60 * 60 * 1000),
        createdAt: now
      });
    }
  });

  return { profileVersion, appliedListType };
}

export async function undoLastSwipe(uid: string): Promise<{ restored: boolean; profileVersion: number }> {
  const db = getAdminDb();
  const profileRef = db.doc(profilePath(uid));

  const snapshot = await db
    .collection(`users/${uid}/interactions`)
    .where("undone", "==", false)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { restored: false, profileVersion: (await getOrCreateProfile(uid)).profileVersion };
  }

  const interactionDoc = snapshot.docs[0];
  let profileVersion = 0;

  await db.runTransaction(async (tx) => {
    const interaction = tx.get(interactionDoc.ref);
    const profileSnapshot = tx.get(profileRef);

    const [interactionResolved, profileResolved] = await Promise.all([interaction, profileSnapshot]);

    const data = interactionResolved.data() as InteractionRecord | undefined;
    if (!data) {
      return;
    }

    const profile = profileResolved.exists
      ? ((profileResolved.data() ?? {}) as Partial<UserProfile>)
      : defaultProfile(uid);

    const delta = Number(data.appliedDelta ?? SWIPE_PROFILE_DELTAS[data.direction]);
    const nextWeights = applyFeatureDelta(profile.featureWeights ?? {}, data.media, -delta);

    profileVersion = Number(profile.profileVersion ?? 0) + 1;

    tx.set(
      profileRef,
      {
        userId: uid,
        featureWeights: nextWeights,
        totalInteractions: Math.max(0, Number(profile.totalInteractions ?? 0) - 1),
        exploreRatio: Number(profile.exploreRatio ?? RECOMMENDATION_EXPLORE_RATIO),
        profileVersion,
        updatedAt: new Date()
      },
      { merge: true }
    );

    tx.set(
      interactionResolved.ref,
      {
        undone: true,
        undoneAt: new Date()
      },
      { merge: true }
    );

    const listType = data.appliedListType;
    if (listType) {
      const listRef = db.doc(`users/${uid}/lists/${listType}/items/${mediaKey(data.mediaType, data.mediaId)}`);
      tx.delete(listRef);
    }

    if (data.direction === "down") {
      const hiddenRef = db.doc(`users/${uid}/hidden/${mediaKey(data.mediaType, data.mediaId)}`);
      tx.delete(hiddenRef);
    }
  });

  return { restored: true, profileVersion };
}

export async function getRecentSignals(
  uid: string,
  limit = CARD_BATCH_SIZE * 5
): Promise<Array<{ mediaType: "movie" | "tv"; direction: SwipeDirection; genreIds: number[] }>> {
  const db = getAdminDb();

  const snapshot = await db
    .collection(`users/${uid}/interactions`)
    .where("undone", "==", false)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as InteractionRecord;
    return {
      mediaType: data.mediaType,
      direction: data.direction,
      genreIds: Array.isArray(data.media?.genreIds) ? data.media.genreIds : []
    };
  });
}

export async function getSeenOrSwipedMediaKeys(uid: string): Promise<Set<string>> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(`users/${uid}/interactions`)
    .where("undone", "==", false)
    .orderBy("createdAt", "desc")
    .limit(1000)
    .get();

  return new Set(
    snapshot.docs.map((doc) => mediaKey(String(doc.get("mediaType")) as "movie" | "tv", Number(doc.get("mediaId"))))
  );
}

export async function getHiddenMediaKeys(uid: string): Promise<Set<string>> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(`users/${uid}/hidden`)
    .where("hiddenUntil", ">", new Date())
    .get();

  return new Set(
    snapshot.docs.map((doc) => mediaKey(String(doc.get("mediaType")) as "movie" | "tv", Number(doc.get("mediaId"))))
  );
}

export async function getLibraryItems(
  uid: string,
  listType: ListType,
  mediaType: "all" | "movie" | "tv",
  genre?: number
): Promise<LibraryItem[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(`users/${uid}/lists/${listType}/items`)
    .orderBy("addedAt", "desc")
    .get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: Number(data.mediaId ?? data.id),
      mediaType: data.mediaType,
      title: data.title,
      posterUrl: data.posterUrl ?? null,
      overview: data.overview ?? "",
      rating: data.rating ?? null,
      genreIds: Array.isArray(data.genreIds) ? data.genreIds.map((id: unknown) => Number(id)) : [],
      releaseDate: data.releaseDate ?? null,
      listType,
      addedAt: toIso(data.addedAt as FirestoreTimestamp | Date | undefined)
    } as LibraryItem;
  });

  return items.filter((item) => {
    if (mediaType !== "all" && item.mediaType !== mediaType) {
      return false;
    }
    if (genre !== undefined && !item.genreIds.includes(genre)) {
      return false;
    }
    return true;
  });
}
