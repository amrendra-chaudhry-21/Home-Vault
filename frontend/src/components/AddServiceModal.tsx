import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface AddServiceModalProps {
  visible: boolean;
  applianceName: string;
  onClose: () => void;
  onSubmit: (data: {
    serviceDate: string;
    issueDescription: string;
    workPerformed: string;
    cost?: number;
    technicianName?: string;
    providerName?: string;
    notes?: string;
    nextServiceDate?: string;
  }) => Promise<void>;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  visible,
  applianceName,
  onClose,
  onSubmit,
}) => {
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [issueDescription, setIssueDescription] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [cost, setCost] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [nextMonths, setNextMonths] = useState('6');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!issueDescription.trim()) {
      Alert.alert('Required', 'Please enter issue or reason for service');
      return;
    }
    if (!workPerformed.trim()) {
      Alert.alert('Required', 'Please describe work performed / parts replaced');
      return;
    }

    setLoading(true);
    try {
      let nextServiceDateStr: string | undefined = undefined;
      if (nextMonths && serviceDate) {
        const sDate = new Date(serviceDate);
        if (!isNaN(sDate.getTime())) {
          const nDate = new Date(sDate);
          nDate.setMonth(nDate.getMonth() + parseInt(nextMonths, 10));
          nextServiceDateStr = nDate.toISOString().slice(0, 10);
        }
      }

      await onSubmit({
        serviceDate,
        issueDescription: issueDescription.trim(),
        workPerformed: workPerformed.trim(),
        cost: cost ? parseFloat(cost) : undefined,
        technicianName: technicianName.trim() || undefined,
        providerName: providerName.trim() || undefined,
        notes: notes.trim() || undefined,
        nextServiceDate: nextServiceDateStr,
      });

      // Reset
      setIssueDescription('');
      setWorkPerformed('');
      setCost('');
      setTechnicianName('');
      setProviderName('');
      setNotes('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Record Service & Repair</Text>
              <Text style={styles.subTitle}>{applianceName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Service Date & Cost */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Service Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={serviceDate}
                  onChangeText={setServiceDate}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Cost in INR (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="850"
                  placeholderTextColor={COLORS.textDarkMuted}
                  keyboardType="numeric"
                  value={cost}
                  onChangeText={setCost}
                />
              </View>
            </View>

            {/* Issue Description */}
            <Text style={styles.fieldLabel}>Issue Description *</Text>
            <TextInput
              style={styles.input}
              placeholder="Periodic maintenance, water leakage, cooling issue"
              placeholderTextColor={COLORS.textDarkMuted}
              value={issueDescription}
              onChangeText={setIssueDescription}
            />

            {/* Work Performed */}
            <Text style={styles.fieldLabel}>Work Performed *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Gas recharge, filter replacement, pipe brazing"
              placeholderTextColor={COLORS.textDarkMuted}
              multiline
              numberOfLines={3}
              value={workPerformed}
              onChangeText={setWorkPerformed}
            />

            {/* Technician & Provider */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Technician Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rajesh Kumar"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={technicianName}
                  onChangeText={setTechnicianName}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Agency / Provider</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Urban Company, Brand Service"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={providerName}
                  onChangeText={setProviderName}
                />
              </View>
            </View>

            {/* Next Service Months (Auto-schedules reminder) */}
            <Text style={styles.fieldLabel}>Next Service in (Months)</Text>
            <TextInput
              style={styles.input}
              placeholder="6 (Auto creates reminder)"
              placeholderTextColor={COLORS.textDarkMuted}
              keyboardType="numeric"
              value={nextMonths}
              onChangeText={setNextMonths}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Saving...' : 'Save Service Record'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subTitle: {
    fontSize: 13,
    color: COLORS.chaiOrange,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    height: 'auto',
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.chaiOrange,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
  },
});
