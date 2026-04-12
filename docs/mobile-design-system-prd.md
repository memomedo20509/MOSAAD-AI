# HomeAdvisor CRM — Mobile App Design System & Visual Identity PRD
## v1.0 — April 2026

---

## 1. Overview

This document defines the **exact visual identity** that the mobile app must follow to match the existing HomeAdvisor CRM web application. The mobile app must look and feel like a native extension of the web platform — same colors, same fonts, same design language — while respecting iOS and Android native patterns.

**Golden Rule:** If it looks like it belongs to a different product, it's wrong.

---

## 2. Color System

The entire color system is built on HSL values. Every color has a Light Mode and Dark Mode variant.

### 2.1 Core Colors (EXACT values — do NOT approximate)

| Token | Light Mode (HSL) | Light Mode (HEX) | Dark Mode (HSL) | Dark Mode (HEX) | Usage |
|:---|:---|:---|:---|:---|:---|
| **Primary** | `217 91% 60%` | `#3B82F6` | `217 91% 60%` | `#3B82F6` | Main buttons, active tabs, links, selected states, header accents |
| **Primary Foreground** | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` | Text on primary-colored buttons |
| **Background** | `210 20% 98%` | `#F8FAFC` | `222 47% 11%` | `#0F172A` | Screen background, page background |
| **Foreground** | `222 47% 11%` | `#0F172A` | `210 20% 98%` | `#F8FAFC` | Primary text color |
| **Card** | `0 0% 100%` | `#FFFFFF` | `222 47% 13%` | `#1E293B` | Card backgrounds, list item backgrounds, bottom sheets |
| **Card Foreground** | `222 47% 11%` | `#0F172A` | `210 20% 98%` | `#F8FAFC` | Text inside cards |
| **Card Border** | `214 20% 90%` | `#E2E8F0` | `217 33% 20%` | `#334155` | Card borders, dividers inside cards |
| **Border** | `214 20% 88%` | `#DDE5ED` | `217 33% 17%` | `#293548` | General borders, separators, dividers |
| **Muted** | `210 20% 96%` | `#F1F5F9` | `217 33% 17%` | `#293548` | Disabled backgrounds, skeleton loading, subtle fills |
| **Muted Foreground** | `215 16% 47%` | `#64748B` | `215 20% 65%` | `#94A3B8` | Secondary text, placeholders, timestamps, captions |
| **Secondary** | `214 32% 91%` | `#E2E8F0` | `217 33% 17%` | `#293548` | Secondary buttons, inactive tabs |
| **Secondary Foreground** | `222 47% 11%` | `#0F172A` | `210 20% 98%` | `#F8FAFC` | Text on secondary buttons |
| **Accent** | `214 95% 93%` | `#DBEAFE` | `217 50% 20%` | `#1E3A5F` | Highlighted rows, selected list items, active sidebar items |
| **Accent Foreground** | `217 91% 45%` | `#2563EB` | `214 95% 80%` | `#93C5FD` | Text inside accented/highlighted areas |
| **Destructive** | `0 84% 60%` | `#EF4444` | `0 84% 60%` | `#EF4444` | Delete buttons, error states, destructive actions |
| **Destructive Foreground** | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` | Text on destructive buttons |
| **Input** | `214 20% 88%` | `#DDE5ED` | `217 33% 25%` | `#3B4D66` | Input field borders |
| **Ring** | `217 91% 60%` | `#3B82F6` | `217 91% 60%` | `#3B82F6` | Focus ring around inputs and interactive elements |

### 2.2 Status Colors

| Token | RGB Value | HEX | Usage |
|:---|:---|:---|:---|
| **Online / Success** | `34 197 94` | `#22C55E` | WhatsApp connected, online status, success toasts |
| **Away / Warning** | `245 158 11` | `#F59E0B` | Pending states, stale lead warnings |
| **Busy / Error** | `239 68 68` | `#EF4444` | Offline, errors, overdue items |
| **Offline / Neutral** | `156 163 175` | `#9CA3AF` | Inactive, disconnected, disabled |

### 2.3 Funnel Zone Colors

These colors represent the Sales Funnel zones throughout the app (Kanban, lead state badges, pipeline charts):

