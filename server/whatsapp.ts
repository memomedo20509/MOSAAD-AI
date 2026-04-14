export interface IncomingWAMessage {
  from: string;
  body: string;
  timestamp: number;
  messageId?: string;
  contactName?: string;
}

type IncomingMessageHandler = (msg: IncomingWAMessage) => Promise<void>;
type LidResolvedHandler = (lid: string, jid: string) => void;

let _incomingHandler: IncomingMessageHandler | null = null;
let _lidHandler: LidResolvedHandler | null = null;

export function setIncomingMessageHandler(handler: IncomingMessageHandler): void {
  _incomingHandler = handler;
}

export function onLidResolved(handler: LidResolvedHandler): void {
  _lidHandler = handler;
}

export async function startConnection(sessionId: string): Promise<{ qr?: string; status: string }> {
  return { status: "disconnected" };
}

export async function disconnectSession(sessionId: string): Promise<void> {
  // stub
}

export async function getSessionStatus(sessionId: string): Promise<string> {
  return "disconnected";
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  sessionId?: string
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: "WhatsApp not configured. Please use WhatsApp Cloud API." };
}

export async function restoreSessionsOnStartup(): Promise<void> {
  // stub
}
