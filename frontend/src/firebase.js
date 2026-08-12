import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyARLDY745SB9xP5o4G4k3H1sNzl7pPXKl0",
  authDomain: "bargaincart.firebaseapp.com",
  databaseURL: "https://bargaincart-default-rtdb.firebaseio.com",
  projectId: "bargaincart",
  storageBucket: "bargaincart.firebasestorage.app",
  messagingSenderId: "247461369781",
  appId: "1:247461369781:web:a767c267952cbfc2c52bfc",
  measurementId: "G-LZ7V0SR39F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);