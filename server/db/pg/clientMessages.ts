import { desc, eq } from "drizzle-orm";
import { db } from "../client.ts";
import { clientMessages } from "../schema.ts";
import { str } from "./_util.ts";
import { fillTranslation } from "../translate.ts";
import type { ClientMessageDTO } from "../dto.ts";

type Row = typeof clientMessages.$inferSelect;

const toDTO = (r: Row): ClientMessageDTO => ({
  messageId: str(r.messageId),
  clientId: str(r.clientId),
  clientName: str(r.clientName),
  body: str(r.body),
  status: str(r.status) || "New",
  coachReply: str(r.coachReply),
  coachReplyCn: str(r.coachReplyCn),
  createdAt: r.createdAt ?? 0,
  repliedAt: r.repliedAt ?? 0,
});

export async function listAllMessages(): Promise<ClientMessageDTO[]> {
  const rows = await db
    .select()
    .from(clientMessages)
    .orderBy(desc(clientMessages.createdAt));
  return rows.map(toDTO);
}

export async function createMessage(input: {
  messageId: string;
  clientId: string;
  clientName: string;
  body: string;
}): Promise<void> {
  await db.insert(clientMessages).values({
    messageId: input.messageId,
    clientId: input.clientId,
    clientName: input.clientName || null,
    body: input.body,
    status: "New",
    createdAt: Date.now(),
  });
}

export async function replyToMessage(
  messageId: string,
  coachReply: string
): Promise<boolean> {
  const updated = await db
    .update(clientMessages)
    // A new reply replaces the old mirror; the fill below rebuilds it.
    .set({ coachReply, coachReplyCn: null, status: "Replied", repliedAt: Date.now() })
    .where(eq(clientMessages.messageId, messageId))
    .returning({ messageId: clientMessages.messageId });

  // Best-effort zh mirror of the coach's reply (skip text already Chinese).
  if (updated.length > 0 && coachReply && !/[一-鿿]/.test(coachReply)) {
    void fillTranslation(coachReply, "zh", (zh) =>
      db
        .update(clientMessages)
        .set({ coachReplyCn: zh })
        .where(eq(clientMessages.messageId, messageId))
    );
  }
  return updated.length > 0;
}
