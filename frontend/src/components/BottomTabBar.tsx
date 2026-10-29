import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export type TabScreen = 'dashboard' | 'appliances' | 'reminders' | 'settings';

interface BottomTabBarProps {
  currentTab: TabScreen;
  onSelectTab: (tab: TabScreen) => void;
  onAddPress: () => void;
  reminderCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  onAddPress,
  reminderCount = 0,
}) => {
  return (
    <View style={styles.container}>
      {/* Home / Dashboard Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('dashboard')}
      >
        <Ionicons
          name={currentTab === 'dashboard' ? 'home' : 'home-outline'}
          size={22}
          color={currentTab === 'dashboard' ? COLORS.chaiOrange : COLORS.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'dashboard' && styles.tabLabelActive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Appliances Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('appliances')}
      >
        <Ionicons
          name={currentTab === 'appliances' ? 'grid' : 'grid-outline'}
          size={22}
          color={currentTab === 'appliances' ? COLORS.chaiOrange : COLORS.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'appliances' && styles.tabLabelActive,
          ]}
        >
          Appliances
        </Text>
      </TouchableOpacity>

      {/* Center Floating Add Button */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.centerAddButton}
          onPress={onAddPress}
        >
          <Ionicons name="add" size={28} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      {/* Reminders Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('reminders')}
      >
        <View>
          <Ionicons
            name={currentTab === 'reminders' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={currentTab === 'reminders' ? COLORS.chaiOrange : COLORS.textMuted}
          />
          {reminderCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reminderCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'reminders' && styles.tabLabelActive,
          ]}
        >
          Reminders
        </Text>
      </TouchableOpacity>

      {/* Settings Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('settings')}
      >
        <Ionicons
          name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
          size={22}
          color={currentTab === 'settings' ? COLORS.chaiOrange : COLORS.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            currentTab === 'settings' && styles.tabLabelActive,
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 68,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.chaiOrange,
    fontWeight: '700',
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAddButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.chaiOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.chaiOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
