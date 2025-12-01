export interface NetworkRequest {
  id: string;
  timestamp: number;
  method: string;
  host: string;
  ip: string;
  port: number;
  path: string;
  protocol: string;
  headers: Record<string, string>;
  body: string;
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };
}

export interface HostSession {
  host: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  authTokens: string[];
  lastUpdated: number;
}

export interface FilterConfig {
  ipAddresses: string[];
  hostnames: string[];
  protocols: string[];
  endpoints: string[];
  methods: string[];
  regexPatterns: string[];
  bodySearch: string;
}

export interface CaptureState {
  isCapturing: boolean;
  port: number;
  requests: NetworkRequest[];
}

export interface AppState {
  capture: CaptureState;
  sessions: Record<string, HostSession>;
  filters: FilterConfig;
}
