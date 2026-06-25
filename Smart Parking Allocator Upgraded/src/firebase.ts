import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBheMDY9dersF7zP9cLMqUNHWPM5D1NtVw",
  authDomain: "gen-lang-client-0484882767.firebaseapp.com",
  projectId: "gen-lang-client-0484882767",
  storageBucket: "gen-lang-client-0484882767.firebasestorage.app",
  messagingSenderId: "509233864620",
  appId: "1:509233864620:web:6bfbf560875c8e429be409"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID
const db = initializeFirestore(app, {}, "ai-studio-9c0e18e7-25d9-4079-a9eb-ab88f5d3c8e5");

export { db };

