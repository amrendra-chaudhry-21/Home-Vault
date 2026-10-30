import { Platform } from 'react-native';
import {
  User,
  Household,
  Appliance,
  ServiceRecord,
  Reminder,
  DocumentItem,
  DashboardData,
  ApplianceCategory,
} from '../types';

// Production AWS Backend URL (Connected to AWS EC2 t2.micro)
export const PROD_BACKEND_URL = 'http://3.25.133.140:5001/api/v1';

// Default host LAN IP for local testing on physical devices (e.g., Samsung Galaxy S25) and emulators
const DEFAULT_LAN_IP = '192.168.1.9';

const getDefaultBaseUrl = () => {
  if (PROD_BACKEND_URL && PROD_BACKEND_URL.trim().length > 0) {
    let clean = PROD_BACKEND_URL.trim();
    if (!clean.endsWith('/api/v1')) {
      clean = clean.replace(/\/+$/, '') + '/api/v1';
    }
    return clean;
  }
  if (Platform.OS === 'android') {
    // 192.168.1.9 is accessible from both physical devices on Wi-Fi and Android emulator
    return `http://${DEFAULT_LAN_IP}:5001/api/v1`;
  }
  return 'http://localhost:5001/api/v1';
};

export let API_BASE_URL = getDefaultBaseUrl();

class ApiService {
  private baseUrl: string = getDefaultBaseUrl();
  private token: string | null = null;
  private refreshToken: string | null = null;
  private currentHouseholdId: string | null = null;
  private onTokensUpdated?: (accessToken: string, refreshToken: string) => void;
  private onSessionExpired?: () => void;
  private refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

  setBaseUrl(url: string) {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    if (!clean.endsWith('/api/v1')) {
      clean = clean.replace(/\/+$/, '') + '/api/v1';
    }
    this.baseUrl = clean;
    API_BASE_URL = clean;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setOnTokensUpdated(callback: (accessToken: string, refreshToken: string) => void) {
    this.onTokensUpdated = callback;
  }

  setOnSessionExpired(callback: () => void) {
    this.onSessionExpired = callback;
  }

  setCurrentHouseholdId(id: string | null) {
    this.currentHouseholdId = id;
  }

  getCurrentHouseholdId(): string | null {
    return this.currentHouseholdId;
  }

  async refreshAuthTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (!this.refreshToken) {
      return null;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const url = `${this.baseUrl}/auth/refresh`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('[ApiService] Refresh token rejected with status:', response.status);
          return null;
        }

        const json = await response.json();
        const data = json?.data;
        if (data?.accessToken && data?.refreshToken) {
          this.setToken(data.accessToken);
          this.setRefreshToken(data.refreshToken);
          if (this.onTokensUpdated) {
            this.onTokensUpdated(data.accessToken, data.refreshToken);
          }
          return {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        }
        return null;
      } catch (err: any) {
        console.warn('[ApiService] refreshAuthTokens network/execution error:', err?.message || err);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<{ success: boolean; data: T; message?: string }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const isAuthEndpoint =
        endpoint.startsWith('/auth/login') ||
        endpoint.startsWith('/auth/register') ||
        endpoint.startsWith('/auth/refresh') ||
        endpoint.startsWith('/auth/forgot-password') ||
        endpoint.startsWith('/auth/reset-password');

      // If access token expired (HTTP 401), attempt transparent token refresh once
      if (response.status === 401 && !isRetry && !isAuthEndpoint && this.refreshToken) {
        console.log(`[ApiService] 401 received on ${endpoint}, attempting token refresh...`);
        const refreshed = await this.refreshAuthTokens();
        if (refreshed) {
          // Retry the original request with updated access token
          return this.request<T>(endpoint, options, true);
        } else {
          console.warn('[ApiService] Token refresh failed. Calling session expired callback.');
          if (this.onSessionExpired) {
            this.onSessionExpired();
          }
        }
      }

      const rawText = await response.text();
      let json: any = null;
      try {
        json = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned unexpected non-JSON response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(
          json?.error?.message || json?.message || `Request failed with HTTP status ${response.status}`
        );
      }

      return json;
    } catch (error: any) {
      let dynamicMsg = error?.message || 'Network communication failure';
      if (error?.name === 'AbortError') {
        dynamicMsg = 'Connection timed out. Please check backend server and Wi-Fi connectivity.';
      }
      console.warn(`[API] ${options.method || 'GET'} ${endpoint} failed:`, dynamicMsg);
      throw new Error(dynamicMsg);
    }
  }

  // --- Auth Endpoints ---
  async register(data: { email: string; password: string; displayName: string }) {
    const res = await this.request<{
      accessToken: string;
      refreshToken: string;
      defaultHouseholdId: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.data.accessToken);
    this.setRefreshToken(res.data.refreshToken);
    this.setCurrentHouseholdId(res.data.defaultHouseholdId);
    return res.data;
  }

  async login(data: { email: string; password: string }) {
    const res = await this.request<{
      accessToken: string;
      refreshToken: string;
      defaultHouseholdId?: string;
      household?: Household | null;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.data.accessToken);
    this.setRefreshToken(res.data.refreshToken);
    if (res.data.defaultHouseholdId) {
      this.setCurrentHouseholdId(res.data.defaultHouseholdId);
    }
    return res.data;
  }

  async getMe(): Promise<User> {
    const res = await this.request<User>('/auth/me');
    return res.data;
  }

