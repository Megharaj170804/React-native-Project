import { AppConfig, TimeSlot, Appointment } from '@/types/appointment';

export const generateTimeSlots = (
  startTime: string = '09:00',
  endTime: string = '21:00',
  duration: number = 30,
  blockedSlots: string[] = [],
  bookedSlots: string[] = []
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += duration) {
    const hour = Math.floor(minutes / 60);
    const min = minutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayTime = `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
    
    const isBlocked = blockedSlots.includes(timeString);
    const isBooked = bookedSlots.includes(timeString);
    
    slots.push({
      time: timeString,
      displayTime,
      available: !isBlocked && !isBooked,
      isBlocked,
      isBooked
    });
  }
  
  return slots;
};

// Helper function to format date as DD/MM/YYYY
export const formatDateDDMMYYYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
export const convertDDMMYYYYtoISO = (dateStr: string): string => {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Helper to convert YYYY-MM-DD to DD/MM/YYYY
export const convertISOtoDDMMYYYY = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Get today's date in DD/MM/YYYY format
export const getTodayDDMMYYYY = (): string => {
  return formatDateDDMMYYYY(new Date());
};

// Get tomorrow's date in DD/MM/YYYY format
export const getTomorrowDDMMYYYY = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateDDMMYYYY(tomorrow);
};

const parseTime = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const parseDate = (dateString: string): Date => {
  const [day, month, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day);
};

export const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};