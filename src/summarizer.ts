import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();

export async function stopSummarizer(): Promise<void> {
  try {
    await client.stop();
    console.log("Summarizer stopped successfully.");
  } catch (error: any) {
    console.error("Error stopping summarizer:", error.message);
  }
}

export async function generateSummary(filePath: string): Promise<string> {
  let summary = "";
  const prompt = `You are an expert reader and writer. Read the file ${filePath}, which contains chat messages from telegram. Group the messages into themes, for each theme write a concise bullet point summary. If there are only a handful of messages, just summarize them without grouping. Only output the bullet points, nothing else.`;
  try {
    await client.start();
    const session = await client.createSession({ model: "gpt-5-mini" });

    const response = await session.sendAndWait({ prompt });
    console.log(response?.data.content);
    summary = response?.data.content || "";

    await session.destroy();
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    await stopSummarizer();
  }
  return summary;
}

export function formatSummaryMessage(
  lineCount: number,
  summary: string,
  threadId?: number,
): string {
  let header = `Summary of ${lineCount} messages`;
  if (threadId) {
    header = `📋 Topic #${threadId}\n\nSummary of ${lineCount} messages`;
  }
  return `${header}:\n\n${summary}`;
}
