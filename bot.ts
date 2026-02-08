import { query } from "@anthropic-ai/claude-agent-sdk";
import { appendFile, unlink, stat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || 'test';
if (!TOKEN || !ANTHROPIC_KEY) {
  console.error("Set TELEGRAM_BOT_TOKEN and ANTHROPIC_API_KEY");
  process.exit(1);
}
const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await res.json()) as { ok: boolean; result: any };
}

function chatFile(chatId: number) {
  return resolve(`messages-${chatId}.txt`);
}

async function handleMessage(msg: any, botId: number) {
  if (!msg.text || msg.from?.id === botId) return;
console.log(`Received message in chat ${msg.chat.id} from ${msg.from?.username || msg.from?.first_name}: ${msg.text}`);
  const name = msg.from?.username ?? msg.from?.first_name ?? "unknown";
  const ts = new Date(msg.date * 1000).toISOString();
  await appendFile(chatFile(msg.chat.id), `[${ts}] ${name}: ${msg.text}\n`);
}

async function handleSummarize(msg: any) {
  const filePath = chatFile(msg.chat.id);
  let content: string;
  try {
    const info = await stat(filePath);
    if (info.size === 0) throw new Error("empty");
    content = await readFile(filePath, "utf-8");
    console.log(`Read ${content.length} chars from ${filePath}`, content);
  } catch {
    console.log("No messages to summarize");
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "No messages to summarize!",
    });
    return;
  }

  const lineCount = content.split("\n").filter(Boolean).length;

  try {
    let summary = "";
    const result = query({
      prompt: `Read the file ${filePath} and summarize the chat messages as concise bullet points. Only output the bullet points, nothing else.`,
      options: {
        allowedTools: ["Read"],
        permissionMode: "acceptEdits",
      },
    });
    console.log("Generating summary with Claude...");

    for await (const message of result) {
      console.log("Received message from Claude:", message);
      if (message.type === "result") {
        summary = message.result;
      }
    }

    console.log("Creating summary");

    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: `Summary of ${lineCount} messages:\n\n${summary}`,
    });
    await unlink(filePath);
  } catch (err) {
    console.error("Summarize error:", err);
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: "Failed to generate summary. Try again later.",
    });
  }
}

async function main() {
  const me = await tg("getMe");
  if (!me.ok) {
    console.error("Failed to connect:", me);
    process.exit(1);
  }
  const botId: number = me.result.id;
  console.log(`Bot @${me.result.username} started`);

  let offset = 0;
  while (true) {
    try {
      const updates = await tg("getUpdates", {
        offset,
        timeout: 30,
      });
      if (!updates.ok) throw new Error("getUpdates failed");
    console.log(`Received ${updates.result.length} updates`);

      for (const update of updates.result) {
        offset = update.update_id + 1;
        const msg = update.message;
        if (!msg) continue;

        if (msg.text?.startsWith("/summarize")) {
          await handleSummarize(msg);
        } else {
          await handleMessage(msg, botId);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main();
