import { Response } from "express";

interface SseClient {
  userId: string;
  res: Response;
}

const clients: SseClient[] = [];

export function addSseClient(userId: string, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push({ userId, res });

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
}

export function removeSseClient(res: Response) {
  const index = clients.findIndex((c) => c.res === res);
  if (index !== -1) {
    clients.splice(index, 1);
  }
}

export function broadcastToUser(userId: string, payload: object) {
  const userClients = clients.filter((c) => c.userId === userId);
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  userClients.forEach((c) => {
    try {
      c.res.write(data);
    } catch {
      removeSseClient(c.res);
    }
  });
}

export function broadcastToAll(payload: object) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((c) => {
    try {
      c.res.write(data);
    } catch {
      removeSseClient(c.res);
    }
  });
}
