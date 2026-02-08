import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import {
  appendMessage,
  closeDatabase,
  initDatabase,
  readMessages,
} from "./storage.ts";
import {
  formatSummaryMessage,
  generateSummary,
  stopSummarizer,
} from "./summarizer.ts";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

initDatabase();

bot.command("summarize", async (ctx) => {
  const threadId = ctx.message.message_thread_id;
  const chatId = ctx.message.chat.id;
  const count = parseInt(ctx.message.text.split(" ")[1], 10) || undefined;

  const result = readMessages(chatId, threadId, count);
  if (!result) {
    await ctx.reply("No messages to summarize!", {
      message_thread_id: threadId,
    });
    return;
  }

  try {
    console.log(
      `Read ${result.content.length} chars, ${result.messageCount} messages`,
    );
    const summary = await generateSummary(result.content);
    const text = formatSummaryMessage(result.messageCount, summary, threadId);
    await ctx.reply(text, { message_thread_id: threadId });
  } catch (err) {
    console.error("Summarize error:", err);
    await ctx.reply("Failed to generate summary. Try again later.", {
      message_thread_id: threadId,
    });
  }
});

bot.on(message("text"), async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;

  const msg = ctx.message;
  const username = msg.from?.username ?? msg.from?.first_name ?? "unknown";

  console.log(
    `Received message in chat ${msg.chat.id} from ${username}: ${msg.text}`,
  );

  appendMessage({
    chatId: msg.chat.id,
    messageId: msg.message_id,
    threadId: msg.message_thread_id,
    userId: msg.from?.id ?? 0,
    username,
    text: msg.text,
    timestamp: msg.date,
  });
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

bot.launch();
console.log("Bot started");

process.once("SIGINT", async () => {
  bot.stop("SIGINT");
  closeDatabase();
  await stopSummarizer();
});
process.once("SIGTERM", async () => {
  bot.stop("SIGTERM");
  closeDatabase();
  await stopSummarizer();
});
