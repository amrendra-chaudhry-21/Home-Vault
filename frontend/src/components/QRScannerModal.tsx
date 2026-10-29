import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
  BarcodeSettings,
  ScanningResult,
  scanFromURLAsync,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';
import { Appliance } from '../types';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  householdId?: string;
  onApplianceResolved: (applianceId: string) => void;
}

// Static barcode scanner settings so native CameraX analyzer does not constantly unbind/rebind
const BARCODE_SETTINGS: BarcodeSettings = {
  barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'],
};

/**
 * Extracts a cryptographic token from raw scanner output or pasted user string.
 * Supports:
 * - JSON string: {"app":"homevault","token":"..."}
 * - Deep link: homevault://qr/<token>
 * - URL: https://.../qr/<token> or ?token=<token>
 * - Embedded 64-char or 32-char hex string
 */
function extractQRToken(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. JSON payload with "token": "<hex>"
  const jsonTokenMatch = trimmed.match(/"token"\s*:\s*"([a-fA-F0-9]{32,64})"/i);
  if (jsonTokenMatch && jsonTokenMatch[1]) {
    return jsonTokenMatch[1].trim();
  }

  // 2. Safe JSON slice parse
  try {
    if (trimmed.includes('{') && trimmed.includes('}')) {
      const slice = trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
      const parsed = JSON.parse(slice);
      if (parsed && parsed.token && typeof parsed.token === 'string') {
        return parsed.token.trim();
      }
    }
  } catch (_) {}

  // 3. URL / Deep link
  const urlMatch =
    trimmed.match(/\/qr\/([a-fA-F0-9]{32,64})/i) ||
    trimmed.match(/[?&]token=([a-fA-F0-9]{32,64})/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }

  // 4. Exact 64-character or 32-character hex token
  const hex64Match = trimmed.match(/([a-fA-F0-9]{64})/);
  if (hex64Match && hex64Match[1]) {
    return hex64Match[1].trim();
  }

  const hex32Match = trimmed.match(/([a-fA-F0-9]{32})/);
  if (hex32Match && hex32Match[1]) {
    return hex32Match[1].trim();
  }

  // 5. Clean hex fallback
  const sanitized = trimmed.replace(/[^a-fA-F0-9]/g, '');
  if (sanitized.length >= 32 && sanitized.length <= 64) {
    return sanitized;
  }

  return null;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  householdId,
  onApplianceResolved,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [availableAppliances, setAvailableAppliances] = useState<Appliance[]>([]);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isProcessingRef.current = false;
      setScanned(false);
      setLoading(false);
      setTokenInput('');
      if (!permission?.granted) {
        requestPermission();
      }
      // Load household appliances for quick-test and smart keyword search
      if (householdId) {
        api.getAppliances(householdId)
          .then((items) => setAvailableAppliances(items))
          .catch((err) => console.log('[QRScannerModal] Appliances fetch notice:', err?.message));
      }
    } else {
      isProcessingRef.current = false;
    }
  }, [visible, householdId]);

  // Listener for modern Google Code Scanner results
  useEffect(() => {
    if (!visible) return;
    try {
      const sub = CameraView.onModernBarcodeScanned((result: ScanningResult) => {
        if (result && result.data && !isProcessingRef.current) {
          isProcessingRef.current = true;
          setScanned(true);
          try {
            Vibration.vibrate(120);
          } catch (_) {}
          handleResolve(result.data);
        }
      });
      return () => {
        sub?.remove();
      };
    } catch (_) {}
  }, [visible]);

  const handleResolve = async (inputQuery: string) => {
    const raw = inputQuery.trim();

    if (!raw) {
      Alert.alert(
        'Scan or Enter Pass',
        'Point your camera at an Appliance QR code, paste a token, or select an appliance below.'
      );
      isProcessingRef.current = false;
      setScanned(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Try extracting cryptographic hex token
      const extractedToken = extractQRToken(raw);

      if (extractedToken) {
        const result = await api.resolveQR(extractedToken);
        setTokenInput('');
        onApplianceResolved(result.applianceId);
        return;
      }

      // 2. Smart Keyword Match: Check if user typed or scanned appliance name, brand, or model
      if (availableAppliances.length > 0) {
        const q = raw.toLowerCase();
        const matched = availableAppliances.find(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.brand.toLowerCase().includes(q) ||
            a.modelNumber.toLowerCase().includes(q) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
        );

        if (matched) {
          setTokenInput('');
          onApplianceResolved(matched.id);
          return;
        }
      }

      // 3. Fallback: Send directly to backend
      const result = await api.resolveQR(raw);
      setTokenInput('');
      onApplianceResolved(result.applianceId);
    } catch (err: any) {
      console.error('[QRScannerModal] Failed to resolve QR:', err);
      isProcessingRef.current = false;
      Alert.alert(
        'Pass Resolution Failed',
        err.message || 'QR code pass is invalid, expired, or belongs to another household.',
        [
          {
            text: 'Scan Again',
            onPress: () => {
              isProcessingRef.current = false;
              setScanned(false);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (isProcessingRef.current || !result?.data) return;
    isProcessingRef.current = true;
    setScanned(true);

    // Immediate tactile haptic feedback as requested
    try {
      Vibration.vibrate(120);
    } catch (_) {}

    // Instant zero-click automatic display of appliance details
    handleResolve(result.data);
  }, [availableAppliances]);

  const [torch, setTorch] = useState(false);

  const handleScanFromImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const imageUri = result.assets[0].uri;
        const scanResults = await scanFromURLAsync(imageUri, [
          'qr',
          'code128',
          'code39',
          'ean13',
          'ean8',
          'upc_a',
          'upc_e',
          'datamatrix',
          'aztec',
          'pdf417',
        ]);
        if (scanResults && scanResults.length > 0 && scanResults[0]?.data) {
          try {
            Vibration.vibrate(120);
          } catch (_) {}
          handleResolve(scanResults[0].data);
        } else {
          Alert.alert('No QR Code Found', 'No recognizable QR code could be detected in the selected image. Please make sure the QR code is clear and well-lit.');
        }
      }
    } catch (err: any) {
      console.warn('Scan from image error:', err?.message || err);
      Alert.alert('Scan Failed', err?.message || 'Could not scan the selected photo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setTokenInput(text.trim());
        handleResolve(text.trim());
      } else {
        Alert.alert('Clipboard Empty', 'No text found in clipboard to paste.');
      }
    } catch (err: any) {
      console.warn('Clipboard read error:', err?.message || err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Scan Appliance QR Pass</Text>
              <Text style={styles.subtitle}>Instant digital health & warranty lookup</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Dynamic Live Camera Scanner */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinder}>
              {permission?.granted ? (
                <View style={StyleSheet.absoluteFill}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    autofocus="on"
                    enableTorch={torch}
                    barcodeScannerSettings={BARCODE_SETTINGS}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />

                  {/* Highlighting Viewfinder Reticle Overlay */}
                  <View style={styles.cameraOverlay} pointerEvents="none">
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    {!scanned && <View style={styles.scanLine} />}
                  </View>

                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color={COLORS.chaiOrange} />
                      <Text style={styles.resolvingText}>Resolving Appliance Analytics...</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.permissionBox}>
                  <Ionicons name="camera-outline" size={44} color={COLORS.chaiOrange} />
                  <Text style={styles.permissionTitle}>Camera Access Required</Text>
                  <Text style={styles.permissionSubtitle}>
                    Grant camera permission to scan appliance QR passes dynamically.
                  </Text>
                  <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>Enable Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.hintRow}>
              <Text style={styles.viewfinderHint}>
                {scanned ? 'QR Code Detected! Opening Analytics...' : 'Align QR pass inside the camera frame'}
              </Text>
              {scanned && !loading && (
                <TouchableOpacity
                  onPress={() => {
                    isProcessingRef.current = false;
                    setScanned(false);
                  }}
                >
                  <Text style={styles.rescanText}>Scan Again</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Action Buttons: Flashlight & Scan from Gallery */}
            <View style={styles.scannerActionsRow}>
              <TouchableOpacity
                style={[styles.scannerActionBtn, torch && styles.scannerActionBtnActive]}
                onPress={() => setTorch((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={torch ? 'flashlight' : 'flashlight-outline'}
                  size={16}
                  color={torch ? '#000000' : COLORS.chaiOrange}
                />
                <Text
                  style={[
                    styles.scannerActionBtnText,
                    torch && { color: '#000000', fontWeight: '700' },
                  ]}
                >
                  {torch ? 'Flashlight ON' : 'Flashlight'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scannerActionBtn}
                onPress={handleScanFromImage}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={16} color={COLORS.chaiOrange} />
                <Text style={styles.scannerActionBtnText}>Scan from Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ⚡ Dynamic Quick-Select: Choose any appliance from current household */}
          {availableAppliances.length > 0 && (
            <View style={styles.quickSelectSection}>
              <Text style={styles.quickSelectLabel}>Quick Inspect Household Passports:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.applianceChipsRow}
              >
                {availableAppliances.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={styles.applianceChip}
                    onPress={() => {
                      onApplianceResolved(app.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="hardware-chip-outline" size={13} color={COLORS.chaiOrange} />
                    <Text style={styles.applianceChipText} numberOfLines={1}>
                      {app.brand} {app.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={11} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Manual / Direct Token Resolver Fallback */}
          <View style={styles.manualSection}>
            <View style={styles.manualHeaderRow}>
              <Text style={styles.manualLabel}>Or Enter / Paste QR Pass Token</Text>
              <TouchableOpacity onPress={handlePasteClipboard} style={styles.pasteBtn}>
                <Ionicons name="clipboard-outline" size={13} color={COLORS.chaiOrange} />
                <Text style={styles.pasteBtnText}>Paste</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Paste token or appliance name..."
                placeholderTextColor={COLORS.textDarkMuted}
                value={tokenInput}
                onChangeText={setTokenInput}
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={() => handleResolve(tokenInput)}
              />
              <TouchableOpacity
                style={[styles.resolveBtn, loading && { opacity: 0.7 }]}
                onPress={() => handleResolve(tokenInput)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.success} />
            <Text style={styles.securityText}>
              Cryptographically verified • Requires Household Authorization
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 24,
    width: '100%',
    maxWidth: 390,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewfinderContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  viewfinder: {
    width: 220,
    height: 220,
    backgroundColor: '#000000',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.chaiOrange,
  },
  cornerTL: {
    top: 18,
    left: 18,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 18,
    right: 18,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 18,
    left: 18,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 18,
    right: 18,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    width: '80%',
    height: 2.5,
    backgroundColor: COLORS.chaiOrange,
    shadowColor: COLORS.chaiOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resolvingText: {
    color: COLORS.chaiOrange,
    fontSize: 12,
    fontWeight: '700',
  },
  permissionBox: {
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  permissionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  permissionBtn: {
    backgroundColor: COLORS.chaiOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
  },
  hintRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewfinderHint: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  rescanText: {
    fontSize: 11,
    color: COLORS.chaiOrange,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  scannerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    justifyContent: 'center',
    width: '100%',
  },
  scannerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 110, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scannerActionBtnActive: {
    backgroundColor: COLORS.chaiOrange,
    borderColor: COLORS.chaiOrange,
  },
  scannerActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chaiOrange,
  },
  quickSelectSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  quickSelectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  applianceChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  applianceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 110, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 200,
  },
  applianceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chaiOrange,
    maxWidth: 140,
  },
  manualSection: {
    marginTop: 8,
  },
  manualHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  manualLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pasteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chaiOrange,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  resolveBtn: {
    backgroundColor: COLORS.chaiOrange,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  securityText: {
    fontSize: 10,
    color: COLORS.textDarkMuted,
  },
});
