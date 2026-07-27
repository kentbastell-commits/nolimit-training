import * as pg from "../pg/clientMessages.ts";
import type { ClientMessageDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Same shape as the other read-through repositories: the unfiltered list is
// cached (5 min) and every writer invalidates it, or the coach queue shows
// stale for up to 10 minutes (CLAUDE.md mistake #5).
const CACHE_KEY = "clientMessages";

export async function listClientMessages(q: {
  clientId?: string;
  status?: string;
} = {}): Promise<ClientMessageDTO[]> {
  let messages = getCached<ClientMessageDTO[]>(CACHE_KEY);
  if (!messages) {
    messages = await pg.listAllMessages();
    setCached(CACHE_KEY, messages, 5 * 60 * 1000);
  }
  const clientId = String(q.clientId || "").trim();
  const status = String(q.status || "").trim().toLowerCase();
  return messages.filter((m) => {
    if (clientId && m.clientId !== clientId) return false;
    if (status && m.status.toLowerCase() !== status) return false;
    return true;
  });
}

export async function createClientMessage(input: {
  clientId: string;
  clientName?: string;
  body: string;
}): Promise<string> {
  const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await pg.createMessage({
    messageId,
    clientId: input.clientId,
    clientName: String(input.clientName || ""),
    body: input.body,
  });
  invalidateCache(CACHE_KEY);
  return messageId;
}

export async function replyToClientMessage(
  messageId: string,
  coachReply: string
): Promise<boolean> {
  const ok = await pg.replyToMessage(messageId, coachReply);
  if (ok) invalidateCache(CACHE_KEY);
  return ok;
}
