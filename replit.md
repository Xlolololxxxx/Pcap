# PCAPdroid Analyzer

A React Native (Expo) Android application that integrates with PCAPdroid's TCP/UDP exporter functionality for network traffic analysis and security scanning.

## Overview

This app captures and analyzes network traffic exported from PCAPdroid, providing:
- Real-time traffic capture and display
- Per-host session memory for credentials
- Comprehensive filtering by IP, hostname, protocol, and endpoint
- Sensitive information scanner to detect exposed secrets

## Features

### Live Capture
- Receives TCP/UDP exported traffic from PCAPdroid
- Displays requests in real-time with method, host, path details
- Color-coded HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Protocol indicators (HTTPS/HTTP)

### Hosts View
- Groups all requests by host
- Shows request count and last activity per host
- Quick access to host-specific session data
- Search functionality

### Sessions
- Stores authentication tokens, cookies, and headers per host
- Auto-detects Bearer tokens, Basic auth, and API keys
- Export session data as JSON
- Clear individual or all sessions

### Scanner (Secret Detection)
- Scans all captured requests for sensitive information
- Uses 40+ regex patterns from gitleaks/trufflehog
- Detects: API keys, passwords, tokens, certificates, credentials, cloud configs, database URIs
- Severity levels: Critical, High, Medium, Low
- Detailed findings with context and recommendations

### Settings
- Configurable capture port
- Clear requests/sessions/all data
- App information

## Architecture

```
/
├── App.tsx                     # Main app entry with providers
├── navigation/
│   ├── MainTabNavigator.tsx    # Bottom tab navigation
│   ├── CaptureStackNavigator.tsx
│   ├── HostsStackNavigator.tsx
│   ├── SessionsStackNavigator.tsx
│   ├── ScannerStackNavigator.tsx
│   └── SettingsStackNavigator.tsx
├── screens/
│   ├── CaptureScreen.tsx       # Live traffic capture
│   ├── HostsScreen.tsx         # Host list
│   ├── HostDetailScreen.tsx    # Host details
│   ├── SessionsScreen.tsx      # Session management
│   ├── SessionDetailScreen.tsx # Session details
│   ├── ScannerScreen.tsx       # Secret scanner
│   ├── ScanResultDetailScreen.tsx
│   ├── RequestDetailScreen.tsx # Request details
│   ├── FiltersScreen.tsx       # Traffic filters
│   └── SettingsScreen.tsx      # App settings
├── store/
│   ├── types.ts                # TypeScript interfaces
│   ├── storage.ts              # AsyncStorage helpers
│   ├── useAppStore.ts          # Zustand-like store
│   └── secretPatterns.ts       # Regex patterns for secrets
├── components/
│   └── ...                     # Reusable UI components
├── constants/
│   └── theme.ts                # Colors, spacing, typography
└── hooks/
    └── ...                     # Custom React hooks
```

## Design Theme

Dark terminal theme with:
- Background: #1a1a2e (root), #16213e (cards)
- Accent: #00ff00 (green terminal)
- Method colors: GET (green), POST (red), PUT (orange), DELETE (dark red), PATCH (purple)
- Severity colors: Critical (red), High (orange), Medium (yellow), Low (blue)

## Secret Detection Patterns

The scanner uses patterns inspired by gitleaks and trufflehog to detect:
- **Cloud**: AWS keys, Azure connections, GCP service accounts
- **API Keys**: OpenAI, Stripe, Google, Twilio, SendGrid, Firebase
- **Tokens**: JWT, Bearer, GitHub, Slack, Discord, NPM, Telegram
- **Credentials**: Basic auth, passwords, database URIs
- **Certificates**: RSA, DSA, EC, OpenSSH private keys
- **Config**: Internal IPs, environment variables

## Usage

1. Configure PCAPdroid to export traffic via TCP/UDP to this app's port (default: 5000)
2. Start capture in the app
3. Monitor traffic in real-time on the Capture tab
4. View host-specific data in the Hosts tab
5. Check stored credentials in the Sessions tab
6. Run security scans in the Scanner tab
7. Configure settings as needed

## Development

- Built with Expo (React Native)
- Uses AsyncStorage for data persistence
- Supports Android via Expo Go
- Web version available for testing
