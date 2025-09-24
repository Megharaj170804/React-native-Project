import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { createAppointment, getAppointmentsByDate, getAppConfig, subscribeToAppointments } from '@/services/firestore';
import { generateTimeSlots, formatDateDDMMYYYY, convertDDMMYYYYtoISO, convertISOtoDDMMYYYY, getTodayDDMMYYYY, getTomorrowDDMMYYYY } from '@/utils/timeSlots';
import { TimeSlot, AppConfig } from '@/types/appointment';

export default function HomePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDDMMYYYY());
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Load app configuration and time slots
  useEffect(() => {
    loadAppConfig();
  }, []);

  // Load appointments for selected date
  useEffect(() => {
    if (selectedDate && appConfig) {
      loadTimeSlots();
      subscribeToDateAppointments();
    }
  }, [selectedDate, appConfig]);

  const loadAppConfig = async () => {
    try {
      const config = await getAppConfig();
      setAppConfig(config);
    } catch (error) {
      console.error('Error loading config:', error);
      // Use default config
      setAppConfig({
        slotDuration: 30,
        startTime: '09:00',
        endTime: '21:00',
        blockedSlots: [],
      });
    }
  };

  const loadTimeSlots = async () => {
    if (!appConfig) return;
    
    try {
      const isoDate = convertDDMMYYYYtoISO(selectedDate);
      const appointments = await getAppointmentsByDate(isoDate);
      const booked = appointments
        .filter(apt => apt.status === 'booked')
        .map(apt => apt.time);
      
      setBookedSlots(booked);
      
      const slots = generateTimeSlots(
        appConfig.startTime,
        appConfig.endTime,
        appConfig.slotDuration,
        appConfig.blockedSlots,
        booked
      );
      
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
    }
  };

  const subscribeToDateAppointments = () => {
    if (!selectedDate) return;
    
    const isoDate = convertDDMMYYYYtoISO(selectedDate);
    return subscribeToAppointments(isoDate, (appointments) => {
      const booked = appointments
        .filter(apt => apt.status === 'booked')
        .map(apt => apt.time);
      
      setBookedSlots(booked);
      
      if (appConfig) {
        const slots = generateTimeSlots(
          appConfig.startTime,
          appConfig.endTime,
          appConfig.slotDuration,
          appConfig.blockedSlots,
          booked
        );
        setTimeSlots(slots);
      }
    });
  };

  const handleBookAppointment = async () => {
    if (!name.trim() || !phone.trim() || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Check if slot is still available
    const selectedSlot = timeSlots.find(slot => slot.time === selectedTime);
    if (!selectedSlot || !selectedSlot.available) {
      Alert.alert('Error', 'This time slot is no longer available. Please select another time.');
      return;
    }

    setLoading(true);
    try {
      const isoDate = convertDDMMYYYYtoISO(selectedDate);
      await createAppointment({
        userName: name.trim(),
        userPhone: phone.trim(),
        date: isoDate,
        time: selectedTime,
        status: 'booked',
      });

      Alert.alert('Success', 'Appointment booked successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setName('');
            setPhone('');
            setSelectedTime('');
            // Keep the selected date for user convenience
          },
        },
      ]);
    } catch (error: any) {
      if (error.message.includes('already booked')) {
        Alert.alert('Already Booked', 'This time slot is already booked. Please select another time.');
      } else {
        Alert.alert('Error', 'Failed to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (type: 'today' | 'tomorrow' | 'custom') => {
    switch (type) {
      case 'today':
        setSelectedDate(getTodayDDMMYYYY());
        break;
      case 'tomorrow':
        setSelectedDate(getTomorrowDDMMYYYY());
        break;
      case 'custom':
        setShowDatePicker(true);
        break;
    }
  };

  const handleDatePickerChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(formatDateDDMMYYYY(date));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Book Your Appointment</Text>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
          >
            <Text style={styles.adminButtonText}>Admin Login</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Date</Text>
            <View style={styles.dateButtons}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  selectedDate === getTodayDDMMYYYY() && styles.selectedDateButton,
                ]}
                onPress={() => handleDateSelect('today')}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    selectedDate === getTodayDDMMYYYY() && styles.selectedDateButtonText,
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  selectedDate === getTomorrowDDMMYYYY() && styles.selectedDateButton,
                ]}
                onPress={() => handleDateSelect('tomorrow')}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    selectedDate === getTomorrowDDMMYYYY() && styles.selectedDateButtonText,
                  ]}
                >
                  Tomorrow
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => handleDateSelect('custom')}
              >
                <Calendar size={16} color="#007AFF" />
                <Text style={styles.datePickerButtonText}>Pick Date</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateText}>Selected: {selectedDate}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Available Time Slots</Text>
            <View style={styles.timeSlots}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.timeSlot,
                    selectedTime === slot.time && styles.selectedTimeSlot,
                    !slot.available && styles.unavailableTimeSlot,
                  ]}
                  onPress={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedTime === slot.time && styles.selectedTimeSlotText,
                      !slot.available && styles.unavailableTimeSlotText,
                    ]}
                  >
                    {slot.displayTime}
                  </Text>
                  {slot.isBooked && (
                    <Text style={styles.bookedText}>Booked</Text>
                  )}
                  {slot.isBlocked && (
                    <Text style={styles.blockedText}>Blocked</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {timeSlots.length === 0 && (
              <Text style={styles.noSlotsText}>Loading available slots...</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.bookButton, loading && styles.bookButtonDisabled]}
            onPress={handleBookAppointment}
            disabled={loading}
          >
            <Text style={styles.bookButtonText}>
              {loading ? 'Booking...' : 'Book Appointment'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDatePickerChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  adminButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  adminButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 15,
    padding: 18,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    color: '#2c3e50',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e8f0fe',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTimeSlot: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
  },
  timeSlotText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedTimeSlotText: {
    color: 'white',
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0.1,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e8f0fe',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '700',
  },
  selectedDateButtonText: {
    color: 'white',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 5,
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedDateContainer: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    textAlign: 'center',
  },
  unavailableTimeSlot: {
    backgroundColor: '#f8f8f8',
    opacity: 0.5,
  },
  unavailableTimeSlotText: {
    color: '#999',
  },
  bookedText: {
    fontSize: 10,
    color: '#dc3545',
    fontWeight: '600',
    marginTop: 2,
  },
  blockedText: {
    fontSize: 10,
    color: '#ffc107',
    fontWeight: '600',
    marginTop: 2,
  },
  noSlotsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});