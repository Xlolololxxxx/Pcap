import { useState, useEffect, useCallback } from "react";
import { NetworkRequest, HostSession, FilterConfig } from "./types";
import { storage } from "./storage";

let globalRequests: NetworkRequest[] = [];
let globalSessions: Record<string, HostSession> = {};
let globalFilters: FilterConfig = {
  ipAddresses: [],
  hostnames: [],
  protocols: [],
  endpoints: [],
  methods: [],
  regexPatterns: [],
  bodySearch: "",
};
let globalIsCapturing = false;
let globalPort = 5000;
let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export function useAppStore() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const loadData = useCallback(async () => {
    const [requests, sessions, filters, settings] = await Promise.all([
      storage.loadRequests(),
      storage.loadSessions(),
      storage.loadFilters(),
      storage.loadSettings(),
    ]);
    globalRequests = requests;
    globalSessions = sessions;
    globalFilters = filters;
    globalPort = settings.port;
    notifyListeners();
  }, []);

  const addRequest = useCallback((request: NetworkRequest) => {
    globalRequests = [request, ...globalRequests].slice(0, 1000);
    storage.saveRequests(globalRequests);
    
    const session = globalSessions[request.host] || {
      host: request.host,
      headers: {},
      cookies: {},
      authTokens: [],
      lastUpdated: Date.now(),
    };

    const authHeader = request.headers["authorization"] || request.headers["Authorization"];
    if (authHeader && !session.authTokens.includes(authHeader)) {
      session.authTokens = [...session.authTokens, authHeader];
    }

    const cookieHeader = request.headers["cookie"] || request.headers["Cookie"];
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [key, value] = cookie.split("=").map((s) => s.trim());
        if (key && value) {
          session.cookies[key] = value;
        }
      });
    }

    Object.entries(request.headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("auth") ||
        lowerKey.includes("token") ||
        lowerKey.includes("api-key") ||
        lowerKey.includes("x-")
      ) {
        session.headers[key] = value;
      }
    });

    session.lastUpdated = Date.now();
    globalSessions = { ...globalSessions, [request.host]: session };
    storage.saveSessions(globalSessions);
    notifyListeners();
  }, []);

  const clearRequests = useCallback(async () => {
    globalRequests = [];
    await storage.clearRequests();
    notifyListeners();
  }, []);

  const clearSessions = useCallback(async () => {
    globalSessions = {};
    await storage.clearSessions();
    notifyListeners();
  }, []);

  const clearHostSession = useCallback(async (host: string) => {
    const { [host]: _, ...rest } = globalSessions;
    globalSessions = rest;
    await storage.saveSessions(globalSessions);
    notifyListeners();
  }, []);

  const updateFilters = useCallback(async (filters: FilterConfig) => {
    globalFilters = filters;
    await storage.saveFilters(filters);
    notifyListeners();
  }, []);

  const setCapturing = useCallback((isCapturing: boolean) => {
    globalIsCapturing = isCapturing;
    notifyListeners();
  }, []);

  const setPort = useCallback(async (port: number) => {
    globalPort = port;
    await storage.saveSettings({ port });
    notifyListeners();
  }, []);

  const getFilteredRequests = useCallback(() => {
    return globalRequests.filter((request) => {
      if (globalFilters.ipAddresses.length > 0) {
        if (!globalFilters.ipAddresses.some((ip) => request.ip.includes(ip))) {
          return false;
        }
      }
      if (globalFilters.hostnames.length > 0) {
        if (!globalFilters.hostnames.some((h) => request.host.toLowerCase().includes(h.toLowerCase()))) {
          return false;
        }
      }
      if (globalFilters.protocols.length > 0) {
        if (!globalFilters.protocols.includes(request.protocol.toUpperCase())) {
          return false;
        }
      }
      if (globalFilters.endpoints.length > 0) {
        if (!globalFilters.endpoints.some((e) => request.path.toLowerCase().includes(e.toLowerCase()))) {
          return false;
        }
      }
      if (globalFilters.methods.length > 0) {
        if (!globalFilters.methods.includes(request.method.toUpperCase())) {
          return false;
        }
      }
      if (globalFilters.regexPatterns.length > 0) {
        const matchesRegex = globalFilters.regexPatterns.some((pattern) => {
          try {
            const regex = new RegExp(pattern, "i");
            return regex.test(request.path) || regex.test(request.host);
          } catch {
            return false;
          }
        });
        if (!matchesRegex) return false;
      }
      if (globalFilters.bodySearch) {
        const bodyContent = (request.body || "") + (request.response?.body || "");
        if (!bodyContent.toLowerCase().includes(globalFilters.bodySearch.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, []);

  const getHostsWithRequests = useCallback(() => {
    const hostMap = new Map<string, { host: string; requests: NetworkRequest[]; lastActivity: number }>();
    
    globalRequests.forEach((request) => {
      const existing = hostMap.get(request.host);
      if (existing) {
        existing.requests.push(request);
        existing.lastActivity = Math.max(existing.lastActivity, request.timestamp);
      } else {
        hostMap.set(request.host, {
          host: request.host,
          requests: [request],
          lastActivity: request.timestamp,
        });
      }
    });

    return Array.from(hostMap.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }, []);

  const getRequestById = useCallback((id: string) => {
    return globalRequests.find((r) => r.id === id);
  }, []);

  const exportAsJSON = useCallback(() => {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalRequests: globalRequests.length,
      requests: globalRequests,
      sessions: globalSessions,
    }, null, 2);
  }, []);

  const exportAsHAR = useCallback(() => {
    const entries = globalRequests.map((req) => ({
      startedDateTime: new Date(req.timestamp).toISOString(),
      time: 0,
      request: {
        method: req.method,
        url: `${req.protocol}://${req.host}:${req.port}${req.path}`,
        httpVersion: "HTTP/1.1",
        headers: Object.entries(req.headers).map(([name, value]) => ({ name, value })),
        queryString: [],
        cookies: [],
        headersSize: 0,
        bodySize: req.body.length,
        postData: req.body ? { mimeType: "application/json", text: req.body } : undefined,
      },
      response: req.response ? {
        status: req.response.statusCode,
        statusText: "OK",
        httpVersion: "HTTP/1.1",
        headers: Object.entries(req.response.headers).map(([name, value]) => ({ name, value })),
        cookies: [],
        content: { size: req.response.body.length, mimeType: "application/json", text: req.response.body },
        redirectURL: "",
        headersSize: 0,
        bodySize: req.response.body.length,
      } : { status: 0, statusText: "", httpVersion: "HTTP/1.1", headers: [], cookies: [], content: { size: 0, mimeType: "", text: "" }, redirectURL: "", headersSize: 0, bodySize: 0 },
      cache: {},
      timings: { blocked: 0, dns: 0, connect: 0, send: 0, wait: 0, receive: 0 },
    }));
    
    return JSON.stringify({
      log: {
        version: "1.2.0",
        creator: { name: "PCAPdroid Analyzer", version: "1.0.0" },
        entries,
      },
    }, null, 2);
  }, []);

  return {
    requests: globalRequests,
    sessions: globalSessions,
    filters: globalFilters,
    isCapturing: globalIsCapturing,
    port: globalPort,
    loadData,
    addRequest,
    clearRequests,
    clearSessions,
    clearHostSession,
    updateFilters,
    setCapturing,
    setPort,
    getFilteredRequests,
    getHostsWithRequests,
    getRequestById,
    exportAsJSON,
    exportAsHAR,
  };
}
