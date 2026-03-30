import makeWASocket, {
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

export async function startConnection(userId: string): Promise<WaSession> {
  const session = await getOrCreateSession(userId);

  if (session.status === "connected" || session.status === "connecting" || session.status === "qr") {
    return session;
  }

  session.status = "connecting";
  session.qrDataUrl = null;
  session.errorMessage = null;

  const sessionDir = getSessionDir(userId);

  // Safety timeout — fires if no QR received within 45s regardless of where the failure occurs
  const safetyTimeout = setTimeout(() => {
    if (session.status === "connecting") {
      console.error(`[WhatsApp] Safety timeout for user ${userId} — no QR received after 45s`);
      session.status = "disconnected";
      session.errorMessage = "تعذّر الاتصال بخوادم واتساب — يرجى المحاولة مجدداً أو التحقق من إعدادات الشبكة";
      session.emitter.emit("status", { status: "disconnected", errorMessage: session.errorMessage });
      if (session.socket) { try { session.socket.end(undefined); } catch {} session.socket = null; }
    }
  }, 45000);

  try {
    // Always start fresh — delete any previously corrupted auth state
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {}
    fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    let version: [number, number, number] = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      console.log(`[WhatsApp] Using version ${version.join(".")} for user ${userId}`);
    } catch (err) {
      console.error("[WhatsApp] fetchLatestBaileysVersion failed, using fallback version:", (err as Error).message);
    }

    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: ["HomeAdvisor CRM", "Chrome", "1.0"],
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 30000,
    });

    session.socket = sock;
    sock.ev.on("creds.update", saveCreds);

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
        session.emitter.emit("status", { status: "connected" });
      }

      if (connection === "close") {
        clearTimeout(safetyTimeout);
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        session.socket = null;

        if (shouldReconnect) {
          session.status = "disconnected";
          session.emitter.emit("status", { status: "disconnected" });
        } else {
          await disconnectSession(userId);
        }
      }
    });

  } catch (initError) {
    // Socket initialization failed — reset state immediately and clean corrupt auth data
    clearTimeout(safetyTimeout);
    const errMsg = initError instanceof Error ? initError.message : String(initError);
    console.error(`[WhatsApp] Socket init error for user ${userId}:`, errMsg);

    session.status = "disconnected";
    session.socket = null;
    session.errorMessage = `فشل في تهيئة الاتصال: ${errMsg}`;
    session.emitter.emit("status", { status: "disconnected", errorMessage: session.errorMessage });

    // Remove potentially corrupted auth state so next attempt starts fresh
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

export async function sendWhatsAppMessage(
  userId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const session = sessions.get(userId);
  if (!session || session.status !== "connected" || !session.socket) {
    return { success: false, error: "WhatsApp not connected" };
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { success: false, error: "Invalid phone number" };
  }

  const jid = `${normalized}@s.whatsapp.net`;

  // Validate that the recipient has a WhatsApp account before sending
  try {
    const [result] = await session.socket.onWhatsApp(jid);
    if (!result?.exists) {
      return { success: false, error: "This phone number is not registered on WhatsApp" };
    }
  } catch (err: any) {
    // If onWhatsApp check fails (e.g., network issue), proceed cautiously
    console.warn("WhatsApp existence check failed, proceeding anyway:", err?.message);
  }

  const delay = 2000 + Math.random() * 3000;
  await new Promise((r) => setTimeout(r, delay));

  try {
    await session.socket.sendMessage(jid, { text: message });
    return { success: true };
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
    return { success: false, error: err?.message || "Send failed" };
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
