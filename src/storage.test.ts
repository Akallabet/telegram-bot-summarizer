import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  appendMessage,
  deleteMessages,
  getChatFilePath,
  readMessages,
} from "./storage.ts";

describe("getChatFilePath", () => {
  test("returns path for regular chat", () => {
    const path = getChatFilePath(-100123);
    assert.ok(path.endsWith("messages--100123.txt"));
  });

  test("returns path with threadId for forum topics", () => {
    const path = getChatFilePath(-100123, 42);
    assert.ok(path.endsWith("messages--100123-42.txt"));
  });

  test("returns path without threadId when threadId is undefined", () => {
    const path = getChatFilePath(-100123, undefined);
    assert.ok(path.endsWith("messages--100123.txt"));
    assert.ok(!path.includes("undefined"));
  });
});

describe("appendMessage", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  test("appends formatted message to file", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "storage-test-"));
    const chatId = -999;
    const filePath = getChatFilePath(chatId);

    await appendMessage({
      chatId,
      username: "testuser",
      text: "Hello world",
      timestamp: 1700000000,
    });

    const content = await readFile(filePath, "utf-8");
    assert.ok(content.includes("testuser: Hello world"));
    assert.ok(content.includes("[2023-11-14T"));
    assert.ok(content.endsWith("\n"));

    // cleanup
    const { unlink } = await import("node:fs/promises");
    await unlink(filePath);
  });
});

describe("readMessages", () => {
  test("returns null for non-existent file", async () => {
    const result = await readMessages(-777777);
    assert.equal(result, null);
  });

  test("reads messages and returns content with line count", async () => {
    const chatId = -888;
    const filePath = getChatFilePath(chatId);

    await writeFile(filePath, "line1\nline2\nline3\n");

    const result = await readMessages(chatId);
    assert.ok(result !== null);
    assert.equal(result.lineCount, 3);
    assert.equal(result.filePath, filePath);
    assert.ok(result.content.includes("line1"));

    const { unlink } = await import("node:fs/promises");
    await unlink(filePath);
  });

  test("returns null for empty file", async () => {
    const chatId = -889;
    const filePath = getChatFilePath(chatId);

    await writeFile(filePath, "");

    const result = await readMessages(chatId);
    assert.equal(result, null);

    const { unlink } = await import("node:fs/promises");
    await unlink(filePath);
  });
});

describe("deleteMessages", () => {
  test("deletes existing file", async () => {
    const chatId = -890;
    const filePath = getChatFilePath(chatId);

    await writeFile(filePath, "test data");
    await deleteMessages(chatId);

    const { access } = await import("node:fs/promises");
    await assert.rejects(() => access(filePath));
  });

  test("does not throw for non-existent file", async () => {
    await assert.doesNotReject(() => deleteMessages(-999999));
  });
});
