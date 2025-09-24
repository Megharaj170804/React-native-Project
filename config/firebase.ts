import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy*************
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=appointment-scheduler-a215a.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=appointment-scheduler-a215a
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=appointment-scheduler-a215a.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=691602579895
EXPO_PUBLIC_FIREBASE_APP_ID=1:691602579895:web:c5a85e7f1988b2f2c08832
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-N4WLWB88C9

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - simplified for now
const auth: Auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export { auth };
export default app;
