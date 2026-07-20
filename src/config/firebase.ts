import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDjL9-jZ4dlmU8DxQ7lB0JmQk4tEtE5Rzo",
  authDomain: "medisure-8370d.firebaseapp.com",
  projectId: "medisure-8370d",
  storageBucket: "medisure-8370d.firebasestorage.app",
  messagingSenderId: "460059587803",
  appId: "1:460059587803:web:e0198d655d6aa9f0e7c8fe"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;