| Zone | Light Background | Light Border | Light Text | Dark Background | Dark Border | Dark Text |
|:---|:---|:---|:---|:---|:---|:---|
| **Untouched** (غير متفاعل) | `slate-100` / `#F1F5F9` | `slate-300` / `#CBD5E1` | `slate-600` / `#475569` | `slate-800/50` | `slate-700` / `#334155` | `slate-400` / `#94A3B8` |
| **Active** (تحت المتابعة) | `blue-50` / `#EFF6FF` | `blue-200` / `#BFDBFE` | `blue-600` / `#2563EB` | `blue-950/40` | `blue-900` / `#1E3A8A` | `blue-400` / `#60A5FA` |
| **Won** (تم الفوز) | `green-50` / `#F0FDF4` | `green-200` / `#BBF7D0` | `green-600` / `#16A34A` | `green-950/40` | `green-900` / `#14532D` | `green-400` / `#4ADE80` |
| **Lost** (خسارة) | `red-50` / `#FEF2F2` | `red-200` / `#FECACA` | `red-600` / `#DC2626` | `red-950/40` | `red-900` / `#7F1D1D` | `red-400` / `#F87171` |

### 2.4 Lead Score Colors

| Score | Background | Text | Border | Icon |
|:---|:---|:---|:---|:---|
| **Hot** (ساخن) | `#FEE2E2` (red-100) | `#B91C1C` (red-700) | `#FECACA` (red-200) | Flame 🔥 |
| **Warm** (دافئ) | `#FFEDD5` (orange-100) | `#C2410C` (orange-700) | `#FED7AA` (orange-200) | Thermometer 🌡️ |
| **Cold** (بارد) | `#DBEAFE` (blue-100) | `#1D4ED8` (blue-700) | `#BFDBFE` (blue-200) | Snowflake ❄️ |

### 2.5 Chart Colors (for reports and dashboards)

| Chart Slot | HSL | HEX | Usage |
|:---|:---|:---|:---|
| **Chart 1** | `217 91% 60%` | `#3B82F6` | Primary data series |
| **Chart 2** | `142 71% 45%` | `#22C55E` | Secondary / success |
| **Chart 3** | `38 92% 50%` | `#F59E0B` | Tertiary / warning |
| **Chart 4** | `280 65% 60%` | `#A855F7` | Fourth series |
| **Chart 5** | `0 84% 60%` | `#EF4444` | Fifth series / error |

---

## 3. Typography

### 3.1 Font Family

**Primary Font: Tajawal** (Google Font)
- URL: `https://fonts.google.com/specimen/Tajawal`
- This is a modern Arabic-English sans-serif designed for digital interfaces
- It supports full Arabic script with matching Latin characters
- The web app uses this for ALL text — headings, body, labels, everything

**For React Native**, install the font:
```
npm install @expo-google-fonts/tajawal
```
Or download and embed: `Tajawal-Light`, `Tajawal-Regular`, `Tajawal-Medium`, `Tajawal-Bold`, `Tajawal-ExtraBold`

**Fallback Fonts:**
- **Sans**: System default (SF Pro on iOS, Roboto on Android) — only if Tajawal fails to load
- **Monospace**: Menlo (for any code/technical display)

### 3.2 Font Weights

| Weight | Tajawal Weight | Usage |
|:---|:---|:---|
| **Light (300)** | `Tajawal-Light` | Large decorative numbers (KPI values on dashboard) |
| **Regular (400)** | `Tajawal-Regular` | Body text, descriptions, input values |
| **Medium (500)** | `Tajawal-Medium` | Labels, subtitles, navigation items, form labels |
| **Bold (700)** | `Tajawal-Bold` | Headings, card titles, button text, tab labels |
| **ExtraBold (800)** | `Tajawal-ExtraBold` | Hero numbers (large stat values like "156"), page titles |

### 3.3 Font Sizes (Mobile-Adapted)

| Token | Size (px) | Line Height | Usage |
|:---|:---|:---|:---|
| `xs` | 11px | 16px | Timestamps, tiny labels, badge text |
| `sm` | 13px | 18px | Secondary text, captions, metadata |
| `base` | 15px | 22px | Body text, list items, input text, button text |
| `lg` | 17px | 24px | Section headers, card titles |
| `xl` | 20px | 28px | Screen titles, major headings |
| `2xl` | 24px | 32px | Dashboard section headers |
| `3xl` | 30px | 36px | KPI numbers on dashboard |
| `4xl` | 36px | 40px | Hero stat numbers (big dashboard counters) |

### 3.4 Text Colors

