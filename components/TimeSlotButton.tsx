import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TimeSlot } from '@/types/appointment';
import { formatTime12Hour } from '@/utils/timeSlots';

interface TimeSlotButtonProps {
  slot: TimeSlot;
  onPress: (slot: TimeSlot) => void;
  selected?: boolean;
}

const TimeSlotButton: React.FC<TimeSlotButtonProps> = ({ slot, onPress, selected = false }) => {
  const getButtonStyle = () => {
    if (!slot.available) {
      return slot.status === 'blocked' ? styles.blocked : styles.booked;
    }
    return selected ? styles.selected : styles.available;
  };

  const getTextStyle = () => {
    if (!slot.available) {
      return styles.unavailableText;
    }
    return selected ? styles.selectedText : styles.availableText;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={() => slot.available && onPress(slot)}
      disabled={!slot.available}
    >
      <Text style={getTextStyle()}>
        {formatTime12Hour(slot.time)}
      </Text>
      {!slot.available && (
        <Text style={styles.statusText}>
          {slot.status === 'blocked' ? 'Blocked' : 'Booked'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minWidth: 100,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  available: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  selected: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  booked: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    opacity: 0.6,
  },
  blocked: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    opacity: 0.6,
  },
  availableText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unavailableText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default TimeSlotButton;