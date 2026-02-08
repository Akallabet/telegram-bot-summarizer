import { DatabaseSync } from "node:sqlite";

export interface ChatMessage {
  chatId: number;
  messageId: number;
  threadId?: number;
  userId: number;
  username: string;
  text: string;
  timestamp: number;
}

let db: DatabaseSync | null = null;

const migrations: ((db: DatabaseSync) => void)[] = [
  (db) => {
    db.exec(`
			CREATE TABLE messages (
				chat_id    INTEGER NOT NULL,
				message_id INTEGER NOT NULL,
				thread_id  INTEGER,
				user_id    INTEGER NOT NULL,
				username   TEXT    NOT NULL,
				text       TEXT    NOT NULL,
				timestamp  INTEGER NOT NULL,
				PRIMARY KEY (chat_id, message_id)
			);

			CREATE INDEX idx_messages_chat_thread_ts
				ON messages (chat_id, thread_id, timestamp DESC);
		`);
  },
];

export function initDatabase(path?: string): void {
  db = new DatabaseSync(path ?? "messages.db");
  db.exec("PRAGMA journal_mode = WAL");

  const versionRow = db.prepare("PRAGMA user_version").get() as
    | { user_version: number }
    | undefined;
  const currentVersion = versionRow?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    migrations[i](db);
    db.exec(`PRAGMA user_version = ${i + 1}`);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function appendMessage(msg: ChatMessage): void {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare(`
		INSERT OR IGNORE INTO messages (chat_id, message_id, thread_id, user_id, username, text, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);
  stmt.run(
    msg.chatId,
    msg.messageId,
    msg.threadId ?? null,
    msg.userId,
    msg.username,
    msg.text,
    msg.timestamp,
  );
}

export function readMessages(
  chatId: number,
  threadId?: number,
  limit?: number,
): { content: string; messageCount: number } | null {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare(`
		SELECT * FROM messages
		WHERE chat_id = ? AND thread_id IS ?
		ORDER BY timestamp DESC
		LIMIT ?
	`);
  const rows = stmt.all(chatId, threadId ?? null, limit ?? -1) as {
    username: string;
    text: string;
    timestamp: number;
  }[];

  if (rows.length === 0) return null;

  // Reverse so oldest messages come first in the content
  const lines = rows
    .reverse()
    .map((r) => {
      const ts = new Date(r.timestamp * 1000).toISOString();
      return `[${ts}] ${r.username}: ${r.text}`;
    })
    .join("\n");

  return { content: `${lines}\n`, messageCount: rows.length };
}
