export interface Appointment {
  id?: string;
  date: string;
  time: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  status: 'booked' | 'blocked' | 'available';
  createdAt: Date;
}

export interface AppConfig {
  id?: string;
  slotDuration: 15 | 30;
  startTime: string;
  endTime: string;
  blockedSlots: string[];
}

export interface TimeSlot {
  time: string;
  displayTime: string;
  available: boolean;
  isBlocked?: boolean;
  isBooked?: boolean;
  appointmentId?: string;
}