import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../theme/colors';
import { Badge } from '../components/Badge';
import { ServiceRecordCard } from '../components/ServiceRecordCard';
import { api } from '../services/api';
import { Appliance, DocumentItem, ServiceRecord, Reminder } from '../types';

interface ApplianceDetailScreenProps {
  applianceId: string;
  onBack: () => void;
  onOpenQR: (appliance: Appliance) => void;
  onOpenAddService: (appliance: Appliance) => void;
  onApplianceArchived: () => void;
}

export const ApplianceDetailScreen: React.FC<ApplianceDetailScreenProps> = ({
  applianceId,
  onBack,
  onOpenQR,
  onOpenAddService,
  onApplianceArchived,
}) => {
  const [appliance, setAppliance] = useState<
    (Appliance & { services: ServiceRecord[]; documents: DocumentItem[]; reminders: Reminder[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    try {
      const data = await api.getAppliance(applianceId);
      setAppliance(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load appliance details');
    } finally {
      setLoading(false);
    }
  }, [applianceId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const doUpload = async (fileUri: string, filename: string) => {
    setUploadingDoc(true);
    try {
      await api.uploadDocument(applianceId, fileUri, filename, 'invoice');
      await loadDetails();
      Alert.alert('Success', 'Document uploaded to digital vault!');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDocument = async (doc: DocumentItem) => {
    try {
      setDownloadingDocId(doc.id);
      const token = api.getToken();
      const downloadUrl = `${api.getBaseUrl()}/documents/${doc.id}/download?token=${token}`;
      
      const safeFilename = doc.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${FileSystem.cacheDirectory}${safeFilename}`;

      const res = await FileSystem.downloadAsync(downloadUrl, localUri);

      // Offer direct save to phone storage as primary action, or share/send as secondary
      Alert.alert(
        'Download Document',
        `Save "${doc.originalFilename}" to your phone?`,
        [
          {
            text: '💾 Save to Phone Storage',
            onPress: async () => {
              try {
                if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
                  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                  if (permissions.granted) {
                    const base64 = await FileSystem.readAsStringAsync(res.uri, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    const mimeType =
                      doc.mimeType ||
                      (safeFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
                    const dotIdx = safeFilename.lastIndexOf('.');
                    const nameWithoutExt = dotIdx > 0 ? safeFilename.substring(0, dotIdx) : safeFilename;

                    const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                      permissions.directoryUri,
                      nameWithoutExt,
                      mimeType
                    );

                    await FileSystem.writeAsStringAsync(newFileUri, base64, {
                      encoding: FileSystem.EncodingType.Base64,
                    });

                    Alert.alert(
                      'Download Complete ✅',
                      `"${doc.originalFilename}" has been saved directly to your phone storage.`
                    );
                    return;
                  }
                }

                // If not Android or user cancelled SAF, attempt share/save
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(res.uri, {
                    mimeType: doc.mimeType || (safeFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                    dialogTitle: `Save ${doc.originalFilename}`,
                    UTI: safeFilename.toLowerCase().endsWith('.pdf') ? 'com.adobe.pdf' : 'public.image',
                  });
                }
              } catch (saveErr: any) {
                console.warn('Direct phone storage save error:', saveErr);
                Alert.alert('Save Error', saveErr?.message || 'Could not save file to device storage.');
              }
            },
          },
          {
            text: '📤 Share / Send to App',
            onPress: async () => {
              try {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(res.uri, {
                    mimeType: doc.mimeType || (safeFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                    dialogTitle: `Share ${doc.originalFilename}`,
                    UTI: safeFilename.toLowerCase().endsWith('.pdf') ? 'com.adobe.pdf' : 'public.image',
                  });
                }
              } catch (shareErr: any) {
                console.warn('Share error:', shareErr);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      console.warn('Download document error:', err?.message || err);
      Alert.alert('Download Failed', err?.message || 'Could not download document.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleUploadInvoice = () => {
    Alert.alert('Upload Invoice / Document', 'Choose document source (PDF or Image)', [
      {
        text: 'Camera Photo',
        onPress: async () => {
          try {
            const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
            if (!res.canceled && res.assets && res.assets[0]) {
              await doUpload(res.assets[0].uri, res.assets[0].fileName || 'invoice_camera.jpg');
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Camera failed');
          }
        },
      },
      {
        text: 'From Gallery',
        onPress: async () => {
          try {
            const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
            if (!res.canceled && res.assets && res.assets[0]) {
              await doUpload(res.assets[0].uri, res.assets[0].fileName || 'invoice_gallery.jpg');
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Gallery failed');
          }
        },
      },
      {
        text: 'PDF / Document File',
        onPress: async () => {
          try {
            const res = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'image/*'],
              copyToCacheDirectory: true,
            });
            if (!res.canceled && res.assets && res.assets[0]) {
              await doUpload(res.assets[0].uri, res.assets[0].name || 'invoice_document.pdf');
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Document picker failed');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Appliance',
      'Are you sure you want to remove this appliance from active inventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.archiveAppliance(applianceId);
              onApplianceArchived();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to archive appliance');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not Specified';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (err: any) {
      console.warn('[ApplianceDetailScreen] Date format fallback:', err?.message || err);
      return dateStr;
    }
  };

  if (loading || !appliance) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.chaiOrange} />
        <Text style={styles.loadingText}>Opening Appliance Passport...</Text>
      </View>
    );
  }

  // Analytics Computations
  const totalServiceSpend = (appliance.services || []).reduce(
    (sum, s) => sum + (s.cost || 0),
    0
  );
  const purchasePrice = appliance.purchasePrice || 0;
  const totalCostOfOwnership = purchasePrice + totalServiceSpend;

  // Warranty Lifespan Progress %
  let warrantyProgress = 100;
  if (appliance.warrantyStartDate && appliance.warrantyEndDate) {
    const start = new Date(appliance.warrantyStartDate).getTime();
    const end = new Date(appliance.warrantyEndDate).getTime();
    const now = new Date().getTime();
    if (end > start) {
      const totalSpan = end - start;
      const elapsed = now - start;
      warrantyProgress = Math.min(100, Math.max(0, (elapsed / totalSpan) * 100));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerCategory}>{appliance.category}</Text>
          <Text style={styles.passportTag}>Verified Digital Passport</Text>
        </View>
        <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* Hero Appliance Profile Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroCol}>
            <Text style={styles.brandSubtitle}>{appliance.brand}</Text>
            <Text style={styles.applianceTitle}>{appliance.name}</Text>
            <Text style={styles.modelSubtitle}>Model: {appliance.modelNumber}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.goodCondition} />
            <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
          </View>
        </View>

        <View style={styles.heroBadgeRow}>
          <Badge status={appliance.warrantyStatus} />
          {appliance.warrantyDaysRemaining !== null &&
            appliance.warrantyDaysRemaining !== undefined && (
              <Text
                style={[
                  styles.daysLeftText,
                  appliance.warrantyDaysRemaining <= 30 && { color: COLORS.warning },
                  appliance.warrantyDaysRemaining < 0 && { color: COLORS.danger },
                ]}
              >
                {appliance.warrantyDaysRemaining > 0
                  ? `${appliance.warrantyDaysRemaining} days remaining`
                  : appliance.warrantyDaysRemaining === 0
                  ? 'Expires today'
                  : 'Warranty Expired'}
              </Text>
            )}
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.qrActionButton}
            onPress={() => onOpenQR(appliance)}
          >
            <Ionicons name="qr-code" size={18} color="#0A0A0A" />
            <Text style={styles.qrActionText}>Appliance QR Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceActionButton}
            onPress={() => onOpenAddService(appliance)}
          >
            <Ionicons name="construct" size={18} color={COLORS.chaiOrange} />
            <Text style={styles.serviceActionText}>Log Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📊 LIFECYCLE & FINANCIAL ANALYTICS DASHBOARD */}
      <View style={styles.analyticsCard}>
        <View style={styles.analyticsTitleRow}>
          <Ionicons name="analytics-outline" size={18} color={COLORS.chaiOrange} />
          <Text style={styles.analyticsHeaderTitle}>Appliance Analytics & Health</Text>
        </View>

        {/* Warranty Lifespan Progress Bar */}
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeHeader}>
            <Text style={styles.gaugeLabel}>Warranty Lifespan Consumed</Text>
            <Text style={styles.gaugeValue}>{warrantyProgress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${warrantyProgress}%`,
                  backgroundColor:
                    warrantyProgress >= 100
                      ? COLORS.danger
                      : warrantyProgress > 75
                      ? COLORS.warning
                      : COLORS.goodCondition,
                },
              ]}
            />
          </View>
          <View style={styles.gaugeFooter}>
            <Text style={styles.gaugeFooterText}>
              Start: {formatDate(appliance.warrantyStartDate || appliance.purchaseDate)}
            </Text>
            <Text style={styles.gaugeFooterText}>
              End: {formatDate(appliance.warrantyEndDate)}
            </Text>
          </View>
        </View>

        {/* Financial TCO Grid */}
        <View style={styles.tcoGrid}>
          <View style={styles.tcoBox}>
            <Text style={styles.tcoLabel}>Purchase Price</Text>
            <Text style={[styles.tcoValue, { color: COLORS.textPrimary }]}>
              ₹{purchasePrice.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.tcoBox}>
            <Text style={styles.tcoLabel}>Repairs Spend</Text>
            <Text style={[styles.tcoValue, { color: totalServiceSpend > 0 ? COLORS.warning : COLORS.textMuted }]}>
              ₹{totalServiceSpend.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.tcoBox}>
            <Text style={styles.tcoLabel}>Total Cost (TCO)</Text>
            <Text style={[styles.tcoValue, { color: COLORS.chaiOrange }]}>
              ₹{totalCostOfOwnership.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* Specifications & Purchase Details */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeaderTitle}>Technical & Store Specifications</Text>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Purchase Date</Text>
          <Text style={styles.specValue}>{formatDate(appliance.purchaseDate)}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Warranty Expiry</Text>
          <Text
            style={[
              styles.specValue,
              appliance.warrantyStatus === 'EXPIRING_SOON' && { color: COLORS.warning },
              appliance.warrantyStatus === 'EXPIRED' && { color: COLORS.danger },
            ]}
          >
            {formatDate(appliance.warrantyEndDate)}
          </Text>
        </View>

        {appliance.seller && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Store / Retailer</Text>
            <Text style={styles.specValue}>{appliance.seller}</Text>
          </View>
        )}

        {appliance.serialNumber && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Serial Number</Text>
            <Text style={styles.specValue}>{appliance.serialNumber}</Text>
          </View>
        )}

        {appliance.notes && (
          <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.specLabel}>Notes & Coverage</Text>
            <Text style={[styles.specValue, { flex: 1, textAlign: 'right' }]}>
              {appliance.notes}
            </Text>
          </View>
        )}
      </View>

      {/* Attached Invoices & Warranty Cards */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionHeaderTitle}>Documents & Tax Invoices</Text>
            <Text style={styles.docCountBadge}>{appliance.documents?.length || 0} files</Text>
          </View>
          <TouchableOpacity
            style={styles.addDocBtn}
            onPress={handleUploadInvoice}
            disabled={uploadingDoc}
            activeOpacity={0.8}
          >
            {uploadingDoc ? (
              <ActivityIndicator size="small" color={COLORS.chaiOrange} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={15} color={COLORS.chaiOrange} />
                <Text style={styles.addDocBtnText}>+ Upload Bill</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {appliance.documents && appliance.documents.length > 0 ? (
          appliance.documents.map((doc) => {
            const isPdf =
              doc.mimeType === 'application/pdf' ||
              /\.pdf$/i.test(doc.originalFilename);
            const isImage =
              !isPdf &&
              (doc.mimeType?.startsWith('image/') ||
                /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.originalFilename));
            const downloadUrl = `${api.getBaseUrl()}/documents/${doc.id}/download?token=${api.getToken()}`;
            const isDownloading = downloadingDocId === doc.id;

            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docHeaderRow}>
                  <View style={styles.docHeaderLeft}>
                    <View
                      style={[
                        styles.docTypeIconCircle,
                        isPdf && { backgroundColor: 'rgba(255, 77, 79, 0.15)' },
                      ]}
                    >
                      <Ionicons
                        name={isPdf ? 'document-text' : 'image'}
                        size={18}
                        color={isPdf ? '#FF4D4F' : COLORS.chaiOrange}
                      />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName} numberOfLines={1}>
                        {doc.originalFilename}
                      </Text>
                      <Text style={styles.docSub}>
                        {isPdf ? 'PDF DOCUMENT' : doc.documentType.toUpperCase()} • {(doc.fileSize / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                  </View>
                  <View style={styles.docBadgeRow}>
                    <View style={styles.verifiedTag}>
                      <Ionicons name="shield-checkmark" size={13} color={COLORS.goodCondition} />
                      <Text style={styles.verifiedTagText}>Vault Verified</Text>
                    </View>
                  </View>
                </View>

                {/* If image, display high quality thumbnail with tap to view */}
                {isImage && (
                  <TouchableOpacity
                    style={styles.imageThumbnailContainer}
                    activeOpacity={0.85}
                    onPress={() => setViewingDocument(doc)}
                  >
                    <Image
                      source={{
                        uri: downloadUrl,
                        headers: { Authorization: `Bearer ${api.getToken()}` },
                      }}
                      style={styles.docThumbnailImage}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbnailOverlay}>
                      <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.thumbnailOverlayText}>Tap to View Full Image</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* If PDF, display PDF document banner */}
                {isPdf && (
                  <TouchableOpacity
                    style={styles.pdfPreviewContainer}
                    activeOpacity={0.85}
                    onPress={() => handleDownloadDocument(doc)}
                  >
                    <View style={styles.pdfBannerIconBox}>
                      <Ionicons name="document-text" size={32} color="#FF4D4F" />
                    </View>
                    <View style={styles.pdfBannerInfo}>
                      <Text style={styles.pdfBannerTitle} numberOfLines={1}>
                        {doc.originalFilename}
                      </Text>
                      <Text style={styles.pdfBannerSub}>
                        PDF Document • Tap to Open / Download
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={22} color={COLORS.chaiOrange} />
                  </TouchableOpacity>
                )}

                {/* Action button row */}
                <View style={styles.docActionRow}>
                  {isImage && (
                    <TouchableOpacity
                      style={styles.viewDocActionBtn}
                      onPress={() => setViewingDocument(doc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={16} color={COLORS.chaiOrange} />
                      <Text style={styles.viewDocActionText}>View Image</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.downloadDocActionBtn, isDownloading && { opacity: 0.7 }]}
                    onPress={() => handleDownloadDocument(doc)}
                    activeOpacity={0.8}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.downloadDocActionText}>
                          {isPdf ? 'Download / Open PDF' : 'Download'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <TouchableOpacity
            style={styles.emptyDocUploadCard}
            onPress={handleUploadInvoice}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={32} color={COLORS.chaiOrange} />
            <Text style={styles.emptyDocTitle}>No invoice or bill attached yet</Text>
            <Text style={styles.emptyDocSubtitle}>
              Tap here to attach invoice (PDF or Image)
            </Text>
            <View style={styles.uploadBillPill}>
              <Ionicons name="cloud-upload" size={14} color="#0A0A0A" />
              <Text style={styles.uploadBillPillText}>Upload PDF or Image</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Service & Repair History */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeaderTitle}>Service History & Maintenance Log</Text>
          <TouchableOpacity onPress={() => onOpenAddService(appliance)}>
            <Text style={styles.addServiceLink}>+ Log Repair</Text>
          </TouchableOpacity>
        </View>

        {appliance.services && appliance.services.length > 0 ? (
          appliance.services.map((svc) => (
            <ServiceRecordCard key={svc.id} service={svc} />
          ))
        ) : (
          <View style={styles.emptyServicesBox}>
            <Ionicons name="build-outline" size={28} color={COLORS.textDarkMuted} />
            <Text style={styles.emptyServicesText}>No repairs or services logged yet.</Text>
          </View>
        )}
      </View>

      {/* Full-Screen Invoice Image Viewer Modal */}
      {viewingDocument && (
        <Modal visible={!!viewingDocument} animationType="fade" transparent onRequestClose={() => setViewingDocument(null)}>
          <View style={styles.imageViewerOverlay}>
            <View style={styles.imageViewerHeader}>
              <View style={styles.imageViewerTitleGroup}>
                <Text style={styles.imageViewerTitle} numberOfLines={1}>
                  {viewingDocument.originalFilename}
                </Text>
                <Text style={styles.imageViewerSub}>
                  {viewingDocument.documentType.toUpperCase()} • {(viewingDocument.fileSize / 1024).toFixed(1)} KB
                </Text>
              </View>
              <TouchableOpacity
                style={styles.imageViewerCloseBtn}
                onPress={() => setViewingDocument(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.imageViewerScroll}
              contentContainerStyle={styles.imageViewerScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{
                  uri: `${api.getBaseUrl()}/documents/${viewingDocument.id}/download?token=${api.getToken()}`,
                  headers: { Authorization: `Bearer ${api.getToken()}` },
                }}
                style={styles.fullInvoiceImage}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.imageViewerFooter}>
              <TouchableOpacity
                style={styles.imageViewerDownloadBtn}
                onPress={() => handleDownloadDocument(viewingDocument)}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={18} color="#0A0A0A" />
                <Text style={styles.imageViewerDownloadBtnText}>Download Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageViewerDoneBtn}
                onPress={() => setViewingDocument(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.imageViewerDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    paddingBottom: 60,
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
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  headerCategory: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passportTag: {
    fontSize: 11,
    color: COLORS.chaiOrange,
    fontWeight: '700',
    marginTop: 1,
  },
  archiveBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.defectPotholeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroCol: {
    flex: 1,
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.chaiAmber,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  applianceTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  modelSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.goodConditionLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goodCondition,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  daysLeftText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.goodCondition,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qrActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.chaiOrange,
    paddingVertical: 12,
    borderRadius: 12,
  },
  qrActionText: {
    color: '#0A0A0A',
    fontWeight: '800',
    fontSize: 13,
  },
  serviceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.chaiOrangeLight,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.chaiOrangeGlow,
  },
  serviceActionText: {
    color: COLORS.chaiOrange,
    fontWeight: '800',
    fontSize: 13,
  },
  analyticsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.chaiOrangeGlow,
    marginBottom: 16,
  },
  analyticsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  analyticsHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gaugeContainer: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  gaugeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gaugeFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tcoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tcoBox: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  tcoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tcoValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  addServiceLink: {
    fontSize: 13,
    color: COLORS.chaiOrange,
    fontWeight: '700',
  },
  docCountBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  specValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bgSecondary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  docSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyNote: {
    fontSize: 12,
    color: COLORS.textDarkMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  emptyServicesBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyServicesText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(254, 110, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chaiOrange,
  },
  docCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  docTypeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(254, 110, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.goodCondition,
  },
  imageThumbnailContainer: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    marginVertical: 6,
  },
  docThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  thumbnailOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pdfPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    marginVertical: 6,
  },
  pdfBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBannerInfo: {
    flex: 1,
  },
  pdfBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pdfBannerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  docActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  viewDocActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 110, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.3)',
  },
  viewDocActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.chaiOrange,
  },
  downloadDocActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.chaiOrange,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  downloadDocActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A0A0A',
  },
  emptyDocUploadCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.borderLight,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  emptyDocTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  emptyDocSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  uploadBillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.chaiOrange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadBillPillText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '800',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    paddingTop: 44,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  imageViewerTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  imageViewerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  imageViewerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  imageViewerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageViewerScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  fullInvoiceImage: {
    width: '100%',
    height: 520,
  },
  imageViewerFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  imageViewerDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.chaiOrange,
    borderRadius: 12,
    paddingVertical: 14,
  },
  imageViewerDownloadBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '800',
  },
  imageViewerDoneBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
