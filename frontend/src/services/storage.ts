import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { User, Household } from '../types';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
  household: Household | null;
  savedAt: number;
}

const SESSION_FILENAME = 'homevault_auth_session.json';
const WEB_STORAGE_KEY = 'homevault_auth_session';

class StorageService {
  private memoryCache: AuthSession | null = null;

  private getSessionFilePath(): string | null {
    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return null;
      return docDir.endsWith('/')
        ? `${docDir}${SESSION_FILENAME}`
        : `${docDir}/${SESSION_FILENAME}`;
    } catch {
      return null;
    }
  }

  async saveSession(session: AuthSession): Promise<void> {
    this.memoryCache = session;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(session));
        }
      } catch (err) {
        console.warn('[Storage] Web localStorage save failed:', err);
      }
      return;
    }

    try {
      const filePath = this.getSessionFilePath();
      if (filePath) {
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(session));
      }
    } catch (err) {
      console.warn('[Storage] Native FileSystem save failed:', err);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    if (this.memoryCache) {
      return this.memoryCache;
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as AuthSession;
            if (parsed && parsed.accessToken) {
              this.memoryCache = parsed;
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn('[Storage] Web localStorage read failed:', err);
      }
      return null;
    }

    try {
      const filePath = this.getSessionFilePath();
      if (!filePath) return null;

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return null;
      }

      const raw = await FileSystem.readAsStringAsync(filePath);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed && parsed.accessToken) {
        this.memoryCache = parsed;
        return parsed;
      }
    } catch (err) {
      console.warn('[Storage] Native FileSystem read failed:', err);
    }

    return null;
  }

  async clearSession(): Promise<void> {
    this.memoryCache = null;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(WEB_STORAGE_KEY);
        }
      } catch (err) {
        console.warn('[Storage] Web localStorage clear failed:', err);
      }
      return;
    }

    try {
      const filePath = this.getSessionFilePath();
      if (filePath) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (err) {
      console.warn('[Storage] Native FileSystem delete failed:', err);
    }
  }

  async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    const session = await this.getSession();
    if (session) {
      session.accessToken = accessToken;
      session.refreshToken = refreshToken;
      session.savedAt = Date.now();
      await this.saveSession(session);
    }
  }

  async updateUser(user: User): Promise<void> {
    const session = await this.getSession();
    if (session) {
      session.user = user;
      session.savedAt = Date.now();
      await this.saveSession(session);
    }
  }

  async updateHousehold(household: Household | null): Promise<void> {
    const session = await this.getSession();
    if (session) {
      session.household = household;
      session.savedAt = Date.now();
      await this.saveSession(session);
    }
  }

  private generalCache: Record<string, any> = {};

  async saveCache(key: string, data: any): Promise<void> {
    this.generalCache[key] = data;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(`hv_cache_${key}`, JSON.stringify(data));
        }
      } catch (err) {
        console.warn(`[Storage] Web cache save failed for ${key}:`, err);
      }
      return;
    }

    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return;
      const filePath = docDir.endsWith('/')
        ? `${docDir}cache_${key}.json`
        : `${docDir}/cache_${key}.json`;
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
    } catch (err) {
      console.warn(`[Storage] Native cache save failed for ${key}:`, err);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    if (this.generalCache[key] !== undefined) {
      return this.generalCache[key] as T;
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(`hv_cache_${key}`);
          if (raw) {
            const parsed = JSON.parse(raw) as T;
            this.generalCache[key] = parsed;
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`[Storage] Web cache read failed for ${key}:`, err);
      }
      return null;
    }

    try {
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return null;
      const filePath = docDir.endsWith('/')
        ? `${docDir}cache_${key}.json`
        : `${docDir}/cache_${key}.json`;

      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) return null;

      const raw = await FileSystem.readAsStringAsync(filePath);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as T;
      this.generalCache[key] = parsed;
      return parsed;
    } catch (err) {
      console.warn(`[Storage] Native cache read failed for ${key}:`, err);
    }

    return null;
  }
}

export const storageService = new StorageService();

