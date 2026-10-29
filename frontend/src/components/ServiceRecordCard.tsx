import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ServiceRecord } from '../types';

interface ServiceRecordCardProps {
  service: ServiceRecord;
}

export const ServiceRecordCard: React.FC<ServiceRecordCardProps> = ({ service }) => {
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
      console.warn('[ServiceRecordCard] Date parse fallback:', err?.message || err);
      return dateStr;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar" size={12} color={COLORS.chaiOrange} />
          <Text style={styles.dateText}>{formatDate(service.serviceDate)}</Text>
        </View>

        {service.cost !== null && service.cost !== undefined && (
          <View style={styles.costBadge}>
            <Text style={styles.costText}>₹{service.cost.toLocaleString('en-IN')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.issueText}>{service.issueDescription}</Text>
      <Text style={styles.workText}>{service.workPerformed}</Text>

      <View style={styles.footer}>
        {service.technicianName || service.providerName ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>
              {[service.technicianName, service.providerName].filter(Boolean).join(' • ')}
            </Text>
          </View>
        ) : null}

        {service.nextServiceDate ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={COLORS.chaiAmber} />
            <Text style={[styles.metaText, { color: COLORS.chaiCream }]}>
              Next: {formatDate(service.nextServiceDate)}
            </Text>
          </View>
        ) : null}
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.chaiOrangeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.chaiOrange,
    fontWeight: '700',
  },
  costBadge: {
    backgroundColor: COLORS.bgCardHover,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  costText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.goodCondition,
  },
  issueText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  workText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
