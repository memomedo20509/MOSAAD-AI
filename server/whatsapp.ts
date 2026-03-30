import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";
import { EventEmitter } from "events";
import pino from "pino";

const SESSIONS_DIR = path.join(process.cwd(), ".whatsapp_sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

export type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

export interface WaSession {
  userId: string;
  socket: WASocket | null;
  status: WaStatus;
  qrDataUrl: string | null;
  errorMessage: string | null;
  emitter: EventEmitter;
}

const sessions = new Map<string, WaSession>();

export interface IncomingWAMessage {
  userId: string;
  phone: string;
  messageText: string;
  messageId: string;
  timestamp: Date;
}

type IncomingMessageHandler = (msg: IncomingWAMessage) => Promise<void>;

const incomingMessageHandlers = new Map<string, IncomingMessageHandler>();

export function setIncomingMessageHandler(userId: string, handler: IncomingMessageHandler): void {
  incomingMessageHandlers.set(userId, handler);
}

function getSessionDir(userId: string): string {
  return path.join(SESSIONS_DIR, userId);
}

export async function getOrCreateSession(userId: string): Promise<WaSession> {
  let session = sessions.get(userId);
  if (!session) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(20);
    session = {
      userId,
      socket: null,
      status: "disconnected",
      qrDataUrl: null,
      errorMessage: null,
      emitter,
    };
    sessions.set(userId, session);
  }
  return session;
}

const reconnectAttempts = new Map<string, number>();
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

