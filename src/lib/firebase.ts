import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCdSW5ow5o4vJnOJdtclnyHLiLt8zC9GCE",
  authDomain: "pos-2025.firebaseapp.com",
  databaseURL: "https://pos-2025-default-rtdb.firebaseio.com",
  projectId: "pos-2025",
  storageBucket: "pos-2025.firebasestorage.app",
  messagingSenderId: "150248039708",
  appId: "1:150248039708:web:f269209c4a0aff3ee586d9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);