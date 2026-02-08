import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatSummaryMessage } from "./summarizer.ts";

describe("formatSummaryMessage", () => {
  test("formats message without threadId", () => {
    const result = formatSummaryMessage(5, "- point 1\n- point 2");
    assert.equal(result, "Summary of 5 messages:\n\n- point 1\n- point 2");
  });

  test("formats message with threadId", () => {
    const result = formatSummaryMessage(3, "- point 1", 42);
    assert.equal(result, "📋 Topic #42\n\nSummary of 3 messages:\n\n- point 1");
  });

  test("handles single message", () => {
    const result = formatSummaryMessage(1, "- only point");
    assert.ok(result.includes("Summary of 1 messages"));
  });
});
