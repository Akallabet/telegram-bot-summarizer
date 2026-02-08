# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm start` — run the bot (equivalent to `node --env-file=.env bot.ts`)

There are no tests, linter, or build step. The bot runs directly via Node 24's native TypeScript support.

## Architecture

Single-file bot (`bot.ts`, ~125 lines) that stores Telegram group chat messages and summarizes them on demand using Claude.

### Flow

1. Long-polls Telegram via `getUpdates` with 30-second timeout
2. Text messages are appended to `messages-{chatId}.txt` (one file per group, bot's own messages excluded)
3. `/summarize` command triggers summarization:
   - Claude Agent SDK `query()` reads the messages file using the `Read` tool
   - Bot posts bullet-point summary as a group reply
   - Messages file is deleted (fresh start)

### Key functions in bot.ts

- `tg(method, params)` — generic Telegram Bot API HTTP wrapper
- `chatFile(chatId)` — resolves per-chat message storage path
- `handleMessage(msg, botId)` — appends timestamped message to file
- `handleSummarize(msg)` — orchestrates Claude summarization and cleanup
- `main()` — polling loop with offset tracking and error retry

## Constraints

- **Node 24 + native TS**: No transpilation. Run `.ts` files directly with `node`.
- **ESM only**: `"type": "module"` in package.json. Use `import`, not `require`.
- **Telegram API limitation**: Bots cannot retrieve past chat history. All messages must be captured live via polling.
- **Environment variables**: `TELEGRAM_BOT_TOKEN` and `ANTHROPIC_API_KEY` must be set in `.env` (loaded via `--env-file`).
- **Single dependency**: `@anthropic-ai/claude-agent-sdk` — no other runtime deps.
