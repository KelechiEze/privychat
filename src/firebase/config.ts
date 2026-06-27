import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7Rfv2crvSYOTTklS9bmXeVW-h8rWYQNQ",
  authDomain: "aura-1d75b.firebaseapp.com",
  projectId: "aura-1d75b",
  storageBucket: "aura-1d75b.firebasestorage.app",
  messagingSenderId: "684246778322",
  appId: "1:684246778322:web:adcfc31a226132b5c5480b",
  measurementId: "G-LZFZ30FQS0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;