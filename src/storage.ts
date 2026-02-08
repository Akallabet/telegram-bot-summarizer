import { appendFile, readFile, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";

export interface ChatMessage {
  chatId: number;
  threadId?: number;
  username: string;
  text: string;
  timestamp: number;
}

export function getChatFilePath(chatId: number, threadId?: number): string {
  if (threadId) {
    return resolve(`messages-${chatId}-${threadId}.txt`);
  }
  return resolve(`messages-${chatId}.txt`);
}

export async function appendMessage(msg: ChatMessage): Promise<void> {
  const ts = new Date(msg.timestamp * 1000).toISOString();
  await appendFile(
    getChatFilePath(msg.chatId, msg.threadId),
    `[${ts}] ${msg.username}: ${msg.text}\n`,
  );
}

export async function readMessages(
  chatId: number,
  threadId?: number,
): Promise<{ content: string; lineCount: number; filePath: string } | null> {
  const filePath = getChatFilePath(chatId, threadId);
  try {
    const info = await stat(filePath);
    if (info.size === 0) return null;
    const content = await readFile(filePath, "utf-8");
    const lineCount = content.split("\n").filter(Boolean).length;
    return { content, lineCount, filePath };
  } catch {
    return null;
  }
}

export async function deleteMessages(
  chatId: number,
  threadId?: number,
): Promise<void> {
  const filePath = getChatFilePath(chatId, threadId);
  try {
    await unlink(filePath);
  } catch {
    // file may not exist, ignore
  }
}
