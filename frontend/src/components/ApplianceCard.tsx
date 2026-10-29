import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Appliance, ApplianceCategory } from '../types';
import { Badge } from './Badge';

interface ApplianceCardProps {
  appliance: Appliance;
  onPress: () => void;
  onQuickQR?: () => void;
}

const getCategoryIcon = (category: ApplianceCategory): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'Air Conditioner':
      return 'snow-outline';
    case 'Refrigerator':
      return 'cube-outline';
    case 'Washing Machine':
      return 'disc-outline';
    case 'Television':
      return 'tv-outline';
    case 'RO Water Purifier':
      return 'water-outline';
    case 'Geyser / Water Heater':
      return 'flame-outline';
    case 'Microwave Oven':
      return 'restaurant-outline';
    case 'Air Purifier':
      return 'leaf-outline';
    case 'Chimney':
      return 'funnel-outline';
    case 'Inverter / UPS':
      return 'battery-charging-outline';
    case 'Vacuum Cleaner':
      return 'color-wand-outline';
    default:
      return 'hardware-chip-outline';
  }
};

export const ApplianceCard: React.FC<ApplianceCardProps> = ({
  appliance,
  onPress,
  onQuickQR,
}) => {
  const icon = getCategoryIcon(appliance.category);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={24} color={COLORS.chaiOrange} />
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.brandText}>{appliance.brand}</Text>
          <Text style={styles.nameText} numberOfLines={1}>
            {appliance.name}
          </Text>
          <Text style={styles.modelText}>Model: {appliance.modelNumber}</Text>
        </View>
        {onQuickQR && (
          <TouchableOpacity
            style={styles.qrButton}
            onPress={onQuickQR}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="qr-code-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <Badge status={appliance.warrantyStatus} />
        {appliance.warrantyDaysRemaining !== null &&
          appliance.warrantyDaysRemaining !== undefined && (
            <Text
              style={[
                styles.daysText,
                appliance.warrantyDaysRemaining <= 30 &&
                  appliance.warrantyDaysRemaining >= 0 && {
                    color: COLORS.warning,
                    fontWeight: '700',
                  },
                appliance.warrantyDaysRemaining < 0 && {
                  color: COLORS.danger,
                },
              ]}
            >
              {appliance.warrantyDaysRemaining > 0
                ? `${appliance.warrantyDaysRemaining} days left`
                : appliance.warrantyDaysRemaining === 0
                ? 'Expires today'
                : 'Expired'}
            </Text>
          )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.chaiOrangeLight,
    borderWidth: 1,
    borderColor: COLORS.chaiOrangeGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  brandText: {
    fontSize: 12,
    color: COLORS.chaiAmber,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  modelText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  qrButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgCardHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
