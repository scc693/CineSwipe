"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { Auth, GoogleAuthProvider, getAuth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const googleProvider = new GoogleAuthProvider();

let cachedAuth: Auth | null | undefined;

function hasRequiredClientConfig() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth !== undefined) {
    return cachedAuth;
  }

  if (typeof window === "undefined") {
    cachedAuth = null;
    return cachedAuth;
  }

  if (!hasRequiredClientConfig()) {
    cachedAuth = null;
    return cachedAuth;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  cachedAuth = getAuth(app);
  return cachedAuth;
}
