import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ReminderCard } from '../components/ReminderCard';
import { api } from '../services/api';
import { Household, Reminder } from '../types';

interface RemindersScreenProps {
  household: Household | null;
}

export const RemindersScreen: React.FC<RemindersScreenProps> = ({ household }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReminders = useCallback(async () => {
    if (!household) return;
    try {
      const items = await api.getReminders(household.id, activeTab);
      setReminders(items);
    } catch (err: any) {
      console.warn('Could not load reminders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household, activeTab]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReminders();
  };

  const handleComplete = async (id: string) => {
    try {
      await api.updateReminderStatus(id, 'completed');
      loadReminders();
    } catch (err: any) {
      console.warn('[RemindersScreen] Failed to complete reminder:', err);
      Alert.alert('Update Failed', err?.message || 'Could not mark reminder as completed. Please try again.');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.updateReminderStatus(id, 'dismissed');
      loadReminders();
    } catch (err: any) {
      console.warn('[RemindersScreen] Failed to dismiss reminder:', err);
      Alert.alert('Update Failed', err?.message || 'Could not dismiss reminder. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Maintenance & Warranty Alerts</Text>
        <Text style={styles.subtitle}>Scheduled alerts for your home appliances</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Active Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed History
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.chaiOrange} />
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.chaiOrange}
            />
          }
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              onComplete={activeTab === 'pending' ? () => handleComplete(item.id) : undefined}
              onDismiss={activeTab === 'pending' ? () => handleDismiss(item.id) : undefined}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === 'pending' ? 'shield-checkmark-outline' : 'archive-outline'}
                size={44}
                color={COLORS.chaiOrange}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'pending' ? 'No Active Alerts' : 'No Completed Alerts'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'All appliance warranties and maintenance visits are in order.'
                  : 'Completed maintenance tasks will be archived here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: COLORS.bgCardHover,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.chaiOrange,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