| Usage | Light Mode | Dark Mode |
|:---|:---|:---|
| Primary text (headings, names, values) | `#0F172A` (foreground) | `#F8FAFC` |
| Secondary text (descriptions, labels, timestamps) | `#64748B` (muted-foreground) | `#94A3B8` |
| Disabled text | `#94A3B8` | `#475569` |
| Link / interactive text | `#3B82F6` (primary) | `#3B82F6` |
| Error text | `#EF4444` | `#EF4444` |
| Success text | `#22C55E` | `#22C55E` |

---

## 4. Spacing & Layout System

### 4.1 Base Spacing Unit
**4px** is the base unit. All spacing values are multiples of 4:

| Token | Value | Usage |
|:---|:---|:---|
| `xs` | 4px | Tightest gap (icon-to-text inside badges) |
| `sm` | 8px | Gap between badge elements, inside compact cards |
| `md` | 12px | Inner padding for input fields, small card padding |
| `base` | 16px | Standard card padding, list item padding, screen horizontal margins |
| `lg` | 20px | Section spacing, gap between cards |
| `xl` | 24px | Major section breaks, header padding |
| `2xl` | 32px | Screen-level spacing, gap between dashboard sections |
| `3xl` | 48px | Top spacing on screens, extra breathing room |

### 4.2 Screen Margins
- **Horizontal screen padding**: 16px (both sides)
- **Safe area**: Always respect iOS notch / Android status bar insets
- **Bottom tab bar clearance**: Content should never be hidden behind the bottom navigation

### 4.3 Card Layout
```
┌──────────────────────────────────┐
│  16px padding all around          │
│  ┌────────────────────────────┐  │
│  │  Card content               │  │
│  │  12px gap between elements  │  │
│  │  16px gap between sections  │  │
│  └────────────────────────────┘  │
│  8px gap between cards            │
└──────────────────────────────────┘
```

---

## 5. Border Radius

| Token | Value | Usage |
|:---|:---|:---|
| `sm` | 3px | Tiny elements (inline badges within text) |
| `md` | 6px | Buttons, input fields, small badges |
| `lg` | 9px | Cards, bottom sheets |
| `xl` | 12px | Large cards, modals, image containers |
| `2xl` | 16px | Floating action buttons, dashboard stat cards |
| `full` | 9999px | Avatar circles, pill badges, circular icon buttons |

**Default `radius`**: 8px (0.5rem) — used for most interactive elements.

---

## 6. Shadows & Elevation

### 6.1 Light Mode Shadows

| Level | CSS Value | Usage |
|:---|:---|:---|
| **None** | none | Flat elements, list items |
| **2xs** | `0px 1px 2px rgba(0,0,0,0.03)` | Subtle lift (pressed card state) |
| **xs** | `0px 1px 3px rgba(0,0,0,0.05)` | Input fields, small interactive elements |
| **sm** | `0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)` | Cards in lists, bottom navigation |
| **md** | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Floating cards, popovers |
| **lg** | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Modals, bottom sheets |
| **xl** | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Floating action button |

### 6.2 Dark Mode Shadows

Same structure but with heavier opacity:
- Replace `rgba(0,0,0,0.03-0.1)` with `rgba(0,0,0,0.2-0.5)`
- Dark mode relies more on **border contrast** than shadows for depth

### 6.3 Elevation Hierarchy (Mobile)

| Layer | Element | Shadow | z-Index |
|:---|:---|:---|:---|
| **0** | Screen background | none | 0 |
| **1** | Cards, list items | sm | 1 |
| **2** | Header, bottom nav | md | 10 |
| **3** | Bottom sheet | lg | 20 |
| **4** | Modal/Dialog overlay | xl | 30 |
| **5** | Toast notifications | xl | 40 |
| **6** | FAB (Floating Action) | xl | 50 |

---

## 7. Interactive States

### 7.1 Elevation System for Touch
The web app uses a custom "elevate" system for hover/press states. On mobile, translate this to:

| State | Web Class | Mobile Equivalent |
|:---|:---|:---|
| **Normal** | — | Default appearance |
| **Hover** (N/A on mobile) | `hover-elevate` | N/A — skip |
| **Pressed** | `active-elevate-2` | Slight background darkening with `rgba(0,0,0, 0.08)` overlay (light) or `rgba(255,255,255, 0.09)` overlay (dark) |
| **Selected/Active** | `toggle-elevated` | Background: `rgba(0,0,0, 0.08)` overlay (light) or `rgba(255,255,255, 0.09)` overlay (dark) |
| **Focused** | Ring color `#3B82F6` | 2px blue border (for accessibility) |
| **Disabled** | `opacity-50` | 50% opacity + no touch response |

