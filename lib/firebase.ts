import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAfLY0MrsseTHJ7yZg8uxwUvRPXKehd73Y",
  authDomain: "xstream1-60177.firebaseapp.com",
  projectId: "xstream1-60177",
  storageBucket: "xstream1-60177.firebasestorage.app",
  messagingSenderId: "672677425882",
  appId: "1:672677425882:web:c4aa610cf2b4b5e4c72be3",
  measurementId: "G-BCBZQMP2FD",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
