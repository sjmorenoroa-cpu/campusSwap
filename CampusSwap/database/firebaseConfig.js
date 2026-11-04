import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Credenciales del proyecto CampusSwap en Firebase (console.firebase.google.com)
const firebaseConfig = {
  apiKey: 'AIzaSyA1WOLUp0DcpCtxRJLX23wHR-3m7_tdY74',
  authDomain: 'campusswap-9641a.firebaseapp.com',
  projectId: 'campusswap-9641a',
  storageBucket: 'campusswap-9641a.firebasestorage.app',
  messagingSenderId: '632294233292',
  appId: '1:632294233292:web:65b66564f40946f7f15e69',
};

const app = initializeApp(firebaseConfig);

// db: la conexión a Cloud Firestore que vamos a usar en toda la app
export const db = getFirestore(app);
