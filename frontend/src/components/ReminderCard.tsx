import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Reminder } from '../types';

interface ReminderCardProps {
  reminder: Reminder;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onComplete,
  onDismiss,
}) => {
  const isWarranty = reminder.type === 'warranty_expiry';
  const icon = isWarranty ? 'shield-checkmark-outline' : 'construct-outline';
  const iconColor = isWarranty ? COLORS.warning : COLORS.chaiOrange;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (err: any) {
      console.warn('[ReminderCard] Date parse fallback:', err?.message || err);
      return dateStr;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.titleText} numberOfLines={2}>
            {reminder.title}
          </Text>
          <Text style={styles.applianceSubText}>{reminder.applianceName}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.dateText}>Due: {formatDate(reminder.dueAt)}</Text>
        </View>

        {reminder.status === 'pending' && (
          <View style={styles.actionsRow}>
            {onDismiss && (
              <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
                <Ionicons name="close-circle-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            )}
            {onComplete && (
              <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                <Text style={styles.completeText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  applianceSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.bgCardHover,
  },
  dismissText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.goodConditionLight,
  },
  completeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '700',
  },
});