export async function startConnection(userId: string, freshSession = false, forceReconnect = false): Promise<WaSession> {
  const session = await getOrCreateSession(userId);

  if (!forceReconnect && (session.status === "connected" || session.status === "connecting" || session.status === "qr")) {
    return session;
  }

  session.status = "connecting";
  session.qrDataUrl = null;
  session.errorMessage = null;

  const sessionDir = getSessionDir(userId);

  const safetyTimeout = setTimeout(() => {
    if (session.status === "connecting") {
      console.error(`[WhatsApp] Safety timeout for user ${userId} — no QR received after 60s`);
      session.status = "disconnected";
      session.errorMessage = "تعذّر الاتصال بخوادم واتساب — يرجى المحاولة مجدداً أو التحقق من إعدادات الشبكة";
      session.emitter.emit("status", { status: "disconnected", errorMessage: session.errorMessage });
      if (session.socket) { try { session.socket.end(undefined); } catch {} session.socket = null; }
    }
  }, 60000);

  try {
    if (freshSession) {
      try {
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      } catch {}
    }
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    let version: [number, number, number] | undefined;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      console.log(`[WhatsApp] Using version ${version.join(".")} for user ${userId}`);
    } catch (err) {
      console.error("[WhatsApp] fetchLatestBaileysVersion failed, will use library default:", (err as Error).message);
    }

    const logger = pino({ level: "silent" });

    const socketOpts: Parameters<typeof makeWASocket>[0] = {
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: ["HomeAdvisor CRM", "Chrome", "22.0"],
      connectTimeoutMs: 45000,
      defaultQueryTimeoutMs: 45000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 500,
      qrTimeout: 40000,
    };
    if (version) {
      socketOpts.version = version;
    }

    const sock = makeWASocket(socketOpts);

    session.socket = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      const handler = incomingMessageHandlers.get(userId);
      if (!handler) return;

      for (const msg of messages) {
        try {
          if (msg.key.fromMe) continue;

          const remoteJid = msg.key.remoteJid;
          if (!remoteJid) continue;

          if (remoteJid === "status@broadcast") continue;
          if (remoteJid.endsWith("@g.us")) continue;

          const rawPhone = remoteJid.split("@")[0];
          if (!rawPhone) continue;

          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            null;

          if (!text) continue;

          const messageId = msg.key.id || "";
          const timestamp = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000)
            : new Date();

          await handler({ userId, phone: rawPhone, messageText: text, messageId, timestamp });
        } catch (err) {
          console.error("[WhatsApp] Error processing incoming message:", err);
        }
      }
    });

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        clearTimeout(safetyTimeout);
        try {
          const dataUrl = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          session.qrDataUrl = dataUrl;
          session.status = "qr";
          session.errorMessage = null;
          reconnectAttempts.set(userId, 0);
          session.emitter.emit("status", { status: "qr", qrDataUrl: dataUrl });
        } catch (err) {
          console.error("[WhatsApp] QR generation error:", err);
        }
      }

      if (connection === "open") {
        clearTimeout(safetyTimeout);
        session.status = "connected";
        session.qrDataUrl = null;
        session.errorMessage = null;
        reconnectAttempts.set(userId, 0);
        console.log(`[WhatsApp] Connected successfully for user ${userId}`);
        session.emitter.emit("status", { status: "connected" });
      }

      if (connection === "close") {
        clearTimeout(safetyTimeout);
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        session.socket = null;

        console.log(`[WhatsApp] Connection closed for user ${userId}, code=${code}, shouldReconnect=${shouldReconnect}`);

        if (shouldReconnect) {
          const attempts = reconnectAttempts.get(userId) ?? 0;
          if (attempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.set(userId, attempts + 1);
            const delay = RECONNECT_DELAY_MS * (attempts + 1);
            console.log(`[WhatsApp] Reconnecting user ${userId} in ${delay}ms (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
            session.status = "connecting";
            session.emitter.emit("status", { status: "connecting" });
            setTimeout(async () => {
              try {
                await startConnection(userId, false, true);
              } catch (err) {
                console.error(`[WhatsApp] Reconnect failed for user ${userId}:`, err instanceof Error ? err.message : err);
                session.status = "disconnected";
                session.socket = null;
              }
            }, delay);
          } else {
            console.error(`[WhatsApp] Max reconnect attempts reached for user ${userId}`);
            session.status = "disconnected";
            session.errorMessage = "فشل الاتصال بعد عدة محاولات — يرجى الضغط على 'مسح وإعادة الاتصال'";
            reconnectAttempts.set(userId, 0);
            session.emitter.emit("status", { status: "disconnected", errorMessage: session.errorMessage });
          }
        } else {
          await disconnectSession(userId);
        }
      }
    });

  } catch (initError) {
    clearTimeout(safetyTimeout);
    const errMsg = initError instanceof Error ? initError.message : String(initError);
    console.error(`[WhatsApp] Socket init error for user ${userId}:`, errMsg);

    session.status = "disconnected";
    session.socket = null;
    session.errorMessage = `فشل في تهيئة الاتصال: ${errMsg}`;
    session.emitter.emit("status", { status: "disconnected", errorMessage: session.errorMessage });

    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {}

    throw initError;
  }

  return session;
}

export async function disconnectSession(userId: string): Promise<void> {
  const session = sessions.get(userId);
  if (session) {
    if (session.socket) {
      try {
        await session.socket.logout();
      } catch {}
      try {
        session.socket.end(undefined);
      } catch {}
      session.socket = null;
    }
    session.status = "disconnected";
    session.qrDataUrl = null;
    session.emitter.emit("status", { status: "disconnected" });

    const sessionDir = getSessionDir(userId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }
}

export function getSessionStatus(userId: string): { status: WaStatus; qrDataUrl: string | null; errorMessage: string | null } {
  const session = sessions.get(userId);
  if (!session) {
    return { status: "disconnected", qrDataUrl: null, errorMessage: null };
  }
  return { status: session.status, qrDataUrl: session.qrDataUrl, errorMessage: session.errorMessage };
}

async function waitForConnected(session: WaSession, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (session.status === "connected" && session.socket) return true;
    if (session.status === "disconnected") return false;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

export async function sendWhatsAppMessage(
  userId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[WhatsApp] sendWhatsAppMessage called for user=${userId}, phone=${phone}`);

  const session = sessions.get(userId);
  if (!session) {
    console.log(`[WhatsApp] sendWhatsAppMessage: no session found for user ${userId}`);
    return { success: false, error: "WhatsApp not connected — لا يوجد جلسة واتساب" };
  }

  console.log(`[WhatsApp] sendWhatsAppMessage: session status=${session.status}, hasSocket=${!!session.socket}`);

  if (session.status !== "connected" || !session.socket) {
    if (session.status === "connecting" || session.status === "qr") {
      console.log(`[WhatsApp] sendWhatsAppMessage: session is ${session.status}, waiting up to 20s...`);
      const ok = await waitForConnected(session, 20000);
      if (!ok) {
        console.log(`[WhatsApp] sendWhatsAppMessage: wait timed out, status=${session.status}`);
        return { success: false, error: "WhatsApp reconnecting — يرجى الانتظار قليلاً وإعادة المحاولة" };
      }
    } else if (session.status === "disconnected") {
      console.log(`[WhatsApp] sendWhatsAppMessage: session disconnected, attempting reconnect...`);
      try {
        await startConnection(userId, false, true);
        const ok = await waitForConnected(session, 20000);
        if (!ok) {
          console.log(`[WhatsApp] sendWhatsAppMessage: reconnect wait timed out`);
          return { success: false, error: "WhatsApp disconnected — تعذر إعادة الاتصال" };
        }
      } catch (err) {
        console.error(`[WhatsApp] sendWhatsAppMessage: reconnect failed:`, err);
        return { success: false, error: "WhatsApp disconnected — فشل إعادة الاتصال" };
      }
    } else {
      return { success: false, error: "WhatsApp not connected" };
    }
  }

  if (!session.socket) {
    console.log(`[WhatsApp] sendWhatsAppMessage: socket still null after waiting`);
    return { success: false, error: "WhatsApp socket not available" };
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    console.log(`[WhatsApp] sendWhatsAppMessage: invalid phone number: ${phone}`);
    return { success: false, error: "Invalid phone number" };
  }

  const jid = `${normalized}@s.whatsapp.net`;
  console.log(`[WhatsApp] sendWhatsAppMessage: sending to jid=${jid}`);

  const delay = 500 + Math.random() * 1500;
  await new Promise((r) => setTimeout(r, delay));

  try {
    await session.socket!.sendMessage(jid, { text: message });
    console.log(`[WhatsApp] sendWhatsAppMessage: SUCCESS sent to ${jid}`);
    return { success: true };
  } catch (err) {
    console.error(`[WhatsApp] sendWhatsAppMessage: FAILED to send to ${jid}:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

function normalizePhone(phone: string): string | null {
  let cleaned = phone.replace(/\D/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("0")) cleaned = "20" + cleaned.slice(1);
  if (!cleaned.startsWith("20") && cleaned.length === 10) cleaned = "20" + cleaned;
  if (cleaned.length < 10) return null;
  return cleaned;
}

export async function restoreSessionsOnStartup(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const userDirs = fs.readdirSync(SESSIONS_DIR);
  for (const userId of userDirs) {
    const dir = path.join(SESSIONS_DIR, userId);
    if (fs.statSync(dir).isDirectory()) {
      try {
        await startConnection(userId);
      } catch (err) {
        console.error(`Failed to restore WhatsApp session for user ${userId}:`, err);
      }
    }
  }
}
