import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../theme/colors';
import { ApplianceCategory } from '../types';

interface AddApplianceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    data: {
      name: string;
      category: ApplianceCategory;
      brand: string;
      modelNumber: string;
      serialNumber?: string;
      purchasePrice?: number;
      seller?: string;
      purchaseDate?: string;
      warrantyStartDate?: string;
      warrantyEndDate?: string;
      notes?: string;
    },
    invoiceUri?: string,
    invoiceName?: string
  ) => Promise<void>;
}

const CATEGORIES: ApplianceCategory[] = [
  'Air Conditioner',
  'Refrigerator',
  'Washing Machine',
  'Television',
  'RO Water Purifier',
  'Geyser / Water Heater',
  'Microwave Oven',
  'Air Purifier',
  'Chimney',
  'Inverter / UPS',
  'Other',
];

export const AddApplianceModal: React.FC<AddApplianceModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ApplianceCategory>('Refrigerator');
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [seller, setSeller] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [notes, setNotes] = useState('');
  const [invoiceUri, setInvoiceUri] = useState<string | null>(null);
  const [invoiceName, setInvoiceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickInvoice = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.55,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setInvoiceUri(res.assets[0].uri);
        setInvoiceName(res.assets[0].fileName || 'purchase_invoice.jpg');
      }
    } catch (err: any) {
      console.warn('Pick invoice error:', err?.message || err);
      Alert.alert('Error', 'Could not open image library');
    }
  };

  const handleCaptureInvoice = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to photograph the bill/invoice.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.55,
        allowsEditing: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setInvoiceUri(res.assets[0].uri);
        setInvoiceName(res.assets[0].fileName || 'invoice_camera.jpg');
      }
    } catch (err: any) {
      console.warn('Capture invoice error:', err?.message || err);
      Alert.alert('Error', 'Could not open camera to capture invoice');
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setInvoiceUri(res.assets[0].uri);
        setInvoiceName(res.assets[0].name || 'invoice_bill.pdf');
      }
    } catch (err: any) {
      console.warn('Pick document error:', err?.message || err);
      Alert.alert('Error', 'Could not open document picker');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter appliance name');
      return;
    }
    if (!brand.trim()) {
      Alert.alert('Required', 'Please enter brand (Samsung, LG, Voltas)');
      return;
    }
    if (!modelNumber.trim()) {
      Alert.alert('Required', 'Please enter model number');
      return;
    }

    setLoading(true);
    try {
      // Calculate warranty end date from purchase date and warranty months
      let warrantyEndStr: string | undefined = undefined;
      if (purchaseDate && warrantyMonths) {
        const pDate = new Date(purchaseDate);
        if (!isNaN(pDate.getTime())) {
          const eDate = new Date(pDate);
          eDate.setMonth(eDate.getMonth() + parseInt(warrantyMonths, 10));
          warrantyEndStr = eDate.toISOString().slice(0, 10);
        }
      }

      await onSubmit(
        {
          name: name.trim(),
          category,
          brand: brand.trim(),
          modelNumber: modelNumber.trim(),
          serialNumber: serialNumber.trim() || undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          seller: seller.trim() || undefined,
          purchaseDate,
          warrantyStartDate: purchaseDate,
          warrantyEndDate: warrantyEndStr,
          notes: notes.trim() || undefined,
        },
        invoiceUri || undefined,
        invoiceName || undefined
      );

      // Reset form
      setName('');
      setBrand('');
      setModelNumber('');
      setSerialNumber('');
      setPurchasePrice('');
      setSeller('');
      setNotes('');
      setInvoiceUri(null);
      setInvoiceName(null);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save appliance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Home Appliance</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Category Pill Selector */}
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, isSelected && styles.catPillSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        isSelected && styles.catPillTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Appliance Name */}
            <Text style={styles.fieldLabel}>Appliance Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Living Room AC, Double Door Refrigerator"
              placeholderTextColor={COLORS.textDarkMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Brand & Model */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Brand *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="LG, Daikin"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Model Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="FTKF50TV16U"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={modelNumber}
                  onChangeText={setModelNumber}
                />
              </View>
            </View>

            {/* Serial Number & Price in INR */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Serial Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="SN-882910"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Price in INR (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="42500"
                  placeholderTextColor={COLORS.textDarkMuted}
                  keyboardType="numeric"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                />
              </View>
            </View>

            {/* Purchase Date & Warranty Duration */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Purchase Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textDarkMuted}
                  value={purchaseDate}
                  onChangeText={setPurchaseDate}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Warranty (Months)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12"
                  placeholderTextColor={COLORS.textDarkMuted}
                  keyboardType="numeric"
                  value={warrantyMonths}
                  onChangeText={setWarrantyMonths}
                />
              </View>
            </View>

            {/* Store / Seller */}
            <Text style={styles.fieldLabel}>Store / Seller (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Reliance Digital, Amazon India"
              placeholderTextColor={COLORS.textDarkMuted}
              value={seller}
              onChangeText={setSeller}
            />

            {/* Purchase Bill / Invoice Upload */}
            <Text style={styles.fieldLabel}>Purchase Bill / Invoice (Image or PDF)</Text>
            {invoiceUri ? (
              <View style={styles.invoicePreviewCard}>
                {invoiceName?.toLowerCase().endsWith('.pdf') ? (
                  <View style={styles.pdfThumbnailBox}>
                    <Ionicons name="document-text" size={24} color="#FF4D4F" />
                    <Text style={styles.pdfBadgeText}>PDF</Text>
                  </View>
                ) : (
                  <Image source={{ uri: invoiceUri }} style={styles.invoiceThumbnail} />
                )}
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNameText} numberOfLines={1}>
                    {invoiceName || 'Invoice Document Attached'}
                  </Text>
                  <Text style={styles.invoiceSuccessText}>✓ Attached — will upload to vault</Text>
                </View>
                <TouchableOpacity
                  style={styles.invoiceRemoveBtn}
                  onPress={() => {
                    setInvoiceUri(null);
                    setInvoiceName(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadBtnRow}>
                <TouchableOpacity
                  style={styles.uploadActionBtn}
                  onPress={handleCaptureInvoice}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={16} color={COLORS.chaiOrange} />
                  <Text style={styles.uploadActionText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadActionBtn}
                  onPress={handlePickInvoice}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={16} color={COLORS.chaiOrange} />
                  <Text style={styles.uploadActionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadActionBtn}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text-outline" size={16} color={COLORS.chaiOrange} />
                  <Text style={styles.uploadActionText}>PDF / Doc</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.fieldLabel}>Notes & Warranty Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional warranty terms, extended warranty info, etc."
              placeholderTextColor={COLORS.textDarkMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.85 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#0A0A0A" />
                  <Text style={styles.submitBtnText}>
                    {invoiceUri ? 'Uploading Invoice & Saving...' : 'Saving to Vault...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Save Appliance to Vault</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    maxHeight: '94%',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    height: 'auto',
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  catPill: {
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
  catPillSelected: {
    backgroundColor: COLORS.chaiOrangeLight,
    borderColor: COLORS.chaiOrange,
  },
  catPillText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  catPillTextSelected: {
    color: COLORS.chaiOrange,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.chaiOrange,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
  },
  uploadBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  uploadActionBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(254, 110, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  uploadActionText: {
    color: COLORS.chaiOrange,
    fontSize: 13,
    fontWeight: '700',
  },
  invoicePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(254, 110, 0, 0.4)',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    marginBottom: 4,
  },
  invoiceThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#000000',
  },
  pdfThumbnailBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadgeText: {
    color: '#FF4D4F',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  invoiceSuccessText: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 2,
    fontWeight: '600',
  },
  invoiceRemoveBtn: {
    padding: 6,
  },
});
