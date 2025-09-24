import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBeqU37f2wdYLjh0IiqeO9-VxZQ3WNtrqc",
  authDomain: "appointment-scheduler-a215a.firebaseapp.com",
  projectId: "appointment-scheduler-a215a",
  storageBucket: "appointment-scheduler-a215a.firebasestorage.app",
  messagingSenderId: "691602579895",
  appId: "1:691602579895:web:c5a85e7f1988b2f2c08832",
  measurementId: "G-N4WLWB88C9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - simplified for now
const auth: Auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export { auth };
export default app;