### 7.2 Touch Feedback
- **iOS**: Use native highlight with a subtle 0.7 opacity on press
- **Android**: Use Material ripple effect with `primary` color at 12% opacity
- **Press Duration**: 50ms delay before visual feedback (prevents accidental highlights)
- **Long Press**: 500ms — used for context menus and drag initiation

---

## 8. Component Specifications

### 8.1 Buttons

#### Primary Button (Default)
```
Background: #3B82F6 (primary)
Text: #FFFFFF (primary-foreground)
Font: Tajawal Medium, 15px
Height: 44px (mobile touch target minimum)
Padding: 16px horizontal
Border Radius: 6px
Border: 1px solid (slightly darker shade of primary, computed)
Press State: 8% darker overlay
Disabled: 50% opacity
```

#### Secondary Button
```
Background: #E2E8F0 (secondary) / Dark: #293548
Text: #0F172A (secondary-foreground) / Dark: #F8FAFC
Border: 1px solid secondary-border
Same height/radius as primary
```

#### Outline Button
```
Background: transparent
Text: inherit (current text color)
Border: 1px solid rgba(0,0,0, 0.10) / Dark: rgba(255,255,255, 0.10)
Shadow: xs
Press State: shadow removed, 8% overlay
```

#### Ghost Button
```
Background: transparent
Border: transparent (1px for layout stability)
Text: inherit
Press State: 8% overlay
```

#### Destructive Button
```
Background: #EF4444
Text: #FFFFFF
Border: 1px solid (darker red, computed)
```

#### Icon Button
```
Size: 44px × 44px (touch-friendly)
Border Radius: 6px (or full for circular)
Same variants as above
Icon Size: 20px × 20px
```

#### Button Sizes (Mobile-Adjusted)
| Size | Height | Horizontal Padding | Font Size |
|:---|:---|:---|:---|
| **sm** | 36px | 12px | 13px |
| **default** | 44px | 16px | 15px |
| **lg** | 48px | 24px | 17px |
| **icon** | 44px × 44px | — | — |

> **IMPORTANT**: Minimum touch target must be 44px × 44px per Apple HIG and Material Design guidelines. Never make a tappable element smaller than this.

### 8.2 Cards

```
Background: #FFFFFF / Dark: #1E293B
Border: 1px solid #E2E8F0 / Dark: #334155
Border Radius: 12px (xl)
Shadow: sm
Padding: 16px
Gap between cards: 8px
```

**Card Header:**
```
Font: Tajawal Bold, 17px
Color: foreground
Margin Bottom: 8px
```

**Card Content:**
```
Font: Tajawal Regular, 15px
Color: foreground
Line items gap: 12px
```

### 8.3 Badges

```
Height: 22px
Padding: 4px 8px
Font: Tajawal Medium, 11px
Border Radius: full (pill shape)
Border: 1px solid
```

**Badge variants use zone/score colors defined above.**

### 8.4 Input Fields

```
Background: transparent (inherits card/screen bg)
Border: 1px solid #DDE5ED / Dark: #3B4D66
Border Radius: 6px
Height: 44px (touch-friendly)
Padding: 0 12px
Font: Tajawal Regular, 15px
Placeholder Color: #64748B / Dark: #94A3B8

Focus State:
  Border: 2px solid #3B82F6 (primary)
  Ring: 2px offset ring in #3B82F6 at 20% opacity

Error State:
  Border: 1px solid #EF4444
  Below: Error text in #EF4444, 13px
```

### 8.5 List Items

```
Background: card color
Padding: 16px
Border Bottom: 1px solid border color (or card-border)
Min Height: 56px
Press State: 8% overlay

Title: Tajawal Medium, 15px, foreground
Subtitle: Tajawal Regular, 13px, muted-foreground
Right Accessory (chevron): 16px, muted-foreground
```

### 8.6 Bottom Tab Navigation

```
Background: card color
Border Top: 1px solid border color
Height: 56px (+ safe area padding on iPhone)
Shadow: md (on top, reversed direction)

Tab Item:
  Icon: 22px × 22px
  Label: Tajawal Medium, 11px
  Gap between icon and label: 4px

Active Tab:
  Icon color: #3B82F6 (primary)
  Label color: #3B82F6 (primary)

Inactive Tab:
  Icon color: #64748B (muted-foreground)
  Label color: #64748B (muted-foreground)

Badge (unread count):
  Size: 18px circle (min-width)
  Background: #EF4444
  Text: #FFFFFF, 10px, Bold
  Position: top-right of icon, offset -4px
```

### 8.7 Headers / Navigation Bar

