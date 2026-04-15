# WhatsApp CRM Integration — Complete Technical PRD
## How HomeAdvisor CRM Connects, Manages, and Automates WhatsApp
### v1.0 — April 2026

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Phase 1: Connection — QR Code & Session Management](#3-phase-1-connection)
4. [Phase 2: Maintaining Connection — Reconnection & Resilience](#4-phase-2-maintaining-connection)
5. [Phase 3: Receiving Messages — Incoming Message Pipeline](#5-phase-3-receiving-messages)
6. [Phase 4: Lead Detection & Auto-Creation](#6-phase-4-lead-detection)
7. [Phase 5: AI Chatbot — Automated Conversations](#7-phase-5-ai-chatbot)
8. [Phase 6: Information Extraction & Card Completion](#8-phase-6-information-extraction)
9. [Phase 7: CRM Automation — Bot Actions](#9-phase-7-crm-automation)
10. [Phase 8: Bot Handoff — AI to Human](#10-phase-8-bot-handoff)
11. [Phase 9: Manual Messaging — Agent Sends Messages](#11-phase-9-manual-messaging)
12. [Phase 10: WhatsApp Inbox — Chat Interface](#12-phase-10-whatsapp-inbox)
13. [Phase 11: Templates & Campaigns](#13-phase-11-templates-campaigns)
14. [Phase 12: Follow-up Rules — Automated Re-engagement](#14-phase-12-followup-rules)
15. [Database Schema](#15-database-schema)
16. [API Endpoints Reference](#16-api-endpoints)
17. [Common Problems & Solutions](#17-common-problems)
18. [Security Considerations](#18-security)

---

## 1. System Overview

### What This System Does
This system connects a personal WhatsApp number to a CRM application using the **Baileys** library (an unofficial WhatsApp Web API). When someone sends a WhatsApp message to the connected number:

1. The message is received instantly on the server
2. The system checks if the sender is an existing lead (customer) or a new one
3. If new → a lead card is automatically created with their phone number and WhatsApp display name
4. An AI chatbot (powered by Google Gemini) responds automatically in natural conversational Arabic
5. The AI extracts information from the conversation (name, budget, preferences, etc.) and fills in the lead's profile
6. When the AI has collected enough information, it hands off to a human sales agent
7. The sales agent sees the full conversation history and the auto-filled lead card

### Technology Stack
| Component | Technology | Purpose |
|:---|:---|:---|
| **WhatsApp Connection** | `@whiskeysockets/baileys` v6.7+ | WebSocket connection to WhatsApp servers |
| **AI Engine** | Google Gemini (via OpenRouter API) | Natural language processing and response generation |
| **Session Storage** | File system (`.whatsapp_sessions/`) | Persistent session data for reconnection |
| **Message Database** | PostgreSQL | Message history, lead data, bot state |
| **Real-time Updates** | Server-Sent Events (SSE) | Instant UI updates when messages arrive |
| **Backend** | Node.js + Express | API server and message handler |

### Why Baileys (Not Official API)?
- **Free**: No per-message cost (Official WhatsApp Business API charges $0.005-0.08/msg)
- **Personal number**: Works with any WhatsApp number, not just Business accounts
- **Full access**: Send/receive text, images, files, voice notes
- **No approval needed**: No Meta business verification required
- **Caveat**: Unofficial — WhatsApp can block the number if used aggressively (rate limits must be respected)

---

## 2. Architecture Diagram

```
┌──────────────┐      ┌─────────────────────┐      ┌──────────────┐
│              │      │                     │      │              │
│  WhatsApp    │◄────►│  Your Server        │◄────►│  PostgreSQL  │
│  Servers     │  WS  │  (Node.js/Express)  │  SQL │  Database    │
│              │      │                     │      │              │
└──────────────┘      │  ┌───────────────┐  │      └──────────────┘
                      │  │ Baileys       │  │
       QR Code ◄──────│  │ Socket        │  │
       (to phone)     │  │ Manager       │  │
                      │  └───────────────┘  │
                      │  ┌───────────────┐  │      ┌──────────────┐
                      │  │ Message       │  │      │              │
                      │  │ Handler       │──┼─────►│  AI Engine   │
                      │  │ Pipeline      │  │      │  (Gemini)    │
                      │  └───────────────┘  │      │              │
                      │  ┌───────────────┐  │      └──────────────┘
                      │  │ SSE           │  │
                      │  │ Broadcaster   │──┼─────► Browser (real-time)
                      │  └───────────────┘  │
                      └─────────────────────┘

Flow:
1. User scans QR → Baileys connects via WebSocket
2. Incoming message → Message Handler → Find/Create Lead → Log Message
3. If bot active → AI Engine → Generate Reply → Send via Baileys
4. SSE broadcasts update → Frontend refreshes in real-time
```

---

## 3. Phase 1: Connection — QR Code & Session Management

### 3.1 How Connection Works (Step by Step)

**Step 1: User initiates connection**
- Frontend calls `POST /api/whatsapp/connect`
- Backend creates a new Baileys socket for this user

**Step 2: QR Code generation**
- Baileys establishes WebSocket to WhatsApp servers
- WhatsApp servers send a QR code string
- Backend converts QR string to Base64 image using `qrcode` library
- QR image is stored in memory and emitted to frontend via EventEmitter

**Step 3: User scans QR on their phone**
- Open WhatsApp → Settings → Linked Devices → Link a Device
- Scan the QR code displayed on the web UI
- WhatsApp authenticates and sends credentials to the server

**Step 4: Session is saved**
- Baileys receives authentication credentials
- Credentials are saved to filesystem: `.whatsapp_sessions/{userId}/`
- This includes encryption keys, device info, and contact mappings
- On server restart, these saved credentials allow automatic reconnection WITHOUT scanning QR again

### 3.2 Session Storage Structure
```
.whatsapp_sessions/
└── {userId}/
    ├── creds.json              ← Main authentication credentials
    ├── app-state-sync-key-*.json  ← Signal Protocol keys
    ├── pre-key-*.json          ← Pre-shared keys for encryption
    ├── sender-key-*.json       ← Group message keys
    ├── session-*.json          ← Individual chat sessions
    └── lid-mapping_*_reverse.json ← Phone number ↔ LID mappings
```

### 3.3 Code: Socket Creation
```typescript
const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

const sock = makeWASocket({
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
  },
  printQRInTerminal: false,
  browser: ["HomeAdvisor CRM", "Chrome", "22.5.0"],
  generateHighQualityLinkPreview: false,
  syncFullHistory: false,
  markOnlineOnConnect: false,
  // Prevent spam to contact list
  shouldSyncHistoryMessage: () => false,
});
```

**Key Configuration Explained:**
| Parameter | Value | Why |
|:---|:---|:---|
| `printQRInTerminal` | `false` | We show QR in the web UI, not terminal |
| `browser` | Custom name | Appears in "Linked Devices" on user's phone |
| `syncFullHistory` | `false` | Don't download old messages — we only want NEW ones |
| `markOnlineOnConnect` | `false` | Don't show "online" status on WhatsApp when CRM connects |
| `shouldSyncHistoryMessage` | `() => false` | Skip history sync entirely for performance |

### 3.4 QR Code Display Flow
```
Backend                              Frontend
   │                                    │
   │  POST /api/whatsapp/connect        │
   │◄───────────────────────────────────│
   │                                    │
   │  Create Baileys socket             │
   │  Wait for QR event...              │
   │                                    │
   │  QR received from WhatsApp         │
   │  Convert to Base64 image           │
   │                                    │
   │  Return { status: "qr",           │
   │           qrDataUrl: "data:..." }  │
   │───────────────────────────────────►│
   │                                    │  Display QR image
   │                                    │
   │  User scans QR on phone            │
   │                                    │
   │  Connection confirmed              │
   │  Return { status: "connected" }    │
   │───────────────────────────────────►│
   │                                    │  Show "Connected ✓"
```

### 3.5 Safety Timeout
If the user doesn't scan the QR within 60 seconds, the socket is destroyed to prevent memory leaks:
```typescript
const safetyTimeout = setTimeout(() => {
  if (session.status !== "connected") {
    sock.end(undefined);
    session.status = "disconnected";
    session.emitter.emit("status", { status: "timeout" });
  }
}, 60_000);
```

---

## 4. Phase 2: Maintaining Connection — Reconnection & Resilience

### 4.1 Why Connections Drop
WhatsApp connections can drop for many reasons:
- Server restart or deployment
- Network interruption
- WhatsApp server-side timeout
- Phone goes offline for too long
- User manually unlinks device from phone
- WhatsApp updates requiring re-auth

### 4.2 Reconnection Logic
The system implements an **exponential backoff** reconnection strategy:

```
Attempt 1: Wait 3 seconds → reconnect
Attempt 2: Wait 6 seconds → reconnect
Attempt 3: Wait 9 seconds → reconnect
Attempt 4: Wait 12 seconds → reconnect
Attempt 5: Wait 15 seconds → reconnect (FINAL)
```

After 5 failed attempts, the session is marked as `disconnected` and the user must reconnect manually (new QR scan may be required).

### 4.3 Connection State Machine
```
┌──────────────┐
│ disconnected │◄───────────────────────────────────┐
└──────┬───────┘                                    │
       │ POST /connect                              │
       ▼                                            │
┌──────────────┐                                    │
│  connecting  │──── QR timeout (60s) ──────────────┤
└──────┬───────┘                                    │
       │ QR scanned                                 │
       ▼                                            │
┌──────────────┐                                    │
│  connected   │──── connection.close ──────────────┤
└──────┬───────┘          │                         │
       │                  │ statusCode != loggedOut  │
       │                  ▼                         │
       │          ┌──────────────┐                  │
       │          │ reconnecting │──── max retries ─┘
       │          └──────┬───────┘
       │                 │ success
       │                 ▼
       │          ┌──────────────┐
       └─────────►│  connected   │
                  └──────────────┘
```

### 4.4 Connection Event Handler (Simplified)
```typescript
sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    // New QR code received — display to user
    const qrDataUrl = await QRCode.toDataURL(qr);
    session.qrDataUrl = qrDataUrl;
    session.status = "qr";
    session.emitter.emit("status", { status: "qr", qrDataUrl });
  }

  if (connection === "open") {
    // Successfully connected!
    session.status = "connected";
    reconnectAttempts.set(userId, 0); // Reset retry counter
    session.emitter.emit("status", { status: "connected" });
  }

  if (connection === "close") {
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (statusCode === DisconnectReason.loggedOut) {
      // User manually logged out — don't reconnect
      // Delete session files
      await deleteSessionDir(userId);
      session.status = "disconnected";
    } else {
      // Network issue or temporary disconnect — try reconnecting
      const attempt = (reconnectAttempts.get(userId) ?? 0) + 1;

      if (attempt <= MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.set(userId, attempt);
        const delay = RECONNECT_DELAY_MS * attempt;
        setTimeout(() => startConnection(userId), delay);
      } else {
        session.status = "disconnected";
      }
    }
  }
});
```

### 4.5 Auto-Reconnect on Server Restart
When the server starts, it checks for existing session directories and automatically attempts to reconnect:
```typescript
// On server startup
for (const userId of existingSessionDirs) {
  await startConnection(userId); // Uses saved creds, no QR needed
}
```

---

## 5. Phase 3: Receiving Messages — Incoming Message Pipeline

### 5.1 Message Reception Flow
```
WhatsApp Servers
    │
    │ WebSocket push
    ▼
Baileys Socket
    │
    │ messages.upsert event
    ▼
┌─────────────────────────────────┐
│ Filter: Is this a valid message?│
│  ✗ Skip broadcast/status       │
│  ✗ Skip group messages          │
│  ✗ Skip our own sent messages   │
│  ✗ Skip duplicate messageIds    │
│  ✓ Only personal incoming msgs  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Resolve Phone Number            │
│  • Extract from remoteJid       │
│  • Handle LID (Linked ID) →     │
│    resolve to real phone number │
│  • Normalize to Egyptian format │
│    (e.g., 20XXXXXXXXXX)        │
└──────────────┬──────────────────┘
               │
               ▼
     Pass to Message Handler
     (registered in routes.ts)
```

### 5.2 What is LID and Why It Matters
WhatsApp's multi-device architecture sometimes identifies users by an internal "Linked Identity" (LID) instead of their phone number. This looks like `12345678@lid` instead of `201012345678@s.whatsapp.net`.

**The Problem:** If you receive a message from `12345@lid`, you don't know the phone number.

**The Solution:** The system maintains LID ↔ Phone mappings:

1. **On Contact Sync**: When WhatsApp sends contact updates, map each LID to its phone number
2. **Persistent Storage**: Save mappings in `lid-mapping_*_reverse.json` files
3. **Real-time Resolution**: When a message arrives from a LID, look up the real phone
4. **Fallback**: If mapping not found, try querying Baileys' internal key store

```typescript
// LID Resolution chain:
function resolvePhone(jid: string): string | null {
  // 1. Direct phone JID (e.g., 201012345678@s.whatsapp.net)
  if (!jid.includes("@lid")) {
    return jid.split("@")[0]; // Just the number
  }

  // 2. Check in-memory LID mapping
  const phone = lidToPhone.get(jid);
  if (phone) return phone;

  // 3. Check persistent Baileys session files
  const mapping = readLidMappingFromDisk(jid);
  if (mapping) return mapping;

  // 4. Give up — can't determine phone number
  return null;
}
```

### 5.3 Phone Number Normalization
Egyptian phone numbers come in many formats. The system normalizes them:
```
Input: "01012345678"    → Output: "201012345678"
Input: "+201012345678"  → Output: "201012345678"
Input: "201012345678"   → Output: "201012345678" (already correct)
Input: "1012345678"     → Output: "201012345678" (add country code)
```

### 5.4 Message Deduplication
WhatsApp sometimes delivers the same message multiple times. The system prevents duplicates:
```typescript
// Check if we've already processed this messageId
const existing = await storage.findWhatsappMessageById(messageId);
if (existing) return; // Skip duplicate
```

---

## 6. Phase 4: Lead Detection & Auto-Creation

### 6.1 The Decision Tree
When a message arrives with a resolved phone number:

```
Incoming message from phone: 201012345678
           │
           ▼
┌─────────────────────────────────┐
│ Search database for this phone  │
│ SELECT * FROM leads             │
│ WHERE phone = '201012345678'    │
│    OR phone2 = '201012345678'   │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
     Found?        Not Found
        │             │
        ▼             ▼
  Use existing   ┌─────────────────┐
  lead record    │ CREATE NEW LEAD │
                 │ name: pushName  │
                 │ phone: number   │
                 │ channel: واتساب │
                 │ state: default  │
                 │ botActive: true │
                 │ botStage: greeting│
                 └────────┬────────┘
                          │
                          ▼
                 Assign to available
                 agent (auto-assign)
                          │
                          ▼
                 Create notification
                 for assigned agent:
                 "ليد جديد من واتساب"
```

### 6.2 New Lead Creation Details
When creating a lead from an incoming WhatsApp message:
```typescript
const newLead = await storage.createLead({
  name: pushName || `واتساب - ${phone}`,  // WhatsApp display name or fallback
  phone: normalizedPhone,
  channel: "واتساب",
  stateId: defaultState.id,   // First state in pipeline (e.g., "Fresh Lead")
  source: "whatsapp_incoming",
  botActive: true,            // AI bot is ON by default for new leads
  botStage: "greeting",       // Start at greeting stage
  notes: `تم الإنشاء تلقائياً من رسالة واتساب واردة`,
});
```

### 6.3 Phone Number Extraction from Message Text
The system scans message text for additional Egyptian phone numbers:
```typescript
// If lead doesn't have a secondary phone, check message text
const phoneRegex = /(?:\+?20|0)1[0125]\d{8}/g;
const numbersInText = messageText.match(phoneRegex);
if (numbersInText && !lead.phone2) {
  // Found a phone number in the message — save as phone2
  await storage.updateLead(lead.id, { phone2: numbersInText[0] });
}
```

This is useful when a lead says something like "اتصل بيا على 01098765432" in a message.

---

## 7. Phase 5: AI Chatbot — Automated Conversations

### 7.1 When Does the Bot Activate?
The bot responds to a message ONLY if ALL these conditions are true:

```
1. Bot is globally enabled (chatbot_settings.isActive = true)
2. Bot is active for THIS lead (leads.botActive = true)
3. Lead is NOT in "handed_off" stage (leads.botStage != "handed_off")
4. Either:
   a. It's outside working hours (before workingHoursStart or after workingHoursEnd)
   b. OR respondAlways = true (bot responds 24/7 regardless)
5. The lead hasn't been manually taken over by an agent
```

### 7.2 Conversation Stages
The bot follows a structured conversation flow with 7 stages:

```
Stage 1: greeting
├── First message → Send welcome message (customizable)
├── Ask for the customer's name
│
Stage 2: collecting_name
├── Extract the customer's name from their reply
├── If name detected → move to collecting_needs
│
Stage 3: collecting_needs
├── Ask about requirements:
│   • Budget (الميزانية)
│   • Unit type (شقة/فيلا/دوبلكس/تاون هاوس...)
│   • Number of bedrooms (عدد الغرف)
│   • Preferred area/location (المنطقة المفضلة)
│   • Payment type (كاش/تقسيط)
│
Stage 4: recommending_units
├── Based on collected needs, recommend specific units from inventory
├── Include: project name, unit number, area, price, features
├── If no exact match → suggest closest alternatives
│
Stage 5: collecting_details
├── After customer shows interest in a specific unit
├── Ask for: payment method, available down payment, timeline
│
Stage 6: qualified
├── All critical data collected (name + budget/interest + unit type)
├── Ready for handoff to human agent
│
Stage 7: handed_off
├── Bot is deactivated for this lead
├── Human agent takes over
└── Bot will NOT respond to further messages
```

### 7.3 The AI Prompt (System Prompt Structure)
The AI receives a comprehensive system prompt with these sections:

```
1. IDENTITY
   "You are {botName} — a {botRole} at {companyName}"
   Personality: {botPersonality}

2. MISSION
   {botMission} — e.g., "Collect customer data and recommend suitable units"

3. COMPANY KNOWLEDGE
   {companyKnowledge} — Custom info about the company (optional)

4. AVAILABLE INVENTORY
   Full list of projects and units:
   📍 Project "Mountain View iCity" (Compound) — New Cairo
      Prices: 2,500,000 to 8,500,000 EGP
      Features: pool, gym, security
      Available units:
        • Villa A-12 | 4 bedrooms | 320m² | 8,500,000 EGP
        • Townhouse B-7 | 3 bedrooms | 220m² | 5,200,000 EGP
        ...

5. CURRENT LEAD DATA
   Name: Mohamed | Budget: 3M | Unit Type: Villa | ...

6. CONVERSATION STAGES (rules for each stage)

7. IMPORTANT RULES
   - Speak in Egyptian Arabic (colloquial, not formal)
   - Keep replies short (2-4 sentences — it's WhatsApp, not email)
   - Only quote real prices from the inventory list
   - Extract any data the customer mentions, even if not asked
   - Set shouldHandoff = true when: name + budget + unit type are collected

8. CRM ACTIONS (what the bot can do automatically)
   - change_state: Move lead to different pipeline stage
   - create_reminder: Schedule a follow-up
   - update_score: Change lead interest level (hot/warm/cold)

9. RESPONSE FORMAT (strict JSON)
```

### 7.4 AI Model Configuration
```typescript
const config = {
  model: "google/gemini-flash-1.5",  // Primary model
  fallback: "google/gemini-2.0-flash-001",  // If primary fails
  max_tokens: 1024,
  temperature: 0.7,  // Balanced creativity/consistency
  api: "OpenRouter",  // Routes to Google Gemini
};
```

### 7.5 Example Conversation

```
[Customer sends first message]
Customer: "السلام عليكم"

[Bot detects: new message, stage = greeting]
Bot: "وعليكم السلام! 😊 أهلاً بيك في شركة HomeAdvisor
      أنا أحمد، المستشار العقاري بتاعك
      ممكن أعرف اسم حضرتك؟"
→ Stage: greeting → collecting_name
→ Extracted: nothing yet

Customer: "أنا محمد، عايز أعرف أسعار الشقق في التجمع"

Bot: "أهلاً محمد! 😊
      عندنا شقق في التجمع في مشروع Mountain View iCity
      الأسعار بتبدأ من 2,500,000 جنيه
      عايز شقة كام أوضة تقريباً؟"
→ Stage: collecting_name → collecting_needs
→ Extracted: name = "محمد", location = "التجمع", unitType = "شقة"
→ Lead card updated: name, location, unitType filled in

Customer: "3 أوض، ميزانيتي حوالي 4 مليون"

Bot: "تمام محمد 👍
      عندي ليك شقة ممتازة:
      • شقة C-15 في Mountain View iCity
        3 غرف | 180 م² | 3,800,000 جنيه | تشطيب كامل
      عايز تعرف تفاصيل أكتر أو تحجز معاينة؟"
→ Stage: collecting_needs → recommending_units
→ Extracted: bedrooms = 3, budget = "4,000,000"
→ Lead card updated: bedrooms, budget filled in
→ Bot action: update_score → "warm"

Customer: "أيوه عايز أشوفها، ممكن بكرة؟"

Bot: "إن شاء الله محمد! 🏠
      هرتب ليك معاينة بكرة مع أحد مستشارينا
      هيتواصل معاك النهارده يأكد الموعد
      شكراً ليك! 😊"
→ Stage: recommending_units → qualified
→ shouldHandoff: true
→ Bot actions: [
    { type: "create_reminder", isoDate: "tomorrow 10:00", note: "معاينة Mountain View" },
    { type: "update_score", score: "hot" }
  ]
→ Bot deactivated for this lead
→ Agent notified: "ليد ساخن جاهز! محمد — شقة 3 غرف — ميزانية 4M — عايز معاينة بكرة"
```

---

## 8. Phase 6: Information Extraction & Card Completion

### 8.1 What Gets Extracted
The AI extracts these fields from EVERY message, even if it didn't ask for them:

| Field | Arabic | Example | Stored In |
|:---|:---|:---|:---|
| `extractedName` | الاسم | "محمد علي" | `leads.name` |
| `extractedBudget` | الميزانية | "4,000,000 جنيه" | `leads.budget` |
| `extractedUnitType` | نوع الوحدة | "شقة" / "فيلا" / "دوبلكس" | `leads.unitType` |
| `extractedBedrooms` | عدد الغرف | 3 | `leads.bedrooms` |
| `extractedBathrooms` | عدد الحمامات | 2 | `leads.bathrooms` |
| `extractedLocation` | الموقع المفضل | "التجمع الخامس" | `leads.location` |
| `extractedArea` | المساحة | "180 م²" | `leads.area` |
| `extractedPaymentType` | طريقة الدفع | "تقسيط" / "كاش" | `leads.paymentType` |
| `extractedDownPayment` | المقدم | "500,000 جنيه" | `leads.downPayment` |
| `extractedProject` | المشروع المفضل | "Mountain View iCity" | `leads.preferredProject` |
| `extractedTimeline` | الجدول الزمني | "خلال 3 أشهر" | `leads.timeline` |
| `extractedPhone` | رقم تاني | "01098765432" | `leads.phone2` |

### 8.2 Smart Update Rules
The system only updates empty fields — it never overwrites existing data:

```typescript
// Only update if the field is currently empty
if (botResult.extractedName && (!lead.name || lead.name.startsWith("واتساب -"))) {
  updateData.name = botResult.extractedName;
}
if (botResult.extractedBudget && !lead.budget) {
  updateData.budget = botResult.extractedBudget;
}
if (botResult.extractedUnitType && !lead.unitType) {
  updateData.unitType = botResult.extractedUnitType;
}
// ... same pattern for all fields
```

**Why?** Because:
- A sales agent might have manually entered more accurate data
- Later messages might contradict earlier ones — first data wins
- The lead name placeholder "واتساب - 201012345678" is always overwritten when a real name is found

### 8.3 Lead Card Progressive Filling

```
Message 1: "مرحبا"
  Card: { name: "واتساب - 201012345678", phone: "201012345678" }
  Completeness: 10%

Message 2: "أنا أحمد، محتاج شقة"
  Card: { name: "أحمد", phone: "...", unitType: "شقة" }
  Completeness: 25%

Message 3: "في التجمع، ميزانيتي 3 مليون"
  Card: { name: "أحمد", ..., unitType: "شقة", location: "التجمع", budget: "3,000,000" }
  Completeness: 50%

Message 4: "3 أوض وتشطيب كامل"
  Card: { ..., bedrooms: 3 }
  Completeness: 60%

Message 5: "عايز تقسيط على 7 سنين"
  Card: { ..., paymentType: "تقسيط", timeline: "7 سنين" }
  Completeness: 80%

→ Bot triggers shouldHandoff = true
→ Agent receives fully-filled lead card
```

---

## 9. Phase 7: CRM Automation — Bot Actions

### 9.1 What the Bot Can Do Automatically
Beyond just chatting, the AI can trigger real CRM actions based on the conversation:

#### Action 1: Change Lead State
```json
{
  "type": "change_state",
  "stateName": "غير مهتم"
}
```
**Triggers when:**
- Customer says "مش مهتم" / "لا شكراً" / "مش محتاج" → State: "غير مهتم" (Not Interested)
- Customer says "رقم غلط" / "مش أنا" → State: "ملغي" (Cancelled)
- Customer shows strong interest → State: "متابعة" (Following)

**Backend implementation:**
```typescript
for (const action of botResult.botActions) {
  if (action.type === "change_state" && action.stateName) {
    const state = allStates.find(s => s.name === action.stateName);
    if (state) {
      await storage.updateLead(lead.id, { stateId: state.id });
      // If moved to terminal state (cancelled/not interested), deactivate bot
      if (state.category === "lost") {
        await storage.updateLead(lead.id, { botActive: false, botStage: "handed_off" });
      }
    }
  }
}
```

#### Action 2: Create Reminder
```json
{
  "type": "create_reminder",
  "isoDate": "2026-04-12T15:00:00.000Z",
  "note": "العميل طلب الاتصال بكرة الساعة 3"
}
```
**Triggers when:**
- "كلمني بكرة" → Tomorrow at 10 AM
- "بعد يومين" → 2 days from now
- "الأسبوع الجاي" → 7 days from now
- "مشغول دلوقتي" → 2 hours from now

**Backend implementation:**
```typescript
if (action.type === "create_reminder" && action.isoDate) {
  await storage.createReminder({
    leadId: lead.id,
    userId: lead.assignedTo,
    title: `متابعة واتساب — ${lead.name}`,
    dueDate: new Date(action.isoDate),
    notes: action.note || "تذكير تلقائي من البوت",
  });
}
```

#### Action 3: Update Lead Score
```json
{
  "type": "update_score",
  "score": "hot"
}
```
**Triggers when:**
- Customer requests property viewing → "hot" 🔥
- Customer asks about specific prices → "warm" 🌡️
- Customer asks about payment/contracts → "hot" 🔥
- General inquiry → "warm" 🌡️

### 9.2 Bot Action Summary Logging
Every AI response's actions are summarized and saved in the message log:
```typescript
const actionsSummary = botResult.botActions.map(a => {
  if (a.type === "change_state") return `تغيير الحالة: ${a.stateName}`;
  if (a.type === "create_reminder") return `تذكير: ${a.note} (${a.isoDate})`;
  if (a.type === "update_score") return `تقييم: ${a.score}`;
}).join(" | ");

await storage.logWhatsappMessage({
  ...messageData,
  botActionsSummary: actionsSummary, // Visible in message history
});
```

---

## 10. Phase 8: Bot Handoff — AI to Human

### 10.1 When Does Handoff Happen?
The AI sets `shouldHandoff: true` when:

1. **Auto-qualification**: Name + Budget (or project interest) + Unit type are all collected
2. **User request**: Customer explicitly asks to talk to a human ("عايز أكلم حد" / "فين المندوب")
3. **Manual takeover**: Agent clicks "Take Over" button in the UI

### 10.2 What Happens During Handoff

```
Bot determines shouldHandoff = true
        │
        ▼
┌─────────────────────────────────┐
│ 1. Send closing message         │
│    "شكراً محمد! هنا أحد مستشا─  │
│     رينا هيتواصل معاك قريباً"   │
├─────────────────────────────────┤
│ 2. Deactivate bot for this lead │
│    UPDATE leads SET             │
│      botActive = false,         │
│      botStage = 'handed_off'    │
│    WHERE id = lead.id           │
├─────────────────────────────────┤
│ 3. Create notification          │
│    for assigned agent:          │
│    "🔥 ليد ساخن جاهز!           │
│     محمد — شقة 3 غرف            │
│     ميزانية 4 مليون              │
│     التجمع الخامس               │
│     عايز معاينة بكرة"           │
├─────────────────────────────────┤
│ 4. Broadcast SSE event          │
│    { type: "bot_handoff",       │
│      leadId: "...",             │
│      summary: "..." }          │
└─────────────────────────────────┘
```

### 10.3 Agent Manual Takeover
```
POST /api/leads/:leadId/bot/takeover

→ Sets botActive = false, botStage = "handed_off"
→ Agent can now respond manually via the Inbox
→ Bot will NEVER auto-respond to this lead again
   (unless admin reactivates it)
```

---

## 11. Phase 9: Manual Messaging — Agent Sends Messages

### 11.1 Sending a Message
```
POST /api/whatsapp/send
Body: {
  "leadId": "abc123",
  "phone": "201012345678",
  "message": "أهلاً محمد، إزيك؟ أنا أحمد من HomeAdvisor"
}
```

### 11.2 Sending Reliability Layers

```
Step 1: Check session exists and is connected
        If not connected → try auto-reconnect
        If still not connected → return error

Step 2: Check WebSocket state
        If ws.readyState !== OPEN → wait up to 20 seconds
        If still not OPEN → return error

Step 3: Format phone number to JID
        "201012345678" → "201012345678@s.whatsapp.net"

Step 4: Send message with retry
        Attempt 1 → send via standard JID
        If fails → wait 2-5 seconds → retry
        Attempt 2 → retry same JID
        Attempt 3 → try LID JID as fallback

Step 5: Log message in database
        Direction: "outbound"
        AgentId: current user
        AgentName: current user's display name
```

### 11.3 Rate Limiting
To prevent WhatsApp from flagging the number:
```typescript
const RATE_LIMIT = {
  messagesPerMinute: 30,
  messagesPerHour: 200,
  delayBetweenMessages: 2000, // 2 seconds minimum between sends
};
```

### 11.4 AI-Suggested Replies
When an agent views a conversation, they can request AI-generated reply suggestions:

```
POST /api/leads/:leadId/ai/suggest-replies

Response:
{
  "replies": [
    "أهلاً محمد! الشقة لسه متاحة، عايز أبعتلك التفاصيل؟",
    "مساء الخير محمد 😊 تحب نحجزلك معاينة الأسبوع ده؟",
    "أهلاً محمد، عندنا عرض جديد على الشقق في Mountain View، تحب أقولك؟"
  ]
}
```

The agent can tap any suggestion to send it directly, or edit it first.

---

## 12. Phase 10: WhatsApp Inbox — Chat Interface

### 12.1 Inbox API
```
GET /api/whatsapp/inbox

Returns: Array of conversations sorted by last message time
[
  {
    "leadId": "abc123",
    "leadName": "محمد علي",
    "phone": "201012345678",
    "lastMessage": "عايز أعرف الأسعار",
    "lastMessageTime": "2026-04-11T14:30:00Z",
    "direction": "inbound",
    "unreadCount": 3,
    "botActive": true,
    "botStage": "collecting_needs",
    "stateId": "state-2",
    "stateName": "Following",
    "assignedTo": "agent-1",
    "assignedToName": "أحمد خالد"
  },
  ...
]
```

### 12.2 Conversation View
```
GET /api/leads/:leadId/whatsapp-conversation

Returns: All messages for this lead, ordered chronologically
[
  {
    "id": "msg-1",
    "direction": "inbound",
    "messageText": "السلام عليكم",
    "createdAt": "2026-04-11T14:00:00Z",
    "isRead": true,
    "botActionsSummary": null
  },
  {
    "id": "msg-2",
    "direction": "outbound",
    "messageText": "وعليكم السلام! أهلاً بيك...",
    "agentName": "البوت الذكي",
    "createdAt": "2026-04-11T14:00:05Z",
    "botActionsSummary": "تقييم: warm"
  },
  ...
]
```

### 12.3 Mark as Read
```
POST /api/whatsapp/inbox/:leadId/mark-read

→ Updates all unread messages for this lead to isRead = true
→ Decrements unread count badge
```

### 12.4 Unread Count (for notification badges)
```
GET /api/whatsapp/inbox/unread-count

Returns: { "count": 7 }
→ Used for badge on WhatsApp tab in navigation
```

### 12.5 Real-Time Updates via SSE
When a new message arrives, the server broadcasts:
```typescript
broadcastSSE({
  type: "new_whatsapp_message",
  data: {
    leadId: lead.id,
    leadName: lead.name,
    phone: phone,
    message: messageText,
    direction: "inbound",
    timestamp: new Date().toISOString(),
  }
});
```

The frontend listens and automatically refreshes the conversation:
```javascript
const eventSource = new EventSource("/api/events");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "new_whatsapp_message") {
    // Refresh conversation list
    queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
    // Refresh current chat if open
    queryClient.invalidateQueries({ queryKey: ["/api/leads", data.leadId] });
  }
};
```

---

## 13. Phase 11: Templates & Campaigns

### 13.1 Message Templates
Pre-written message templates with dynamic placeholders:

```
Template: "أهلاً {{client_name}}! عندنا عرض جديد على {{project_name}}..."

API:
GET    /api/whatsapp/templates       → List all templates
POST   /api/whatsapp/templates       → Create template
PATCH  /api/whatsapp/templates/:id   → Edit template
DELETE /api/whatsapp/templates/:id   → Delete template
```

### 13.2 Bulk Campaigns
Send messages to multiple leads at once:

```
Campaign creation flow:
1. Choose template or write custom message
2. Filter target leads:
   - By state (e.g., all "Following" leads)
   - By channel (e.g., all WhatsApp leads)
   - By days without reply (e.g., no reply for 3+ days)
3. Preview recipient count
4. Schedule or send immediately
5. System sends messages one-by-one with delays (to avoid spam detection)
6. Track sent/failed/pending per recipient

API:
POST /api/campaigns          → Create campaign
POST /api/campaigns/preview  → Preview matching leads count
GET  /api/campaigns          → List campaigns
```

### 13.3 Campaign Sending Logic
```typescript
for (const recipient of campaign.recipients) {
  try {
    await sendWhatsAppMessage(userId, recipient.phone, personalizedMessage);
    await storage.updateCampaignRecipient(recipient.id, { status: "sent" });
    campaign.sentCount++;
  } catch (error) {
    await storage.updateCampaignRecipient(recipient.id, {
      status: "failed",
      errorMessage: error.message,
    });
    campaign.failedCount++;
  }

  // Rate limiting: wait 3-5 seconds between messages
  await sleep(3000 + Math.random() * 2000);
}
```

---

## 14. Phase 12: Follow-up Rules — Automated Re-engagement

### 14.1 Concept
Automatically send follow-up messages to leads who haven't replied:

```
Rule: "If lead doesn't reply for 3 days, send: أهلاً {{name}}، لسه مهتم بالعقار؟"

API:
GET    /api/followup-rules     → List rules
POST   /api/followup-rules     → Create rule
PATCH  /api/followup-rules/:id → Edit rule
DELETE /api/followup-rules/:id → Delete rule
```

### 14.2 Rule Structure
```json
{
  "id": "rule-1",
  "name": "متابعة بعد 3 أيام",
  "message": "أهلاً {{client_name}}! كنت استفسرت عن {{project}}، لسه مهتم؟",
  "daysAfterNoReply": 3,
  "isActive": true,
  "leadId": null,       // null = applies to ALL leads
  "lastRunAt": null
}
```

---

## 15. Database Schema

### 15.1 WhatsApp Messages Log
```sql
CREATE TABLE whatsapp_messages_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR REFERENCES leads(id),
  agent_id VARCHAR,
  agent_name TEXT,
  template_id VARCHAR,
  template_name TEXT,
  phone TEXT NOT NULL,
  direction TEXT DEFAULT 'outbound',     -- 'inbound' or 'outbound'
  message_text TEXT,
  message_id VARCHAR,                     -- WhatsApp's unique message ID (for dedup)
  is_read BOOLEAN DEFAULT false,
  bot_actions_summary TEXT,               -- Human-readable summary of bot CRM actions
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 15.2 WhatsApp Templates
```sql
CREATE TABLE whatsapp_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body TEXT NOT NULL,                     -- Template text with {{placeholders}}
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 15.3 Campaigns
```sql
CREATE TABLE whatsapp_campaigns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT,
  template_id VARCHAR,
  filter_state_id VARCHAR,                -- Target leads in this state
  filter_channel TEXT,                    -- Target leads from this channel
  filter_days_no_reply INTEGER,           -- Target leads with no reply for X days
  scheduled_at TIMESTAMP,
  status TEXT DEFAULT 'draft',            -- draft/scheduled/running/completed/cancelled
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE whatsapp_campaign_recipients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR REFERENCES whatsapp_campaigns(id),
  lead_id VARCHAR REFERENCES leads(id),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',          -- pending/sent/failed
  sent_at TIMESTAMP,
  error_message TEXT
);
```

### 15.4 Follow-up Rules
```sql
CREATE TABLE whatsapp_followup_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR REFERENCES leads(id),   -- null = global rule
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  days_after_no_reply INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 15.5 Chatbot Settings
```sql
CREATE TABLE chatbot_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR,                        -- Which user this config belongs to
  is_active BOOLEAN DEFAULT false,
  working_hours_start TEXT DEFAULT '09:00',
  working_hours_end TEXT DEFAULT '17:00',
  respond_always BOOLEAN DEFAULT false,   -- Ignore working hours
  welcome_message TEXT,
  bot_name TEXT DEFAULT 'المساعد الذكي',
  company_name TEXT,
  bot_role TEXT DEFAULT 'مستشار عقاري',
  bot_personality TEXT,                   -- Custom personality prompt
  bot_mission TEXT,                       -- Custom mission prompt
  company_knowledge TEXT,                 -- Additional info to feed the AI
  enabled_project_ids TEXT[],             -- Limit bot to these projects only
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 15.6 Lead Table (WhatsApp-relevant columns)
```sql
-- These columns on the leads table support WhatsApp/bot functionality:
ALTER TABLE leads ADD COLUMN bot_active BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN bot_stage TEXT DEFAULT 'greeting';
ALTER TABLE leads ADD COLUMN ai_analyzed_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN channel TEXT;           -- 'واتساب', 'Facebook', etc.
ALTER TABLE leads ADD COLUMN source TEXT;            -- 'whatsapp_incoming', etc.
ALTER TABLE leads ADD COLUMN phone2 TEXT;            -- Secondary phone (auto-extracted)
ALTER TABLE leads ADD COLUMN budget TEXT;
ALTER TABLE leads ADD COLUMN unit_type TEXT;
ALTER TABLE leads ADD COLUMN bedrooms INTEGER;
ALTER TABLE leads ADD COLUMN location TEXT;
ALTER TABLE leads ADD COLUMN area TEXT;
ALTER TABLE leads ADD COLUMN payment_type TEXT;
ALTER TABLE leads ADD COLUMN down_payment TEXT;
ALTER TABLE leads ADD COLUMN preferred_project TEXT;
ALTER TABLE leads ADD COLUMN timeline TEXT;
```

---

## 16. API Endpoints Reference

### Connection Management
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/whatsapp/status` | Check connection state (connected/disconnected/qr) |
| POST | `/api/whatsapp/connect` | Start new connection, generate QR code |
| POST | `/api/whatsapp/disconnect` | Gracefully disconnect |
| POST | `/api/whatsapp/reset` | Delete session files and reconnect (for corrupted sessions) |
| GET | `/api/whatsapp/diagnose` | Debug info: session dir, socket state, LID mappings |

### Messaging
| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/whatsapp/send` | Send a message to a lead |
| GET | `/api/whatsapp/inbox` | List all conversations (with last message, unread count) |
| GET | `/api/whatsapp/inbox/unread-count` | Total unread messages (for badge) |
| POST | `/api/whatsapp/inbox/:leadId/mark-read` | Mark all messages as read for a lead |
| GET | `/api/leads/:leadId/whatsapp-conversation` | Full message history for a lead |

### AI & Bot
| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/leads/:leadId/ai/suggest-replies` | Get 3 AI-generated reply suggestions |
| POST | `/api/leads/:leadId/ai/analyze` | Analyze conversation and extract lead data |
| GET | `/api/chatbot/settings` | Get chatbot configuration |
| PUT | `/api/chatbot/settings` | Update chatbot configuration |
| POST | `/api/leads/:leadId/bot/takeover` | Agent takes over from bot |

### Templates & Campaigns
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/whatsapp/templates` | List templates |
| POST | `/api/whatsapp/templates` | Create template |
| PATCH | `/api/whatsapp/templates/:id` | Edit template |
| DELETE | `/api/whatsapp/templates/:id` | Delete template |
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/preview` | Preview target recipients |
| DELETE | `/api/campaigns/:id` | Cancel campaign |

### Follow-up Rules
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/followup-rules` | List rules |
| POST | `/api/followup-rules` | Create rule |
| PATCH | `/api/followup-rules/:id` | Edit rule |
| DELETE | `/api/followup-rules/:id` | Delete rule |

---

## 17. Common Problems & Solutions

### Problem 1: QR Code Expires Too Fast
**Cause**: WhatsApp refreshes QR every ~20 seconds. If the user is slow, it expires.
**Solution**: The system listens for every new QR event and updates the displayed image automatically. The 60-second timeout is a safety net, not a hard limit — new QR codes keep coming.

### Problem 2: Connection Drops Frequently
**Cause**: WhatsApp disconnects idle sessions or during network instability.
**Solution**: Exponential backoff reconnection (up to 5 attempts). On server restart, sessions auto-reconnect from saved credentials.

### Problem 3: Messages From Unknown LID Format
**Cause**: WhatsApp's multi-device uses LID internally instead of phone numbers.
**Solution**: Triple-layer resolution:
1. In-memory LID→Phone map (populated from contact sync)
2. On-disk mapping files from Baileys session
3. Baileys internal key store query

### Problem 4: Bot Sends Incorrect Prices
**Cause**: AI hallucinating prices not in the inventory.
**Solution**: The system prompt strictly includes ONLY real inventory data and instructs the AI: "Only quote real prices from the inventory list above — never invent numbers."

### Problem 5: Bot Won't Stop Replying
**Cause**: Bot keeps responding even after agent wants to take over.
**Solution**: Agent clicks "Take Over" → `botActive = false, botStage = "handed_off"`. Bot will NEVER respond to this lead again unless admin reactivates.

### Problem 6: Duplicate Messages in Database
**Cause**: WhatsApp delivers same message twice (network retry).
**Solution**: Every message has a unique `messageId` from WhatsApp. Before processing, check if this ID already exists in the database.

### Problem 7: Number Gets Blocked by WhatsApp
**Cause**: Sending too many messages too fast (spam behavior).
**Solution**: Rate limiting (30/min, 200/hr), minimum 2-second gap between sends, 3-5 second gaps in campaigns. Never send to numbers that haven't messaged first (warm conversations only).

### Problem 8: Session Files Corrupted
**Cause**: Server crash during credential save.
**Solution**: `POST /api/whatsapp/reset` deletes all session files and forces a clean reconnect (new QR scan required).

---

## 18. Security Considerations

### 18.1 Session Security
- Session files contain WhatsApp encryption keys — treat like passwords
- Store in a directory NOT served by the web server (`.whatsapp_sessions/`)
- Add to `.gitignore` — never commit to version control
- On multi-tenant systems, isolate sessions by user ID

### 18.2 Message Privacy
- All messages are stored in the database — inform users
- Implement data retention policies (auto-delete after X months)
- Only the assigned agent (and admins) can see a lead's messages
- Lead reassignment with history-hiding prevents new agent from seeing old conversations

### 18.3 Rate Limiting
- Sending: Max 30 messages/minute, 200/hour per number
- Campaign: 3-5 second delay between each recipient
- AI: Max 1 AI call per incoming message (no recursive loops)
- QR generation: Max 1 connection attempt per user at a time

### 18.4 AI Safety
- AI response is always validated (JSON parse, field type checks)
- If AI returns invalid response, system sends a safe fallback: "شكراً على تواصلك! سيتواصل معك أحد مستشارينا قريباً."
- AI cannot access user data beyond the current lead's information
- Bot actions (state changes, reminders) are validated against real database states
- AI cannot delete data — only read and create

---

*End of WhatsApp System PRD v1.0*
*Total system: ~1,500 lines of WhatsApp code + ~500 lines of AI code + ~400 lines of route handlers*
