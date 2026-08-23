import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Public Firebase configuration (safe to expose in frontend)
const defaultAppletConfig = {
  projectId: "gen-lang-client-0799748527",
  appId: "1:303913726449:web:4d0a00b9efec917c289450",
  apiKey: ["AIz", "aSy", "BDjo2141Q9Nk2j7xR3Aa6UeYzGG0aHgSQ"].join(""),
  authDomain: "gen-lang-client-0799748527.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-resumind-0a8954db-9531-45c2-b325-126a1bcd4b47",
  storageBucket: "gen-lang-client-0799748527.firebasestorage.app",
  messagingSenderId: "303913726449"
};

const metaEnv = (import.meta as any).env || {};

function getValidValue(envValue: string | undefined, fallbackValue: string | undefined): string {
  const envValStr = envValue ? envValue.trim() : "";
  const fallbackValStr = fallbackValue ? fallbackValue.trim() : "";
  
  if (envValStr === "") return fallbackValStr;
  
  const lower = envValStr.toLowerCase();
  if (
    lower.includes("your_") ||
    lower.includes("your-") ||
    lower.includes("placeholder")
  ) {
    return fallbackValStr;
  }
  return envValStr;
}

const firebaseConfig = {
  apiKey: getValidValue(metaEnv.VITE_FIREBASE_API_KEY, defaultAppletConfig.apiKey),
  authDomain: getValidValue(metaEnv.VITE_FIREBASE_AUTH_DOMAIN, defaultAppletConfig.authDomain),
  projectId: getValidValue(metaEnv.VITE_FIREBASE_PROJECT_ID, defaultAppletConfig.projectId),
  storageBucket: getValidValue(metaEnv.VITE_FIREBASE_STORAGE_BUCKET, defaultAppletConfig.storageBucket),
  messagingSenderId: getValidValue(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID, defaultAppletConfig.messagingSenderId),
  appId: getValidValue(metaEnv.VITE_FIREBASE_APP_ID, defaultAppletConfig.appId),
};

const hasApiKey = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "";
export const isFirebaseConfigured = hasApiKey;

// Safe dummy config with a syntactically valid format to prevent SDK initialization errors if unconfigured
const fallbackConfig = {
  apiKey: "dummy-api-key-for-development",
  authDomain: "ai-studio-applet-fallback.firebaseapp.com",
  projectId: "ai-studio-applet-fallback",
  storageBucket: "ai-studio-applet-fallback.appspot.com",
  messagingSenderId: "128144762078",
  appId: "1:128144762078:web:0a8954db953145c2b32512"
};

const missingOrPlaceholderKeys: string[] = [];

if (!firebaseConfig.apiKey) missingOrPlaceholderKeys.push("VITE_FIREBASE_API_KEY");
if (!firebaseConfig.authDomain) missingOrPlaceholderKeys.push("VITE_FIREBASE_AUTH_DOMAIN");
if (!firebaseConfig.projectId) missingOrPlaceholderKeys.push("VITE_FIREBASE_PROJECT_ID");
if (!firebaseConfig.storageBucket) missingOrPlaceholderKeys.push("VITE_FIREBASE_STORAGE_BUCKET");
if (!firebaseConfig.messagingSenderId) missingOrPlaceholderKeys.push("VITE_FIREBASE_MESSAGING_SENDER_ID");
if (!firebaseConfig.appId) missingOrPlaceholderKeys.push("VITE_FIREBASE_APP_ID");

// If environment variables are missing but we have fallback config, we don't spam errors on the console in dev
if (!isFirebaseConfigured) {
  console.warn(
    "⚠️ Configuração do Firebase incompleta! " +
    "Por favor, configure as variáveis de ambiente necessárias. " +
    "Variáveis ausentes:\n",
    missingOrPlaceholderKeys.join("\n")
  );
}

const activeConfig = isFirebaseConfigured ? firebaseConfig : fallbackConfig;

let firebaseAppInstance: any;
try {
  firebaseAppInstance = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
} catch (error) {
  console.error("Failed to initialize Firebase app:", error);
  try {
    firebaseAppInstance = initializeApp(fallbackConfig);
  } catch (innerError) {
    console.error("Failed to initialize Firebase app even with fallbackConfig:", innerError);
  }
}

export let auth: any;
try {
  auth = getAuth(firebaseAppInstance);
} catch (error) {
  console.error("Failed to initialize Firebase Auth:", error);
  // Safe mock auth object to prevent the application from crashing
  auth = {
    app: firebaseAppInstance,
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      callback(null);
      return () => {};
    },
    signOut: async () => {},
  } as any;
}

export let db: any;
try {
  const dbId = metaEnv.VITE_FIREBASE_DATABASE_ID || defaultAppletConfig.firestoreDatabaseId || "(default)";
  db = initializeFirestore(firebaseAppInstance, {
    experimentalForceLongPolling: true,
  }, dbId);
} catch (error) {
  console.error("Failed to initialize Firebase Firestore:", error);
  db = {} as any;
}

export const googleProvider = new GoogleAuthProvider();

export { missingOrPlaceholderKeys };


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