```
Background: card color (NOT primary color — keep it clean and modern)
Border Bottom: 1px solid border color
Height: 56px (+ status bar safe area)
Shadow: none (use border for separation)

Title: Tajawal Bold, 17px, foreground, center-aligned
Back Button: chevron icon, 24px, foreground
Action Buttons: icon buttons, 44px touch target
```

> **CRITICAL**: Do NOT use a colored (blue/primary) header bar. The web app uses white/dark card-colored headers. The mobile app must match. Blue headers look dated and conflict with the modern design.

### 8.8 Bottom Sheets

```
Background: card color
Border Radius: 16px (top-left + top-right only)
Shadow: lg
Handle: 32px × 4px, centered, border color, rounded-full

Content Padding: 16px
Max Height: 90% of screen height
Backdrop: rgba(0,0,0, 0.5)
```

### 8.9 Dialogs / Modals

```
Background: card color
Border: 1px solid card-border
Border Radius: 12px
Shadow: xl
Padding: 24px
Width: screen width - 48px (24px margin each side)
Max Width: 400px
Backdrop: rgba(0,0,0, 0.5)
```

### 8.10 Toast Notifications

```
Background: card color
Border: 1px solid card-border
Border Radius: 12px
Shadow: lg
Padding: 12px 16px
Position: top of screen (below status bar)
Duration: 3 seconds
Swipe to dismiss: enabled

Success: left border 3px solid #22C55E
Error: left border 3px solid #EF4444
Warning: left border 3px solid #F59E0B
Info: left border 3px solid #3B82F6
```

### 8.11 Skeleton Loading

```
Background: #F1F5F9 (muted) / Dark: #293548
Animated: shimmer effect (left to right gradient sweep)
Border Radius: same as the element being loaded
Duration: 1.5s loop
```

### 8.12 Avatar / Initials Circle

```
Size: 40px × 40px (list) / 56px × 56px (profile) / 32px × 32px (compact)
Border Radius: full (circle)
Background: primary at 15% opacity (#3B82F6 at 0.15)
Text: primary color, Tajawal Bold, size relative to avatar
Border: 2px solid card-border
```

---

## 9. Icons

### 9.1 Icon Library
The web app uses **Lucide React** icons. For React Native, use:
```
npm install lucide-react-native
```
This provides the EXACT same icons used in the web app.

### 9.2 Icon Sizes

| Context | Size | Color |
|:---|:---|:---|
| Tab bar | 22px | muted-foreground (inactive), primary (active) |
| List item leading | 20px | muted-foreground |
| Button inline | 16px | inherit (same as button text) |
| Card action buttons | 20px | muted-foreground |
| Dashboard stat icon | 24px | primary or zone color |
| Header action | 22px | foreground |
| Empty state illustration | 48px | muted-foreground at 50% opacity |

### 9.3 Key Icons Used (from Lucide)

| Feature | Icon Name | Usage |
|:---|:---|:---|
| Phone/Call | `Phone` | Call buttons, call logs |
| WhatsApp | `MessageCircle` | WhatsApp chat (or use WhatsApp logo from `react-icons/si` → `SiWhatsapp`) |
| Add Lead | `UserPlus` | Create new lead |
| Settings | `Settings` | Settings screens |
| Home | `Home` | Dashboard tab |
| Users/Leads | `Users` | Leads tab |
| Kanban | `Kanban` / `LayoutGrid` | Kanban board |
| Reports | `BarChart3` | Reports/analytics |
| Calendar | `Calendar` | My Day, reminders |
| Notification | `Bell` | Notifications |
| Search | `Search` | Search bar |
| Filter | `SlidersHorizontal` | Filter drawer |
| Lead Score Hot | `Flame` | Hot lead badge |
| Lead Score Warm | `Thermometer` | Warm lead badge |
| Lead Score Cold | `Snowflake` | Cold lead badge |
| State Change | `ArrowRightLeft` | Pipeline transition |
| Transfer | `Shuffle` | Lead reassignment |
| Note | `StickyNote` | Add note |
| Task | `CheckSquare` | Tasks |
| Building | `Building2` | Developers/Projects |
| Trophy | `Trophy` | Leaderboard |
| Zap | `Zap` | New/urgent indicator |
| Bot | `Bot` | AI chatbot indicator |
| Heart Pulse | `HeartPulse` | Funnel health |
| More | `MoreHorizontal` or `Ellipsis` | More actions menu |

---

## 10. RTL (Right-to-Left) Support

