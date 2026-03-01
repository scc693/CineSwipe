import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | null = null;

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const hasAnyCredentialPart = Boolean(projectId || clientEmail || privateKey);
  const hasAllCredentialParts = Boolean(projectId && clientEmail && privateKey);

  if (hasAllCredentialParts) {
    return { projectId, clientEmail, privateKey };
  }

  if (hasAnyCredentialPart) {
    throw new Error(
      "Incomplete Firebase Admin credentials. Set all of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or omit all three to use default credentials."
    );
  }

  return null;
}

export function getAdminApp(): App {
  if (app) {
    return app;
  }

  if (getApps().length > 0) {
    app = getApps()[0] as App;
    return app;
  }

  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    app = initializeApp({ credential: cert(serviceAccount) });
    return app;
  }

  // In managed runtimes (e.g. App Hosting), ADC can be used without key env vars.
  if (process.env.FIREBASE_PROJECT_ID) {
    app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    return app;
  }

  app = initializeApp();
  return app;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
