# Design Guidelines: PCAPdroid Network Analyzer

## Application Architecture

### Authentication
**No Authentication Required**
- This is a local network analysis tool with no cloud sync
- Include a Settings screen with:
  - App preferences (theme, capture port configuration)
  - Session data management (clear all sessions)
  - Export/import session data functionality

### Navigation Structure
**Drawer Navigation** (recommended for this app type)
- **Primary Navigation:**
  - Home/Live Capture (default screen)
  - Hosts List (organized view of all captured hosts)
  - Session Data (credential/header storage view)
  - Filters (manage active filters)
  - Settings

**Rationale:** The app manages multiple data views (live capture, historical hosts, filters, sessions) making drawer navigation ideal for quick switching between analysis modes.

### Screen Specifications

#### 1. Live Capture Screen
- **Purpose:** Real-time display of incoming network requests from PCAPdroid
- **Header:** 
  - Title: "Live Capture"
  - Right button: Filter icon (opens filter sheet)
  - Subtitle showing capture status (e.g., "Listening on port 5000" or "Not capturing")
- **Layout:**
  - Floating action button (FAB) for start/stop capture toggle
  - Scrollable list of requests (newest at top)
  - Connection status banner at top (collapsible)
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: Spacing.xl

#### 2. Hosts Screen
- **Purpose:** Grouped view of all captured hosts with request counts
- **Header:**
  - Title: "Hosts"
  - Right button: Sort/group options
  - Search bar for host filtering
- **Layout:**
  - Scrollable list of expandable host cards
  - Each host shows: hostname/IP, request count, protocol badges, last activity timestamp
- **Safe Area:** Top: headerHeight + searchBarHeight + Spacing.xl, Bottom: Spacing.xl

#### 3. Request Detail Screen (Modal)
- **Purpose:** Full request/response inspection
- **Header:**
  - Title: Request method + truncated path
  - Left: Close button
  - Right: Share/export button
- **Layout:**
  - Tabbed interface (Request, Response, Session Data)
  - Scrollable form-like content area
  - Fixed bottom action bar (Replay, Save to Session)
- **Safe Area:** Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl

#### 4. Filters Screen
- **Purpose:** Configure active filters for display
- **Header:**
  - Title: "Filters"
  - Right: Reset all button
- **Layout:**
  - Scrollable form with filter sections:
    - IP Address filter (text input with chip display)
    - Hostname filter (text input with autocomplete)
    - Protocol filter (checkboxes: HTTP, HTTPS, WS, etc.)
    - Endpoint path filter (regex input)
  - Save button below form
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: Spacing.xl

#### 5. Session Data Screen
- **Purpose:** View and manage stored credentials/headers per host
- **Header:**
  - Title: "Session Data"
  - Right: Clear all button (with confirmation)
- **Layout:**
  - Scrollable list of hosts with stored session data
  - Expandable cards showing stored headers, cookies, auth tokens
  - Swipe-to-delete on individual entries
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: Spacing.xl

## Design System

### Color Palette (Dark Terminal Theme)
**Primary Colors:**
- Background Primary: `#1a1a2e` (deep navy)
- Background Secondary: `#16213e` (dark blue)
- Background Tertiary: `#0f3460` (medium blue)
- Accent Green: `#00ff00` (terminal green - primary actions)
- Accent Red: `#e94560` (errors, DELETE method)
- Accent Yellow: `#ffd700` (warnings, active states)

**HTTP Method Colors:**
- GET: `#27ae60` (green)
- POST: `#e94560` (red)
- PUT: `#f39c12` (orange)
- DELETE: `#c0392b` (dark red)
- PATCH: `#9b59b6` (purple)

**Text Colors:**
- Primary Text: `#eeeeee`
- Secondary Text: `#aaaaaa`
- Tertiary Text: `#888888`
- Code/Monospace: `#cccccc`

### Typography
- **Headers:** System default bold, 18-20sp
- **Body:** System default regular, 14-16sp
- **Monospace (code/data):** Monospace font, 12-13sp
- **Badges/Labels:** System default medium, 11-12sp

### Component Specifications

#### Request List Item
- Padding: 12dp vertical, 16dp horizontal
- Background: Background Secondary with 1dp bottom border (Background Tertiary)
- Method badge: 6dp padding, 3dp border radius, appropriate color
- Host/path text: Monospace, secondary text color
- Timestamp: Small, tertiary text color, right-aligned
- Touchable with ripple effect (Tertiary background on press)

#### Host Card (Expandable)
- Padding: 16dp
- Background: Background Secondary
- Border radius: 8dp
- Margin: 8dp horizontal, 4dp vertical
- Collapsed height: 72dp
- Shows: Host icon, hostname, request count badge, protocol badges, chevron
- Expanded: Nested request list with dividers
- Elevation: 2dp (subtle shadow for floating appearance)

#### Filter Chips (Active Filters)
- Background: Accent Green with 20% opacity
- Text: Accent Green
- Border: 1dp solid Accent Green
- Padding: 6dp horizontal, 4dp vertical
- Border radius: 16dp
- Close icon: Small X on right
- Horizontal scrollable row

#### Floating Action Button (Capture Toggle)
- Size: 56dp diameter
- Background: Accent Green (capturing) / Background Tertiary (stopped)
- Icon: Pause/Play
- Position: Bottom right, 16dp from edges
- Elevation: 6dp with subtle shadow (shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2)

#### Session Data Badge
- Small icon indicator on host cards showing session data exists
- Color: Accent Yellow
- Position: Top right of host card

### Interaction Design
- **All touchable elements:** Material ripple effect with Background Tertiary color
- **Long press on request:** Show context menu (Save to session, Copy URL, Share)
- **Swipe gestures:** Swipe left on request to delete, swipe right to save to session
- **Pull to refresh:** On Live Capture screen to clear old requests
- **Expandable sections:** Smooth animation (200ms) when expanding/collapsing hosts
- **Filter application:** Immediate visual feedback with loading state while filtering

### Accessibility
- Minimum touch target: 48dp × 48dp
- Color contrast ratio: 4.5:1 minimum for all text
- Screen reader support: Proper labels for all interactive elements
- Text scaling: Support up to 200% text size
- Focus indicators: Visible outline on keyboard navigation

### Visual Assets Required
**None.** Use Material Icons from @expo/vector-icons:
- network-wifi (capture status)
- filter-list (filter button)
- dns (host icon)
- http (protocol icon)
- lock/lock-open (HTTPS/HTTP)
- content-copy (copy actions)
- share (share button)
- delete (delete actions)
- play-arrow/pause (capture toggle)