import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../theme/colors';

interface QRModalProps {
  visible: boolean;
  onClose: () => void;
  qrDataUrl: string | null;
  applianceName: string;
  brand: string;
  token?: string | null;
  loading?: boolean;
}

export const QRModal: React.FC<QRModalProps> = ({
  visible,
  onClose,
  qrDataUrl,
  applianceName,
  brand,
  token,
  loading = false,
}) => {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await Clipboard.setStringAsync(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      Alert.alert(
        'Token Copied! 📋',
        '64-character appliance QR token copied to clipboard. You can paste it in the scanner modal.'
      );
    } catch (err: any) {
      console.warn('Copy token error:', err?.message || err);
    }
  };

  const handleShare = async () => {
    if (!qrDataUrl) {
      Alert.alert('QR Not Ready', 'Please wait until the QR code has finished loading.');
      return;
    }

    setSharing(true);
    try {
      // 1. Extract pure base64 data
      const base64Content = qrDataUrl.includes('base64,')
        ? qrDataUrl.split('base64,')[1]
        : qrDataUrl;

      // 2. Write PNG image to device cache directory
      const safeName = `${brand}_${applianceName}`.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `HomeVault_QR_${safeName}.png`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. Share real image file (WhatsApp attaches the image directly)
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${brand} ${applianceName} QR Pass`,
          UTI: 'public.png',
        });
      } else {
        await Share.share({
          title: `HomeVault QR Pass: ${brand} ${applianceName}`,
          message: `HomeVault Digital Pass for ${brand} ${applianceName}.\nScan this QR code in the HomeVault app to view warranty, invoices, and service history.`,
          url: fileUri,
        });
      }
    } catch (error: any) {
      console.error('[QRModal] Share image error:', error);
      Alert.alert(
        'Sharing Failed',
        error?.message || 'Could not prepare QR image for sharing. Please try again.'
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Appliance QR Pass</Text>
              <Text style={styles.subTitle}>
                {brand} {applianceName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.qrContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.chaiOrange} />
            ) : qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
            ) : (
              <Text style={styles.errorText}>QR Code unavailable</Text>
            )}
          </View>

          {token && (
            <TouchableOpacity style={styles.copyTokenBtn} onPress={handleCopyToken} activeOpacity={0.8}>
              <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={copied ? COLORS.success : COLORS.chaiOrange} />
              <Text style={[styles.copyTokenText, copied && { color: COLORS.success }]}>
                {copied ? 'Token Copied!' : 'Copy 64-Char Token'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.helperText}>
            Stick this QR on the appliance. Any authorized family member can scan it to instantly open digital passport & analytics.
          </Text>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.shareBtnText}>Share Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subTitle: {
    fontSize: 13,
    color: COLORS.chaiOrange,
    fontWeight: '600',
    marginTop: 2,
  },
  qrContainer: {
    width: 240,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.chaiOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  qrImage: {
    width: 216,
    height: 216,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  copyTokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 110, 0, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.3)',
  },
  copyTokenText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chaiOrange,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 14,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.bgCardHover,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.chaiOrange,
    borderRadius: 12,
    paddingVertical: 12,
  },
  closeBtnText: {
    color: '#0A0A0A',
    fontWeight: '800',
    fontSize: 14,
  },
});
