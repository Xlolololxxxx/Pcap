import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetworkRequest, HostSession, FilterConfig } from "./types";

const STORAGE_KEYS = {
  REQUESTS: "@pcapdroid/requests",
  SESSIONS: "@pcapdroid/sessions",
  FILTERS: "@pcapdroid/filters",
  SETTINGS: "@pcapdroid/settings",
};

export const storage = {
  async saveRequests(requests: NetworkRequest[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    } catch (error) {
      console.error("Failed to save requests:", error);
    }
  },

  async loadRequests(): Promise<NetworkRequest[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REQUESTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to load requests:", error);
      return [];
    }
  },

  async saveSessions(sessions: Record<string, HostSession>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save sessions:", error);
    }
  },

  async loadSessions(): Promise<Record<string, HostSession>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Failed to load sessions:", error);
      return {};
    }
  },

  async saveFilters(filters: FilterConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save filters:", error);
    }
  },

  async loadFilters(): Promise<FilterConfig> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FILTERS);
      return data ? JSON.parse(data) : {
        ipAddresses: [],
        hostnames: [],
        protocols: [],
        endpoints: [],
        methods: [],
      };
    } catch (error) {
      console.error("Failed to load filters:", error);
      return {
        ipAddresses: [],
        hostnames: [],
        protocols: [],
        endpoints: [],
        methods: [],
      };
    }
  },

  async saveSettings(settings: { port: number }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },

  async loadSettings(): Promise<{ port: number }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : { port: 5000 };
    } catch (error) {
      console.error("Failed to load settings:", error);
      return { port: 5000 };
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.REQUESTS,
        STORAGE_KEYS.SESSIONS,
        STORAGE_KEYS.FILTERS,
      ]);
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  },

  async clearRequests(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.REQUESTS);
    } catch (error) {
      console.error("Failed to clear requests:", error);
    }
  },

  async clearSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSIONS);
    } catch (error) {
      console.error("Failed to clear sessions:", error);
    }
  },
};