### 10.1 Layout Rules
- **Arabic (default)**: Layout direction is RTL
  - Text aligns to the right
  - Navigation flows right-to-left
  - Back button appears on the RIGHT side of the header
  - Chevrons point LEFT (→) for "go deeper" in navigation
  - Swipe to go back: LEFT to RIGHT
- **English**: Layout direction is LTR
  - Standard western layout

### 10.2 Implementation
```javascript
// React Native
import { I18nManager } from 'react-native';

// When user selects Arabic:
I18nManager.forceRTL(true);
// Requires app restart on React Native

// When user selects English:
I18nManager.forceRTL(false);
```

### 10.3 Numbers
- **Numbers are ALWAYS LTR**, even in Arabic RTL context
- Phone numbers: `01012345678` (not mirrored)
- Prices: `2,500,000 ج.م.` (number LTR, currency label in Arabic)
- Dates: `11 أبريل 2026`

### 10.4 Elements That Do NOT Mirror in RTL
- Progress bars (always fill left-to-right)
- Media playback controls
- Phone number inputs
- Charts and graph axes
- Clock/time displays

---

## 11. Dark Mode

### 11.1 Implementation
- Follow system setting by default, with manual override option
- Store preference in AsyncStorage under key `crm-ui-theme` (same as web)
- Three modes: `light`, `dark`, `system`

### 11.2 Dark Mode Rules
1. **Never use pure black** (`#000000`) — use `#0F172A` (the dark background)
2. **Cards are slightly lighter** than the background — `#1E293B` on `#0F172A`
3. **Borders become darker but still visible** — `#293548` to `#334155`
4. **Primary color stays the same** — `#3B82F6` works on both modes
5. **Shadows become heavier** — increase opacity to 0.3-0.5
6. **Text contrast**: Primary text is `#F8FAFC`, secondary is `#94A3B8`
7. **Status bar**: Dark content on light background, light content on dark background
8. **Bottom navigation**: Same card background color, adapts automatically

### 11.3 Images in Dark Mode
- Product/project images: No filter
- Icons: Change color via tint
- Empty state illustrations: Reduce opacity to 80%
- User avatars: No change

---

## 12. Platform-Specific Adaptations

### 12.1 iOS Adaptations
- **Status Bar**: Translucent, content slides behind
- **Navigation**: Use native iOS back swipe gesture
- **Bottom Tab Bar**: Respect home indicator safe area (extra ~34px)
- **Haptics**: Use light impact for button presses, medium for state changes, heavy for destructive actions
- **Blur Effects**: Use `BlurView` for overlays where supported
- **Segmented Controls**: Use native `SegmentedControl` for tab-like filters when fewer than 4 options

### 12.2 Android Adaptations
- **Status Bar**: Use `StatusBar` component with proper background color
- **Navigation**: Use system back button/gesture
- **Material Ripple**: Apply ripple effect to all touchable elements
- **Bottom Navigation**: Follow Material Design 3 specs (no extra safe area needed, except for gesture navigation bar)
- **Edge-to-Edge**: Support Android 15+ edge-to-edge display
- **Snackbar**: Use for confirmations instead of toasts on Android

### 12.3 Avoiding Conflicts with System Controls

**CRITICAL — Read this carefully:**

| Problem | Solution |
|:---|:---|
| Bottom tab bar overlaps Android navigation bar | Add `paddingBottom` equal to bottom inset from `useSafeAreaInsets()` |
| Content hidden behind iOS notch | Always use `SafeAreaView` or `useSafeAreaInsets()` |
| Status bar overlaps header | Include status bar height in header padding |
| Keyboard covers input fields | Use `KeyboardAvoidingView` (iOS: `behavior="padding"`, Android: `behavior="height"`) |
| System back gesture conflicts with swipe actions | Disable swipe-to-go-back on screens with horizontal swipe gestures (Kanban, image gallery) |
| Android hardware back button | Handle with `BackHandler` — confirm before closing modals, navigate back in stack |
| iOS swipe-to-dismiss on modals | Support native dismiss gesture on bottom sheets |
| Notch/Dynamic Island cuts content | Never place important content in the top 60px without safe area padding |
| Home indicator bar area | Bottom interactive elements (buttons, tabs) must be ABOVE the home indicator |
| Android 3-button nav vs gesture nav | Always use safe area insets, never hardcode bottom padding |

**Safe Area Template:**
```jsx
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Screen wrapper
function Screen({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: 0, // Tab navigator handles bottom
      backgroundColor: colors.background,
    }}>
      {children}
    </View>
  );
}
```

