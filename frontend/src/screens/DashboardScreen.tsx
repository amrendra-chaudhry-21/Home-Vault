import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { StatCard } from '../components/StatCard';
import { ReminderCard } from '../components/ReminderCard';
import { ServiceRecordCard } from '../components/ServiceRecordCard';
import { api } from '../services/api';
import { storageService } from '../services/storage';
import { DashboardData, Household, Reminder, ServiceRecord } from '../types';

interface DashboardScreenProps {
  household: Household | null;
  refreshTrigger?: number;
  onNavigateAppliances: () => void;
  onNavigateReminders: () => void;
  onAddAppliance: () => void;
  onSelectAppliance: (id: string) => void;
  onScanQR: () => void;
}

// In-memory cache to ensure zero-lag instant screen renders
const dashboardCache: Record<string, DashboardData> = {};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  household,
  refreshTrigger,
  onNavigateAppliances,
  onNavigateReminders,
  onAddAppliance,
  onSelectAppliance,
  onScanQR,
}) => {
  const cached = household ? dashboardCache[household.id] : null;
  const [data, setData] = useState<DashboardData | null>(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  // Restore persistent disk cache immediately on mount
  useEffect(() => {
    if (!household || data) return;
    storageService.getCache<DashboardData>(`dashboard_${household.id}`).then((saved) => {
      if (saved) {
        dashboardCache[household.id] = saved;
        setData(saved);
        setLoading(false);
      }
    });
  }, [household, data]);

  const loadDashboard = useCallback(async () => {
    if (!household) return;
    try {
      const res = await api.getDashboard(household.id);
      dashboardCache[household.id] = res;
      storageService.saveCache(`dashboard_${household.id}`, res).catch(() => {});
      setData(res);
    } catch (err: any) {
      console.warn('Could not load dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const stats = data?.stats || {
    totalAppliances: 0,
    expiringSoonCount: 0,
    upcomingRemindersCount: 0,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.chaiOrange}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View style={styles.headerGreeting}>
          <Text style={styles.greetingText}>Welcome Home</Text>
          <Text style={styles.householdName} numberOfLines={1}>
            {household?.name || 'My Household'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scanQuickButton}
            onPress={onScanQR}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={17} color={COLORS.chaiOrange} />
            <Text style={styles.scanQuickButtonText}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addQuickButton}
            onPress={onAddAppliance}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#0A0A0A" />
            <Text style={styles.addQuickButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Appliances"
          value={stats.totalAppliances}
          iconName="hardware-chip-outline"
          accentColor={COLORS.chaiOrange}
        />
        <StatCard
          label="Expiring (30d)"
          value={stats.expiringSoonCount}
          iconName="shield-half-outline"
          accentColor={stats.expiringSoonCount > 0 ? COLORS.warning : COLORS.goodCondition}
        />
      </View>

      {/* Warranties Expiring Soon Banner / Section */}
      {data?.expiringSoon && data.expiringSoon.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
              <Text style={styles.sectionTitle}>Warranties Expiring Soon</Text>
            </View>
            <TouchableOpacity onPress={onNavigateAppliances}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {data.expiringSoon.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={styles.alertCard}
              onPress={() => onSelectAppliance(item.id)}
            >
              <View style={styles.alertCol}>
                <Text style={styles.alertName}>{item.name}</Text>
                <Text style={styles.alertSub}>{item.brand} • {item.category}</Text>
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysBadgeText}>
                  {item.daysRemaining > 0 ? `${item.daysRemaining} days left` : 'Expires today'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upcoming Reminders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.chaiOrange} />
            <Text style={styles.sectionTitle}>Upcoming Maintenance & Reminders</Text>
          </View>
          <TouchableOpacity onPress={onNavigateReminders}>
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {data?.upcomingReminders && data.upcomingReminders.length > 0 ? (
          data.upcomingReminders.map((rem: any) => (
            <ReminderCard
              key={rem.id}
              reminder={rem as Reminder}
              onComplete={async () => {
                await api.updateReminderStatus(rem.id, 'completed');
                loadDashboard();
              }}
              onDismiss={async () => {
                await api.updateReminderStatus(rem.id, 'dismissed');
                loadDashboard();
              }}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={36} color={COLORS.goodCondition} />
            <Text style={styles.emptyText}>All caught up! No pending maintenance alerts.</Text>
          </View>
        )}
      </View>

      {/* Recent Repairs & Services Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="construct-outline" size={18} color={COLORS.info} />
            <Text style={styles.sectionTitle}>Recent Repairs & Servicing</Text>
          </View>
        </View>

        {data?.recentServices && data.recentServices.length > 0 ? (
          data.recentServices.map((svc: any) => (
            <ServiceRecordCard key={svc.id} service={svc as ServiceRecord} />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="build-outline" size={32} color={COLORS.textDarkMuted} />
            <Text style={styles.emptyText}>No recent service records logged yet.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  content: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  headerGreeting: {
    flex: 1,
    marginRight: 6,
  },
  greetingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  householdName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: 'rgba(254, 110, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.4)',
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  scanQuickButtonText: {
    color: COLORS.chaiOrange,
    fontWeight: '800',
    fontSize: 13,
  },
  addQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: COLORS.chaiOrange,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addQuickButtonText: {
    color: '#0A0A0A',
    fontWeight: '800',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.chaiOrange,
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: COLORS.bgCard,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alertCol: {
    flex: 1,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  alertSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  daysBadge: {
    backgroundColor: COLORS.defectCrackLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysBadgeText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
