import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  appendMessage,
  closeDatabase,
  initDatabase,
  readMessages,
} from "./storage.ts";

describe("storage", () => {
  beforeEach(() => {
    initDatabase(":memory:");
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("appendMessage", () => {
    test("inserts a message that can be read back", () => {
      appendMessage({
        chatId: -100,
        messageId: 1,
        userId: 42,
        username: "alice",
        text: "Hello world",
        timestamp: 1700000000,
      });

      const result = readMessages(-100);
      assert.ok(result !== null);
      assert.equal(result.messageCount, 1);
      assert.ok(result.content.includes("alice: Hello world"));
      assert.ok(result.content.includes("[2023-11-14T"));
    });

    test("INSERT OR IGNORE deduplicates same chat_id + message_id", () => {
      const msg = {
        chatId: -100,
        messageId: 1,
        userId: 42,
        username: "alice",
        text: "first",
        timestamp: 1700000000,
      };

      appendMessage(msg);
      appendMessage({ ...msg, text: "duplicate" });

      const result = readMessages(-100);
      assert.ok(result !== null);
      assert.equal(result.messageCount, 1);
      assert.ok(result.content.includes("first"));
      assert.ok(!result.content.includes("duplicate"));
    });
  });

  describe("readMessages", () => {
    test("returns null for empty chat", () => {
      const result = readMessages(-999);
      assert.equal(result, null);
    });

    test("returns messages with correct count", () => {
      for (let i = 1; i <= 5; i++) {
        appendMessage({
          chatId: -100,
          messageId: i,
          userId: 42,
          username: "alice",
          text: `msg ${i}`,
          timestamp: 1700000000 + i,
        });
      }

      const result = readMessages(-100);
      assert.ok(result !== null);
      assert.equal(result.messageCount, 5);
    });

    test("respects limit parameter", () => {
      for (let i = 1; i <= 10; i++) {
        appendMessage({
          chatId: -100,
          messageId: i,
          userId: 42,
          username: "alice",
          text: `msg ${i}`,
          timestamp: 1700000000 + i,
        });
      }

      const result = readMessages(-100, undefined, 3);
      assert.ok(result !== null);
      assert.equal(result.messageCount, 3);
    });

    test("limit returns the most recent messages", () => {
      for (let i = 1; i <= 5; i++) {
        appendMessage({
          chatId: -100,
          messageId: i,
          userId: 42,
          username: "alice",
          text: `msg ${i}`,
          timestamp: 1700000000 + i,
        });
      }

      const result = readMessages(-100, undefined, 2);
      assert.ok(result !== null);
      assert.ok(result.content.includes("msg 4"));
      assert.ok(result.content.includes("msg 5"));
      assert.ok(!result.content.includes("msg 3"));
    });

    test("isolates messages by thread", () => {
      appendMessage({
        chatId: -100,
        messageId: 1,
        threadId: 10,
        userId: 42,
        username: "alice",
        text: "thread 10 msg",
        timestamp: 1700000000,
      });
      appendMessage({
        chatId: -100,
        messageId: 2,
        threadId: 20,
        userId: 42,
        username: "alice",
        text: "thread 20 msg",
        timestamp: 1700000001,
      });
      appendMessage({
        chatId: -100,
        messageId: 3,
        userId: 42,
        username: "alice",
        text: "no thread msg",
        timestamp: 1700000002,
      });

      const t10 = readMessages(-100, 10);
      assert.ok(t10 !== null);
      assert.equal(t10.messageCount, 1);
      assert.ok(t10.content.includes("thread 10 msg"));

      const t20 = readMessages(-100, 20);
      assert.ok(t20 !== null);
      assert.equal(t20.messageCount, 1);
      assert.ok(t20.content.includes("thread 20 msg"));

      const noThread = readMessages(-100);
      assert.ok(noThread !== null);
      assert.equal(noThread.messageCount, 1);
      assert.ok(noThread.content.includes("no thread msg"));
    });

    test("orders messages by timestamp (oldest first in output)", () => {
      appendMessage({
        chatId: -100,
        messageId: 1,
        userId: 42,
        username: "alice",
        text: "first",
        timestamp: 1700000001,
      });
      appendMessage({
        chatId: -100,
        messageId: 2,
        userId: 42,
        username: "alice",
        text: "second",
        timestamp: 1700000002,
      });
      appendMessage({
        chatId: -100,
        messageId: 3,
        userId: 42,
        username: "alice",
        text: "third",
        timestamp: 1700000003,
      });

      const result = readMessages(-100);
      assert.ok(result !== null);
      const firstIdx = result.content.indexOf("first");
      const secondIdx = result.content.indexOf("second");
      const thirdIdx = result.content.indexOf("third");
      assert.ok(firstIdx < secondIdx);
      assert.ok(secondIdx < thirdIdx);
    });
  });
});
