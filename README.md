# Telegram Group Chat Summarizer Bot

A simple Telegram bot that records group chat messages and generates AI-powered summaries on demand using Claude.

## Features

- Records all text messages in Telegram group chats
- Generates concise bullet-point summaries using Claude AI
- Automatic message history cleanup after summarization
- Lightweight single-file implementation

## Prerequisites

- Node.js 24 or later
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Anthropic API Key (from [Anthropic Console](https://console.anthropic.com/))

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Usage

Start the bot:

```bash
npm start
```

### Commands

- **`/summarize`** - Generate a summary of all recorded messages in the current chat

The bot automatically records all text messages sent to groups where it's a member.

## How It Works

1. The bot connects to Telegram using long polling
2. Text messages are stored in `messages-{chatId}.txt` files (one per group)
3. When `/summarize` is triggered:
   - Claude reads the message history
   - Generates a concise bullet-point summary
   - Posts the summary to the group
   - Clears the message history for a fresh start

## Development

- **Lint/Format**: `npm run lint` or `npm run format`
- Built with Node.js native TypeScript support (no build step required)
- Uses [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript) for AI interactions

## License

ISC
