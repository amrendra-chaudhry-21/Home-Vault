import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { WarrantyStatus } from '../types';

interface BadgeProps {
  status?: WarrantyStatus | string;
  label?: string;
  color?: string;
  bgColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, color, bgColor }) => {
  let displayLabel = label || status || '';
  let textColor = color || COLORS.textPrimary;
  let background = bgColor || COLORS.bgCardHover;

  if (status === 'ACTIVE') {
    displayLabel = 'Active Warranty';
    textColor = COLORS.success;
    background = COLORS.goodConditionLight;
  } else if (status === 'EXPIRING_SOON') {
    displayLabel = 'Expiring Soon';
    textColor = COLORS.warning;
    background = COLORS.defectCrackLight;
  } else if (status === 'EXPIRED') {
    displayLabel = 'Expired';
    textColor = COLORS.danger;
    background = COLORS.defectPotholeLight;
  } else if (status === 'UNKNOWN') {
    displayLabel = 'No Warranty';
    textColor = COLORS.textMuted;
    background = 'rgba(161, 161, 170, 0.15)';
  }

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.text, { color: textColor }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
