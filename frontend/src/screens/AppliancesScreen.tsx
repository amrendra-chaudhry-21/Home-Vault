import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ApplianceCard } from '../components/ApplianceCard';
import { api } from '../services/api';
import { Appliance, ApplianceCategory, Household, WarrantyStatus } from '../types';

interface AppliancesScreenProps {
  household: Household | null;
  onSelectAppliance: (id: string) => void;
  onAddAppliance: () => void;
  onQuickQR: (appliance: Appliance) => void;
  onScanQR: () => void;
}

const CATEGORY_FILTERS = [
  'All',
  'Air Conditioner',
  'Refrigerator',
  'Washing Machine',
  'Television',
  'RO Water Purifier',
  'Geyser / Water Heater',
  'Microwave Oven',
  'Other',
];

const STATUS_FILTERS: Array<{ label: string; value?: WarrantyStatus }> = [
  { label: 'All Status' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expiring Soon', value: 'EXPIRING_SOON' },
  { label: 'Expired', value: 'EXPIRED' },
];

// In-memory cache to ensure instant tab switching without loading spinners
const appliancesCache: Record<string, Appliance[]> = {};

export const AppliancesScreen: React.FC<AppliancesScreenProps> = ({
  household,
  onSelectAppliance,
  onAddAppliance,
  onQuickQR,
  onScanQR,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<WarrantyStatus | undefined>(undefined);
  const cached = household ? appliancesCache[household.id] : null;
  const [appliances, setAppliances] = useState<Appliance[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  const loadAppliances = useCallback(async () => {
    if (!household) return;
    try {
      const items = await api.getAppliances(household.id, {
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: search.trim() || undefined,
        warrantyStatus: selectedStatus,
      });
      if (selectedCategory === 'All' && !search.trim() && !selectedStatus) {
        appliancesCache[household.id] = items;
      }
      setAppliances(items);
    } catch (err: any) {
      console.warn('Failed to load appliances:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household, selectedCategory, search, selectedStatus]);

  useEffect(() => {
    loadAppliances();
  }, [loadAppliances]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppliances();
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar with QR Scan Trigger */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by brand, name, model..."
            placeholderTextColor={COLORS.textDarkMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={loadAppliances}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.scanBtn}
          onPress={onScanQR}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.chaiOrange} />
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsScroll}>
          {STATUS_FILTERS.map((st) => {
            const isSelected = selectedStatus === st.value;
            return (
              <TouchableOpacity
                key={st.label}
                style={[styles.statusPill, isSelected && styles.statusPillActive]}
                onPress={() => setSelectedStatus(st.value)}
              >
                <Text style={[styles.statusPillText, isSelected && styles.statusPillTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Appliance List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.chaiOrange} />
        </View>
      ) : (
        <FlatList
          data={appliances}
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
            <ApplianceCard
              appliance={item}
              onPress={() => onSelectAppliance(item.id)}
              onQuickQR={() => onQuickQR(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="hardware-chip-outline" size={40} color={COLORS.chaiOrange} />
              </View>
              <Text style={styles.emptyTitle}>No Appliances Found</Text>
              <Text style={styles.emptySubtitle}>
                {search || selectedCategory !== 'All'
                  ? 'No appliances matched your search filters.'
                  : 'Start protecting your home by adding your first appliance.'}
              </Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={onAddAppliance}>
                <Ionicons name="add" size={18} color="#0A0A0A" />
                <Text style={styles.addFirstBtnText}>Add Appliance</Text>
              </TouchableOpacity>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(254, 110, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  filterSection: {
    marginTop: 12,
  },
  pillsScroll: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.chaiOrangeLight,
    borderColor: COLORS.chaiOrange,
  },
  pillText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  pillTextActive: {
    color: COLORS.chaiOrange,
    fontWeight: '800',
  },
  statusPillsScroll: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statusPill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillActive: {
    backgroundColor: COLORS.bgCardHover,
    borderColor: COLORS.chaiOrange,
  },
  statusPillText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  statusPillTextActive: {
    color: COLORS.textPrimary,
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
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.chaiOrangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.chaiOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addFirstBtnText: {
    color: '#0A0A0A',
    fontWeight: '800',
    fontSize: 14,
  },
});
