import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDbZMIDiauJorWjwdm3EwrDzvgDP9V9xvc",
  authDomain: "universal-dashboard-a374a.firebaseapp.com",
  projectId: "universal-dashboard-a374a",
  storageBucket: "universal-dashboard-a374a.firebasestorage.app",
  messagingSenderId: "7578952558",
  appId: "1:7578952558:web:ff6388031637821e48577f",
  measurementId: "G-CEMZM1DYDP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;