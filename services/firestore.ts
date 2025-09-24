import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/config/firebase';
import { Appointment, AppConfig } from '@/types/appointment';

export const appointmentsCollection = collection(db, 'appointments');
export const configCollection = collection(db, 'config');

// Appointments
export const createAppointment = async (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
  try {
    // Check if slot is already booked
    const existingAppointments = await getAppointmentsByDate(appointment.date);
    const conflictingAppointment = existingAppointments.find(
      apt => apt.time === appointment.time && apt.status === 'booked'
    );
    
    if (conflictingAppointment) {
      throw new Error('This time slot is already booked. Please select another time.');
    }
    
    const docRef = await addDoc(appointmentsCollection, {
      ...appointment,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      throw new Error('Unable to book appointment due to server configuration. Please contact the administrator.');
    }
    throw error;
  }
};

export const getAppointmentsByDate = async (date: string): Promise<Appointment[]> => {
  try {
    const q = query(appointmentsCollection, where('date', '==', date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    if (error.code === 'permission-denied') {
      console.warn('Firestore permissions denied - returning empty appointments list');
    }
    return []; // Return empty array on error
  }
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
  try {
    // Simple query without compound ordering to avoid index requirement
    const querySnapshot = await getDocs(appointmentsCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
  } catch (error: any) {
    console.error('Error fetching all appointments:', error);
    if (error.code === 'permission-denied') {
      console.warn('Firestore permissions denied - returning empty appointments list');
    }
    return []; // Return empty array on error
  }
};

export const subscribeToAppointments = (date: string, callback: (appointments: Appointment[]) => void) => {
  const q = query(appointmentsCollection, where('date', '==', date));
  return onSnapshot(q, (snapshot) => {
    try {
      const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      callback(appointments);
    } catch (error) {
      console.error('Error in appointment subscription:', error);
      // Return empty array on error
      callback([]);
    }
  }, (error) => {
    console.error('Firestore subscription error:', error);
    // Return empty array on error
    callback([]);
  });
};

export const deleteAppointment = async (id: string) => {
  try {
    await deleteDoc(doc(appointmentsCollection, id));
    console.log('Appointment deleted successfully:', id);
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Admin authentication required to delete appointments.');
    }
    throw error;
  }
};

export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
  await updateDoc(doc(appointmentsCollection, id), data);
};

// Config
export const getAppConfig = async (): Promise<AppConfig> => {
  try {
    const configDoc = await getDoc(doc(configCollection, 'settings'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      return { id: configDoc.id, ...data } as AppConfig;
    }
  } catch (error) {
    console.error('Error fetching config:', error);
  }
  
  // Return default config if none exists or on error
  const defaultConfig: AppConfig = {
    slotDuration: 30,
    startTime: '09:00',
    endTime: '21:00',
    blockedSlots: [],
  };
  
  // Try to create the default config in Firestore
  try {
    await createDefaultConfig();
  } catch (error) {
    console.log('Could not save default config to Firestore, using local default');
  }
  
  return defaultConfig;
};

export const updateAppConfig = async (config: AppConfig) => {
  try {
    const configRef = doc(configCollection, 'settings');
    const { id, ...configData } = config;
    await updateDoc(configRef, configData);
    console.log('App config updated successfully');
  } catch (error: any) {
    console.error('Error updating app config:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Admin authentication required to update configuration.');
    }
    throw error;
  }
};

export const createDefaultConfig = async () => {
  const defaultConfig: AppConfig = {
    slotDuration: 30,
    startTime: '09:00',
    endTime: '21:00',
    blockedSlots: [],
  };
  
  try {
    const configRef = doc(configCollection, 'settings');
    await setDoc(configRef, defaultConfig);
    console.log('Default config created successfully');
    return defaultConfig;
  } catch (error) {
    console.error('Error creating default config:', error);
    return defaultConfig; // Return default even if save fails
  }
};

// Initialize admin user and default config
export const initializeApp = async () => {
  try {
    // Create admin user
    const adminEmail = 'megharaj@admin.com';
    const adminPassword = 'megharaj@123';
    
    try {
      await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('Admin user created successfully');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('Admin user already exists');
      } else {
        console.error('Error creating admin user:', error);
      }
    }

    // Create default config if it doesn't exist
    const configDoc = await getDoc(doc(configCollection, 'settings'));
    if (!configDoc.exists()) {
      await createDefaultConfig();
      console.log('Default config created');
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
};