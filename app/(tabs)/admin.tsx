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
  FlatList,
  Modal,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Settings, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAllAppointments, 
  getAppointmentsByDate, 
  getAppConfig, 
  updateAppConfig,
  subscribeToAppointments,
  deleteAppointment,
  updateAppointment 
} from '@/services/firestore';
import { 
  generateTimeSlots, 
  formatDateDDMMYYYY, 
  convertDDMMYYYYtoISO, 
  getTodayDDMMYYYY,
  getTomorrowDDMMYYYY 
} from '@/utils/timeSlots';
import { Appointment, AppConfig, TimeSlot } from '@/types/appointment';

export default function AdminPage() {
  const { user, login, logout, isAdmin, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDDMMYYYY());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'calendar'>('day');

  // Admin credentials
  const ADMIN_USERNAME = 'megharaj';
  const ADMIN_PASSWORD = 'megharaj@123';

  const handleLogin = async () => {
    try {
      await login(username, password);
      // If login succeeds, the user state will be updated by AuthContext
      setUsername('');
      setPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid username or password');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUsername('');
      setPassword('');
      setAppointments([]);
      setTimeSlots([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const loadAppConfig = async () => {
    try {
      const config = await getAppConfig();
      setAppConfig(config);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadDayAppointments = async (date?: string) => {
    setLoading(true);
    try {
      const targetDate = date || selectedDate;
      const isoDate = convertDDMMYYYYtoISO(targetDate);
      const dayAppointments = await getAppointmentsByDate(isoDate);
      
      setAppointments(dayAppointments);
      
      if (appConfig) {
        const booked = dayAppointments
          .filter(apt => apt.status === 'booked')
          .map(apt => apt.time);
        
        const slots = generateTimeSlots(
          appConfig.startTime,
          appConfig.endTime,
          appConfig.slotDuration,
          appConfig.blockedSlots,
          booked
        );
        
        setTimeSlots(slots);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadAllAppointments = async () => {
    setLoading(true);
    try {
      const appointmentList = await getAllAppointments();
      
      // Sort appointments by date and time
      appointmentList.sort((a: Appointment, b: Appointment) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare === 0) {
          return a.time.localeCompare(b.time);
        }
        return dateCompare;
      });
      
      setAppointments(appointmentList);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && selectedDate && appConfig) {
      loadDayAppointments();
    }
  }, [selectedDate, appConfig, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAppConfig();
      loadDayAppointments();
    }
  }, [isAdmin]);

  const handleDateSelect = (direction: 'prev' | 'next' | 'today' | 'custom') => {
    const currentDate = new Date(convertDDMMYYYYtoISO(selectedDate));
    
    switch (direction) {
      case 'prev':
        currentDate.setDate(currentDate.getDate() - 1);
        setSelectedDate(formatDateDDMMYYYY(currentDate));
        break;
      case 'next':
        currentDate.setDate(currentDate.getDate() + 1);
        setSelectedDate(formatDateDDMMYYYY(currentDate));
        break;
      case 'today':
        setSelectedDate(getTodayDDMMYYYY());
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

  const handleSlotAction = (slot: TimeSlot, action: 'block' | 'unblock') => {
    if (!appConfig) return;
    
    Alert.alert(
      `${action === 'block' ? 'Block' : 'Unblock'} Slot`,
      `Are you sure you want to ${action} the ${slot.displayTime} slot?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'block' ? 'Block' : 'Unblock',
          onPress: async () => {
            try {
              let newBlockedSlots = [...appConfig.blockedSlots];
              
              if (action === 'block') {
                if (!newBlockedSlots.includes(slot.time)) {
                  newBlockedSlots.push(slot.time);
                }
              } else {
                newBlockedSlots = newBlockedSlots.filter(time => time !== slot.time);
              }
              
              const updatedConfig = { ...appConfig, blockedSlots: newBlockedSlots };
              await updateAppConfig(updatedConfig);
              setAppConfig(updatedConfig);
              loadDayAppointments();
              
              Alert.alert('Success', `Slot ${action}ed successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} slot`);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    Alert.alert(
      'Delete Appointment',
      `Are you sure you want to delete the appointment for ${appointment.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (appointment.id) {
                await deleteAppointment(appointment.id);
                loadDayAppointments();
                Alert.alert('Success', 'Appointment deleted successfully');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete appointment');
            }
          },
        },
      ]
    );
  };

  const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
    if (!appConfig) return;
    
    try {
      const updatedConfig = { ...appConfig, ...newConfig };
      await updateAppConfig(updatedConfig);
      setAppConfig(updatedConfig);
      loadDayAppointments();
      Alert.alert('Success', 'Configuration updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update configuration');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hour, minute] = timeString.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${hour12}:${minute} ${ampm}`;
  };



  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <View style={styles.loginHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.backButtonText}>← Back to Home</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginForm}>
            <Text style={styles.loginTitle}>Admin Login</Text>
            
            {authLoading && (
              <Text style={styles.loadingText}>Initializing...</Text>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#999"
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, authLoading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={authLoading}
            >
              <Text style={styles.loginButtonText}>
                {authLoading ? 'Please wait...' : 'Login'}
              </Text>
            </TouchableOpacity>

            
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Admin Dashboard</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => setShowSettings(true)}
          >
            <Settings size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => handleDateSelect('prev')}
        >
          <ChevronLeft size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.todayButton} 
          onPress={() => handleDateSelect('today')}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.datePickerButton} 
          onPress={() => handleDateSelect('custom')}
        >
          <Calendar size={16} color="#007AFF" />
          <Text style={styles.dateText}>{selectedDate}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => handleDateSelect('next')}
        >
          <ChevronRight size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{timeSlots.filter(s => s.available).length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{timeSlots.filter(s => s.isBlocked).length}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Time Slots Management */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Time Slots - {selectedDate}</Text>
          <View style={styles.timeSlots}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.time}
                style={[
                  styles.adminTimeSlot,
                  slot.isBooked && styles.bookedSlot,
                  slot.isBlocked && styles.blockedSlot,
                  slot.available && styles.availableSlot,
                ]}
                onLongPress={() => 
                  handleSlotAction(slot, slot.isBlocked ? 'unblock' : 'block')
                }
              >
                <Text style={[
                  styles.slotTime,
                  slot.isBooked && styles.bookedSlotText,
                  slot.isBlocked && styles.blockedSlotText,
                ]}>
                  {slot.displayTime}
                </Text>
                <Text style={styles.slotStatus}>
                  {slot.isBooked ? 'Booked' : slot.isBlocked ? 'Blocked' : 'Available'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Appointments List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Appointments</Text>
          {appointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments for this date</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.patientName}>{appointment.userName}</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAppointment(appointment)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.appointmentPhone}>📞 {appointment.userPhone}</Text>
                <Text style={styles.appointmentDateTime}>
                  🕐 {formatTime(appointment.time)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={styles.closeButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {appConfig && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>Slot Duration</Text>
                <View style={styles.durationButtons}>
                  <TouchableOpacity
                    style={[
                      styles.durationButton,
                      appConfig.slotDuration === 15 && styles.activeDurationButton,
                    ]}
                    onPress={() => handleUpdateConfig({ slotDuration: 15 })}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      appConfig.slotDuration === 15 && styles.activeDurationButtonText,
                    ]}>
                      15 min
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.durationButton,
                      appConfig.slotDuration === 30 && styles.activeDurationButton,
                    ]}
                    onPress={() => handleUpdateConfig({ slotDuration: 30 })}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      appConfig.slotDuration === 30 && styles.activeDurationButtonText,
                    ]}>
                      30 min
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>Working Hours</Text>
                <Text style={styles.workingHours}>
                  {formatTime(appConfig.startTime)} - {formatTime(appConfig.endTime)}
                </Text>
              </View>

              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>Blocked Slots</Text>
                <Text style={styles.blockedSlotsCount}>
                  {appConfig.blockedSlots.length} slots blocked
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
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
  loginContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loginHeader: {
    marginBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  loginForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 25,
    padding: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 35,
    letterSpacing: 0.5,
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
  loginButton: {
    backgroundColor: '#667eea',
    padding: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    marginTop: 1,
  },
  navButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f8f9fa',
  },
  todayButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  todayButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginTop: 2,
    marginHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statCard: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#667eea',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminTimeSlot: {
    padding: 12,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e0e7ff',
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  availableSlot: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.2,
  },
  bookedSlot: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.2,
  },
  blockedSlot: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bookedSlotText: {
    color: '#dc2626',
  },
  blockedSlotText: {
    color: '#d97706',
  },
  slotStatus: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 6,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  appointmentPhone: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  appointmentDateTime: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  settingGroup: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  durationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeDurationButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  activeDurationButtonText: {
    color: 'white',
  },
  workingHours: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  blockedSlotsCount: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});