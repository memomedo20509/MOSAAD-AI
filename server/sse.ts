import type { Response } from "express";

interface SseClient {
  userId: string;
  res: Response;
}

const clients: SseClient[] = [];

export function addSseClient(userId: string, res: Response): void {
  clients.push({ userId, res });
}

export function removeSseClient(res: Response): void {
  const idx = clients.findIndex(c => c.res === res);
  if (idx !== -1) clients.splice(idx, 1);
}

export type SseEventType =
  | "new_whatsapp_message"
  | "new_lead"
  | "lead_updated"
  | "new_notification"
  | "ping";

export interface SseEvent {
  type: SseEventType;
  payload?: Record<string, unknown>;
}

export function broadcastToUser(userId: string, event: SseEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    if (client.userId === userId) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        // client disconnected
      }
    }
  }
}

export function broadcastToAll(event: SseEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch {
      // client disconnected
    }
  }
}