  async logout(): Promise<void> {
    const tokenToRevoke = this.refreshToken;
    try {
      if (tokenToRevoke) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          body: JSON.stringify({ refreshToken: tokenToRevoke }),
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[ApiService] Server logout notice:', err?.message || err);
    } finally {
      this.setToken(null);
      this.setRefreshToken(null);
      this.setCurrentHouseholdId(null);
    }
  }

  // --- Household Endpoints ---
  async getHouseholds(): Promise<Household[]> {
    const res = await this.request<Household[]>('/households');
    return res.data;
  }

  async createHousehold(data: { name: string; address?: string }): Promise<Household> {
    const res = await this.request<Household>('/households', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async getDashboard(householdId: string): Promise<DashboardData> {
    const res = await this.request<DashboardData>(`/households/${householdId}/dashboard`);
    return res.data;
  }

  // --- Appliance Endpoints ---
  async getAppliances(
    householdId: string,
    params?: { category?: string; search?: string; warrantyStatus?: string }
  ): Promise<Appliance[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.warrantyStatus) query.append('warrantyStatus', params.warrantyStatus);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<Appliance[]>(
      `/households/${householdId}/appliances${queryString}`
    );
    return res.data;
  }

  async getAppliance(applianceId: string): Promise<
    Appliance & {
      services: ServiceRecord[];
      documents: DocumentItem[];
      reminders: Reminder[];
    }
  > {
    const res = await this.request<any>(`/appliances/${applianceId}`);
    return res.data;
  }

  async createAppliance(
    householdId: string,
    data: {
      name: string;
      category: ApplianceCategory;
      brand: string;
      modelNumber: string;
      serialNumber?: string;
      purchaseDate?: string;
      warrantyStartDate?: string;
      warrantyEndDate?: string;
      purchasePrice?: number;
      seller?: string;
      notes?: string;
    }
  ): Promise<Appliance> {
    const res = await this.request<Appliance>(`/households/${householdId}/appliances`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async updateAppliance(
    applianceId: string,
    data: Partial<Appliance>
  ): Promise<Appliance> {
    const res = await this.request<Appliance>(`/appliances/${applianceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async archiveAppliance(applianceId: string): Promise<void> {
    await this.request(`/appliances/${applianceId}`, { method: 'DELETE' });
  }

  // --- Document / Invoice Endpoints ---
  async uploadDocument(
    applianceId: string,
    fileUri: string,
    filename: string,
    documentType: string = 'invoice'
  ): Promise<any> {
    const uploadUrl = `${this.baseUrl}/appliances/${applianceId}/documents`;
    const lower = filename.toLowerCase();
    const type = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.pdf')
      ? 'application/pdf'
      : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.timeout = 30000;

      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            resolve(parsed.data || parsed);
          } catch {
            resolve({ success: true, message: 'Document uploaded successfully' });
          }
        } else {
          try {
            const errJson = JSON.parse(xhr.responseText);
            reject(new Error(errJson.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(
          new Error('Network connection error during document upload. Please check backend connection.')
        );
      };

      xhr.ontimeout = () => {
        reject(new Error('Document upload request timed out after 30 seconds.'));
      };

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: filename,
        type,
      } as any);
      formData.append('documentType', documentType);

      xhr.send(formData);
    });
  }

  // --- Service History Endpoints ---
  async getApplianceServices(applianceId: string): Promise<ServiceRecord[]> {
    const res = await this.request<ServiceRecord[]>(`/appliances/${applianceId}/services`);
    return res.data;
  }

  async createService(
    applianceId: string,
    data: {
      serviceDate: string;
      issueDescription: string;
      workPerformed: string;
      cost?: number;
      technicianName?: string;
      providerName?: string;
      notes?: string;
      nextServiceDate?: string;
    }
  ): Promise<ServiceRecord> {
    const res = await this.request<ServiceRecord>(`/appliances/${applianceId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  // --- Reminder Endpoints ---
  async getReminders(householdId: string, status?: string): Promise<Reminder[]> {
    const queryString = status ? `?status=${status}` : '';
    const res = await this.request<Reminder[]>(
      `/households/${householdId}/reminders${queryString}`
    );
    return res.data;
  }

  async updateReminderStatus(
    reminderId: string,
    status: 'completed' | 'dismissed' | 'pending'
  ): Promise<void> {
    await this.request(`/reminders/${reminderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // --- QR Code Endpoints ---
  async generateQR(applianceId: string): Promise<{
    token: string;
    qrDataUrl: string;
    applianceId: string;
    applianceName: string;
    brand: string;
  }> {
    const res = await this.request<any>(`/appliances/${applianceId}/qr`, {
      method: 'POST',
    });
    return res.data;
  }

  async resolveQR(token: string): Promise<{
    applianceId: string;
    householdId: string;
    name: string;
    brand: string;
    category: ApplianceCategory;
    modelNumber: string;
  }> {
    const res = await this.request<any>(`/qr/${token}`);
    return res.data;
  }

  // --- Push Notifications (Firebase FCM - 100% Free) ---
  async registerFCMToken(token: string): Promise<void> {
    await this.request('/users/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async testDispatchAlerts(): Promise<{ remindersSent: number; warrantyAlertsSent: number }> {
    const res = await this.request<any>('/reminders/dispatch-alerts', {
      method: 'POST',
    });
    return res.data;
  }
}

export const api = new ApiService();
