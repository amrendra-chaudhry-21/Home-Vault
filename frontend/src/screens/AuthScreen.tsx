import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { storageService } from '../services/storage';
import { User, Household } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User, defaultHouseholdId?: string, householdObj?: Household | null) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password');
      return;
    }
    if (!isLogin && !displayName.trim()) {
      Alert.alert('Required Fields', 'Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({
          email: email.trim(),
          password,
        });
        const households = await api.getHouseholds();
        const defaultHousehold = households[0] || null;
        const defaultHouseholdId = defaultHousehold?.id;
        if (defaultHouseholdId) {
          api.setCurrentHouseholdId(defaultHouseholdId);
        }
        await storageService.saveSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
          household: defaultHousehold,
          savedAt: Date.now(),
        });
        onAuthSuccess(res.user, defaultHouseholdId, defaultHousehold);
      } else {
        const res = await api.register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        });
        const defaultHousehold: Household = {
          id: res.defaultHouseholdId,
          name: `${res.user.displayName}'s Home`,
          timezone: 'Asia/Kolkata',
          role: 'owner',
          isOwner: true,
          createdAt: new Date().toISOString(),
        };
        await storageService.saveSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
          household: defaultHousehold,
          savedAt: Date.now(),
        });
        onAuthSuccess(res.user, res.defaultHouseholdId, defaultHousehold);
      }
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      // Demo test user account with pre-seeded appliances
      const demoEmail = 'demo@homevault.in';
      const demoPassword = 'Password123!';
      try {
        const res = await api.login({ email: demoEmail, password: demoPassword });
        const households = await api.getHouseholds();
        const defaultHousehold = households[0] || null;
        const defaultHouseholdId = defaultHousehold?.id;
        if (defaultHouseholdId) {
          api.setCurrentHouseholdId(defaultHouseholdId);
        }
        await storageService.saveSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
          household: defaultHousehold,
          savedAt: Date.now(),
        });
        onAuthSuccess(res.user, defaultHouseholdId, defaultHousehold);
      } catch (loginErr: any) {
        console.log('[AuthScreen] Demo user not found, auto-provisioning demo account:', loginErr?.message || loginErr);
        // If not registered yet, auto-register demo user
        const res = await api.register({
          email: demoEmail,
          password: demoPassword,
          displayName: 'Sharma Household',
        });
        const defaultHousehold: Household = {
          id: res.defaultHouseholdId,
          name: "Sharma Household's Home",
          timezone: 'Asia/Kolkata',
          role: 'owner',
          isOwner: true,
          createdAt: new Date().toISOString(),
        };
        await storageService.saveSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
          household: defaultHousehold,
          savedAt: Date.now(),
        });
        // Seed an initial appliance
        await api.createAppliance(res.defaultHouseholdId, {
          name: 'Dual Inverter 1.5 Ton AC',
          category: 'Air Conditioner',
          brand: 'LG',
          modelNumber: 'MS-Q18PWZX',
          serialNumber: 'LG-AC-2025-9981',
          purchasePrice: 42990,
          seller: 'Reliance Digital',
          purchaseDate: '2025-04-10',
          warrantyStartDate: '2025-04-10',
          warrantyEndDate: '2026-04-10',
          notes: 'Includes 5-year PCB warranty and 10-year compressor warranty.',
        });
        onAuthSuccess(res.user, res.defaultHouseholdId, defaultHousehold);
      }
    } catch (error: any) {
      Alert.alert('Demo Login Error', error.message || 'Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Logo & Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.appLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>HomeVault</Text>
          <Text style={styles.hindiTag}>गृह स्मृति • Digital Home Memory</Text>
          <Text style={styles.subtitle}>
            Manage home appliances, warranties, bills, and repair records in one secure vault.
          </Text>
        </View>

        {/* Auth Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          {!isLogin && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name / Household Owner</Text>
              <TextInput
                style={styles.input}
                placeholder="Aarav Sharma"
                placeholderTextColor={COLORS.textDarkMuted}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="sharma.home@gmail.com"
              placeholderTextColor={COLORS.textDarkMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 8 characters"
              placeholderTextColor={COLORS.textDarkMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Enter Home Vault' : 'Create My Household'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Access */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Instant Exploration</Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
            disabled={loading}
          >
            <Ionicons name="flash" size={18} color={COLORS.chaiOrange} />
            <Text style={styles.demoButtonText}>One-Tap Demo Household</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appLogoImage: {
    width: 84,
    height: 84,
    borderRadius: 22,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  hindiTag: {
    fontSize: 13,
    color: COLORS.chaiOrange,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    width: '100%',
    height: 48,
  },
  toggleBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.bgCardHover,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: COLORS.chaiOrange,
    fontWeight: '800',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    height: 48,
    backgroundColor: COLORS.chaiOrange,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: COLORS.chaiOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
  },
  demoSection: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDarkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  demoButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.chaiOrangeLight,
    borderWidth: 1,
    borderColor: COLORS.chaiOrangeGlow,
    borderRadius: 12,
    width: '100%',
  },
  demoButtonText: {
    color: COLORS.chaiOrange,
    fontWeight: '700',
    fontSize: 14,
  },
});
