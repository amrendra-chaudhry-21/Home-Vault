import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Platform,
  Alert,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/theme/colors';
import { api } from './src/services/api';
import { storageService } from './src/services/storage';
import { User, Household, Appliance } from './src/types';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AppliancesScreen } from './src/screens/AppliancesScreen';
import { ApplianceDetailScreen } from './src/screens/ApplianceDetailScreen';
import { RemindersScreen } from './src/screens/RemindersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BottomTabBar, TabScreen } from './src/components/BottomTabBar';
import { AddApplianceModal } from './src/components/AddApplianceModal';
import { AddServiceModal } from './src/components/AddServiceModal';
import { QRModal } from './src/components/QRModal';
import { QRScannerModal } from './src/components/QRScannerModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentTab, setCurrentTab] = useState<TabScreen>('dashboard');
  const [selectedApplianceId, setSelectedApplianceId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Modals
  const [isAddApplianceVisible, setIsAddApplianceVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [addServiceAppliance, setAddServiceAppliance] = useState<Appliance | null>(null);
  const [qrAppliance, setQrAppliance] = useState<Appliance | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Check auth session & restore persistent login across app kills
  useEffect(() => {
    let isMounted = true;

    // Register API token rotation callback
    api.setOnTokensUpdated((newAccessToken, newRefreshToken) => {
      storageService.updateTokens(newAccessToken, newRefreshToken).catch((err) => {
        console.warn('[App] Error persisting rotated tokens:', err);
      });
    });

    // Register API session expiry callback
    api.setOnSessionExpired(async () => {
      console.log('[App] Session expired permanently. Clearing session.');
      await storageService.clearSession();
      if (isMounted) {
        setCurrentUser(null);
        setHousehold(null);
        setSelectedApplianceId(null);
      }
    });

    const initSession = async () => {
      try {
        const session = await storageService.getSession();
        if (!session || !session.accessToken) {
          if (isMounted) setInitializing(false);
          return;
        }

        // Configure api service with restored credentials
        api.setToken(session.accessToken);
        if (session.refreshToken) {
          api.setRefreshToken(session.refreshToken);
        }
        if (session.household?.id) {
          api.setCurrentHouseholdId(session.household.id);
        }

        // Immediately set user and household so app does not flash or log out
        if (isMounted) {
          setCurrentUser(session.user);
          if (session.household) {
            setHousehold(session.household);
          }
          // Instantly unblock UI so app opens in <50ms without buffering
          setInitializing(false);
        }

        // Verify session with backend in background or refresh expired access token
        try {
          const freshUser = await api.getMe();
          if (isMounted) {
            setCurrentUser(freshUser);
          }
          await storageService.updateUser(freshUser);

          // Sync households to keep current household active
          try {
            const households = await api.getHouseholds();
            if (households && households.length > 0) {
              const matched =
                households.find((h) => h.id === session.household?.id) || households[0];
              if (isMounted) {
                setHousehold(matched);
                api.setCurrentHouseholdId(matched.id);
              }
              await storageService.updateHousehold(matched);
            }
          } catch (hErr) {
            console.warn('[App] Could not refresh household list:', hErr);
          }
        } catch (authErr: any) {
          console.warn('[App] Session validation status:', authErr?.message || authErr);

          const isAuthError =
            authErr?.message?.includes('expired') ||
            authErr?.message?.includes('unauthorized') ||
            authErr?.message?.includes('User not found') ||
            authErr?.message?.includes('401');

          if (isAuthError) {
            // Attempt refresh with refresh token
            const refreshed = await api.refreshAuthTokens();
            if (refreshed) {
              await storageService.updateTokens(refreshed.accessToken, refreshed.refreshToken);
              try {
                const freshUser = await api.getMe();
                if (isMounted) setCurrentUser(freshUser);
                await storageService.updateUser(freshUser);
              } catch (_) {}
            } else {
              // Both access token and refresh token are invalid/expired -> require re-login
              console.log('[App] Refresh token expired or invalid, clearing local session');
              await storageService.clearSession();
              api.setToken(null);
              api.setRefreshToken(null);
              if (isMounted) {
                setCurrentUser(null);
                setHousehold(null);
              }
            }
          } else {
            // Network failure or backend temporarily unreachable:
            // DO NOT LOG OUT! App must stay logged in even if user kills app and re-opens offline.
            console.log('[App] Backend server unreachable; keeping persistent offline session active.');
          }
        }
      } catch (err) {
        console.warn('[App] Exception during session initialization:', err);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthSuccess = (
    user: User,
    defaultHouseholdId?: string,
    householdObj?: Household | null
  ) => {
    setCurrentUser(user);
    if (householdObj) {
      setHousehold(householdObj);
      api.setCurrentHouseholdId(householdObj.id);
    } else if (defaultHouseholdId) {
      const h: Household = {
        id: defaultHouseholdId,
        name: `${user.displayName}'s Home`,
        timezone: 'Asia/Kolkata',
        role: 'owner',
        isOwner: true,
        createdAt: new Date().toISOString(),
      };
      setHousehold(h);
      api.setCurrentHouseholdId(defaultHouseholdId);
      storageService.updateHousehold(h);
    }
  };

  const handleOpenQR = async (appliance: Appliance) => {
    setQrAppliance(appliance);
    setQrLoading(true);
    try {
      const res = await api.generateQR(appliance.id);
      setQrDataUrl(res.qrDataUrl);
      setQrToken(res.token);
    } catch (err: any) {
      console.warn('Could not generate QR code:', err.message);
    } finally {
      setQrLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.chaiOrange} />
        <Text style={styles.loadingText}>Initializing HomeVault...</Text>
      </View>
    );
  }

  // Not logged in -> Show Auth Screen
  if (!currentUser) {
    return (
      <ErrorBoundary fallbackMessage="An error occurred on the authentication screen.">
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      fallbackMessage="An unexpected error occurred in HomeVault. Tap below to reload your vault safely."
      onReset={() => {
        setSelectedApplianceId(null);
        setCurrentTab('dashboard');
      }}
    >
      <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Router */}
      <View style={styles.mainContainer}>
        {selectedApplianceId ? (
          <ApplianceDetailScreen
            applianceId={selectedApplianceId}
            onBack={() => setSelectedApplianceId(null)}
            onOpenQR={(app) => handleOpenQR(app)}
            onOpenAddService={(app) => setAddServiceAppliance(app)}
            onApplianceArchived={() => setSelectedApplianceId(null)}
          />
        ) : currentTab === 'dashboard' ? (
          <DashboardScreen
            household={household}
            onNavigateAppliances={() => setCurrentTab('appliances')}
            onNavigateReminders={() => setCurrentTab('reminders')}
            onAddAppliance={() => setIsAddApplianceVisible(true)}
            onSelectAppliance={(id) => setSelectedApplianceId(id)}
            onScanQR={() => setIsScannerVisible(true)}
          />
        ) : currentTab === 'appliances' ? (
          <AppliancesScreen
            household={household}
            onSelectAppliance={(id) => setSelectedApplianceId(id)}
            onAddAppliance={() => setIsAddApplianceVisible(true)}
            onQuickQR={(app) => handleOpenQR(app)}
            onScanQR={() => setIsScannerVisible(true)}
          />
        ) : currentTab === 'reminders' ? (
          <RemindersScreen household={household} />
        ) : (
          <SettingsScreen
            user={currentUser}
            household={household}
            onLogout={async () => {
              await api.logout();
              await storageService.clearSession();
              setCurrentUser(null);
              setHousehold(null);
              setSelectedApplianceId(null);
            }}
            onSelectHousehold={(h) => {
              setHousehold(h);
              api.setCurrentHouseholdId(h.id);
              storageService.updateHousehold(h);
            }}
            onHouseholdCreated={(h) => {
              setHousehold(h);
              api.setCurrentHouseholdId(h.id);
              storageService.updateHousehold(h);
            }}
          />
        )}
      </View>

      {/* Persistent Bottom Tab Bar (hidden when inspecting deep appliance detail) */}
      {!selectedApplianceId && (
        <BottomTabBar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedApplianceId(null);
            setCurrentTab(tab);
          }}
          onAddPress={() => setIsAddApplianceVisible(true)}
        />
      )}

      {/* Modal: Add Appliance */}
      <AddApplianceModal
        visible={isAddApplianceVisible}
        onClose={() => setIsAddApplianceVisible(false)}
        onSubmit={async (data, invoiceUri, invoiceName) => {
          if (!household) return;
          const created: any = await api.createAppliance(household.id, data);
          const applianceId = created?.id || created?._id;
          if (invoiceUri && applianceId) {
            try {
              const filename = invoiceName || invoiceUri.split('/').pop() || 'invoice_document.jpg';
              await api.uploadDocument(applianceId, invoiceUri, filename, 'invoice');
            } catch (err: any) {
              console.warn('[AddAppliance] Invoice upload notice:', err?.message || err);
              Alert.alert('Notice', 'Appliance saved, but invoice upload failed: ' + (err?.message || 'Error'));
            }
          }
          // If in appliances tab, trigger reload
          setCurrentTab('appliances');
        }}
      />

      {/* Modal: Add Service Record */}
      {addServiceAppliance && (
        <AddServiceModal
          visible={!!addServiceAppliance}
          applianceName={`${addServiceAppliance.brand} ${addServiceAppliance.name}`}
          onClose={() => setAddServiceAppliance(null)}
          onSubmit={async (data) => {
            await api.createService(addServiceAppliance.id, data);
            setAddServiceAppliance(null);
          }}
        />
      )}

      {/* Modal: QR Pass Viewer */}
      {qrAppliance && (
        <QRModal
          visible={!!qrAppliance}
          onClose={() => {
            setQrAppliance(null);
            setQrDataUrl(null);
            setQrToken(null);
          }}
          qrDataUrl={qrDataUrl}
          applianceName={qrAppliance.name}
          brand={qrAppliance.brand}
          token={qrToken}
          loading={qrLoading}
        />
      )}

      {/* Modal: QR Scanner & Token Resolver */}
      <QRScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        householdId={household?.id}
        onApplianceResolved={(resolvedId) => {
          setIsScannerVisible(false);
          setSelectedApplianceId(resolvedId);
        }}
      />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0,
  },
  mainContainer: {
    flex: 1,
  },
  center: {
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
});