---

## 13. Animation & Transitions

### 13.1 Screen Transitions
- **Push (navigate forward)**: Slide from right (LTR) or left (RTL), 300ms ease-out
- **Pop (go back)**: Slide to right (LTR) or left (RTL), 250ms ease-in
- **Modal**: Slide up from bottom, 350ms spring
- **Bottom sheet**: Slide up with spring physics (damping: 15, stiffness: 150)

### 13.2 Micro-Interactions
| Element | Animation | Duration |
|:---|:---|:---|
| Tab switch | Cross-fade | 200ms |
| Card press | Scale to 0.98 | 100ms |
| Button press | Opacity to 0.7 | 50ms |
| Badge count update | Scale bounce (1.0 → 1.2 → 1.0) | 300ms |
| Skeleton shimmer | Left-to-right gradient sweep | 1500ms loop |
| Toast appear | Slide down + fade in | 300ms |
| Toast dismiss | Slide up + fade out | 200ms |
| Pull to refresh | Native platform spinner | Platform default |
| State change | Color cross-fade | 200ms |
| Notification bell | Wiggle (same as web `bell-ring` keyframe) | 1000ms |

### 13.3 Performance Rules
- Use `react-native-reanimated` for all animations (runs on UI thread)
- Never animate `width`, `height`, or `borderRadius` — animate `transform` and `opacity` only
- Use `LayoutAnimation` for list item insertions/removals
- Debounce rapid state changes to prevent animation spam

---

## 14. Loading & Empty States

### 14.1 Loading States
- **Skeleton screens** for list views (3-5 placeholder items matching list item height)
- **Spinner** only for pull-to-refresh and button loading states
- **Progress bar** for file uploads and bulk operations
- **Never show a blank white screen** — always show skeleton immediately

### 14.2 Empty States
```
┌─────────────────────────────┐
│                              │
│         [48px icon]          │
│      muted-foreground        │
│      at 50% opacity          │
│                              │
│    "لا توجد ليدات حالياً"    │
│    Tajawal Medium, 17px      │
│    muted-foreground          │
│                              │
│   "ابدأ بإضافة ليد جديد"    │
│    Tajawal Regular, 13px     │
│    muted-foreground          │
│                              │
│    [Primary Button: إضافة]   │
│                              │
└─────────────────────────────┘
```

### 14.3 Error States
```
┌─────────────────────────────┐
│                              │
│    [AlertCircle icon, red]   │
│                              │
│    "حدث خطأ"                │
│    Tajawal Medium, 17px      │
│    destructive color         │
│                              │
│   "تأكد من اتصالك بالإنترنت"│
│    Tajawal Regular, 13px     │
│    muted-foreground          │
│                              │
│  [Outline Button: إعادة المحاولة]│
│                              │
└─────────────────────────────┘
```

---

## 15. WhatsApp Chat UI Specifics

The chat screen must feel natural and WhatsApp-like, but with our brand colors:

### 15.1 Message Bubbles
```
Sent Message (by agent):
  Background: #3B82F6 (primary)
  Text: #FFFFFF
  Border Radius: 16px (top-left 16, top-right 4, bottom-right 16, bottom-left 16)
  Max Width: 75% of screen
  Timestamp: 11px, rgba(255,255,255, 0.7)
  Alignment: right (LTR) or left (RTL)

Received Message (from lead):
  Background: #FFFFFF / Dark: #1E293B (card)
  Text: foreground
  Border: 1px solid card-border
  Border Radius: 16px (top-left 4, top-right 16, bottom-right 16, bottom-left 16)
  Max Width: 75% of screen
  Timestamp: 11px, muted-foreground
  Alignment: left (LTR) or right (RTL)

Bot Message (sent by AI):
  Same as sent message style BUT with:
  Additional badge: "🤖 رد تلقائي" text below bubble
  Badge: muted-foreground, 11px, italic
```

### 15.2 Chat Screen Background
```
Light: #F8FAFC (background color, NOT WhatsApp green)
Dark: #0F172A (background color)
No pattern/wallpaper — keep it clean and professional
```

### 15.3 AI Suggestions Bar
```
Position: above the text input
Background: accent color (#DBEAFE / dark: #1E3A5F)
Border: 1px solid accent border
Border Radius: 12px top corners
Padding: 8px 16px

Suggestion Chips:
  Background: card color
  Border: 1px solid card-border
  Border Radius: full (pill)
  Padding: 6px 12px
  Font: Tajawal Regular, 13px
  Scrollable horizontally
```

