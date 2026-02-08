# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm start` — run the bot (equivalent to `node --env-file=.env src/bot.ts`)
- `npm test` — run unit tests (`node --test src/**/*.test.ts`)
- `npm run typecheck` — type-check without emitting (`tsc --noEmit`)
- `npm run lint` — check lint + formatting (`biome check .`)
- `npm run format` — auto-fix lint + formatting (`biome check --write .`)

There is no build step. The bot runs directly via Node 24's native TypeScript support.

## Architecture

Modular bot split across three source files in `src/`:

- **`bot.ts`** — Telegraf-based bot entry point. Registers `/summarize` command and text message handler, manages lifecycle.
- **`storage.ts`** — SQLite message storage. Exports `initDatabase`, `closeDatabase`, `appendMessage`, `readMessages`.
- **`summarizer.ts`** — GitHub Copilot SDK integration. Exports `generateSummary`, `formatSummaryMessage`, and `stopSummarizer`.

### Flow

1. Telegraf handles long-polling and update routing automatically
2. Text messages are inserted into SQLite (`messages.db`), keyed by `(chat_id, message_id)`, with optional `thread_id` for forum topics
3. `/summarize [N]` command triggers summarization:
   - Optional count `N` limits to the most recent N messages
   - Message content is passed to Copilot SDK `session.sendAndWait()` for summarization
   - Bot posts bullet-point summary as a group reply
   - Messages persist in the database (not deleted)

### Tests

- `src/storage.test.ts` — Unit tests for storage module (SQLite insert, read, limit, thread isolation, deduplication)
- `src/summarizer.test.ts` — Unit tests for pure formatting functions

## Dependencies

- **Runtime**: `telegraf` (Telegram bot framework), `@github/copilot-sdk` (AI summarization)
- **Dev**: `@biomejs/biome` (lint/format), `husky` (git hooks), `lint-staged` (staged file linting), `@types/node`

## Precommit Hooks

Husky runs on every commit:
1. `tsc --noEmit` — full project type check
2. `lint-staged` — biome lint/format on staged `.ts` and `.json` files

## Constraints

- **Node 24 + native TS**: No transpilation. Run `.ts` files directly with `node`.
- **ESM only**: `"type": "module"` in package.json. Use `import`, not `require`.
- **Telegram API limitation**: Bots cannot retrieve past chat history. All messages must be captured live via polling.
- **Environment variables**: `TELEGRAM_BOT_TOKEN` must be set in `.env` (loaded via `--env-file`).
- **GitHub Copilot**: Requires GitHub Copilot CLI installed and authenticated (or BYOK provider config).