---

## 16. KPI Dashboard Cards

```
┌──────────────────┐
│  12px padding     │
│                   │
│  [icon 24px]      │  ← primary color or zone color
│  "ليد نشط"       │  ← muted-foreground, 13px, Medium
│                   │
│  156              │  ← foreground, 30px+, ExtraBold
│                   │
│  ▲ 12% من الشهر  │  ← success green, 11px (or red if down)
│  السابق          │
│                   │
│  12px padding     │
└──────────────────┘

Background: card
Border: 1px solid card-border
Border Radius: 12px
Shadow: sm
Width: (screen - 48px) / 3 for 3-column grid
        (screen - 40px) / 2 for 2-column grid
Gap between cards: 8px
```

---

## 17. Quick Reference Color Palette (Copy-Paste Ready)

### React Native Theme Object
```javascript
export const lightTheme = {
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  background: '#F8FAFC',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  cardBorder: '#E2E8F0',
  border: '#DDE5ED',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  secondary: '#E2E8F0',
  secondaryForeground: '#0F172A',
  accent: '#DBEAFE',
  accentForeground: '#2563EB',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  input: '#DDE5ED',
  ring: '#3B82F6',
  
  statusOnline: '#22C55E',
  statusAway: '#F59E0B',
  statusBusy: '#EF4444',
  statusOffline: '#9CA3AF',
  
  chart1: '#3B82F6',
  chart2: '#22C55E',
  chart3: '#F59E0B',
  chart4: '#A855F7',
  chart5: '#EF4444',
  
  zoneUntouched: { bg: '#F1F5F9', border: '#CBD5E1', text: '#475569' },
  zoneActive:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
  zoneWon:       { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' },
  zoneLost:      { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  
  scoreHot:  { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
  scoreWarm: { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
  scoreCold: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
};

export const darkTheme = {
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  background: '#0F172A',
  foreground: '#F8FAFC',
  card: '#1E293B',
  cardForeground: '#F8FAFC',
  cardBorder: '#334155',
  border: '#293548',
  muted: '#293548',
  mutedForeground: '#94A3B8',
  secondary: '#293548',
  secondaryForeground: '#F8FAFC',
  accent: '#1E3A5F',
  accentForeground: '#93C5FD',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  input: '#3B4D66',
  ring: '#3B82F6',
  
  statusOnline: '#22C55E',
  statusAway: '#F59E0B',
  statusBusy: '#EF4444',
  statusOffline: '#9CA3AF',
  
  chart1: '#3B82F6',
  chart2: '#22C55E',
  chart3: '#F59E0B',
  chart4: '#A855F7',
  chart5: '#EF4444',
  
  zoneUntouched: { bg: 'rgba(30,41,59,0.5)', border: '#334155', text: '#94A3B8' },
  zoneActive:    { bg: 'rgba(30,58,138,0.4)', border: '#1E3A8A', text: '#60A5FA' },
  zoneWon:       { bg: 'rgba(20,83,45,0.4)',  border: '#14532D', text: '#4ADE80' },
  zoneLost:      { bg: 'rgba(127,29,29,0.4)', border: '#7F1D1D', text: '#F87171' },
  
  scoreHot:  { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
  scoreWarm: { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
  scoreCold: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
};
```

---

## 18. Do's and Don'ts Summary

### DO ✅
- Use Tajawal font everywhere
- Follow the exact HEX color codes from this document
- Use 44px minimum touch targets for all interactive elements
- Respect safe areas on ALL devices
- Support RTL layout for Arabic
- Use skeleton loading, not spinners
- Match card backgrounds, borders, and shadows to the web app
- Use Lucide icons (same as web)
- Keep headers white/dark (card color), NOT primary blue

### DON'T ❌
- Don't use pure black (`#000000`) anywhere — darkest is `#0F172A`
- Don't use colored (blue/primary) headers or navigation bars
- Don't use different fonts — Tajawal only
- Don't make buttons smaller than 44px height
- Don't use bottom padding without safe area calculation
- Don't hardcode status bar heights — use system APIs
- Don't use hover states — mobile has no hover
- Don't use drag-and-drop between columns (not mobile-friendly)
- Don't place interactive elements within 20px of screen edges
- Don't use system alert dialogs — use styled bottom sheets/modals
- Don't apply blur effects on Android (performance)
- Don't animate layout properties (width/height) — only transform/opacity
- Don't use WhatsApp green for the chat background — use our brand background color

---

*End of Mobile Design System PRD v1.0*
