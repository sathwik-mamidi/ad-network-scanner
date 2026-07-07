import assert from "node:assert/strict";
import test from "node:test";

import { mapConcurrent } from "../dist/concurrency.js";

test("mapConcurrent preserves input order and limits active work", async () => {
  let active = 0;
  let maxActive = 0;

  const results = await mapConcurrent([30, 10, 20, 5], 2, async (item) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, item));
    active -= 1;
    return item / 5;
  });

  assert.deepEqual(results, [6, 2, 4, 1]);
  assert.equal(maxActive, 2);
});

test("mapConcurrent rejects invalid concurrency", async () => {
  await assert.rejects(() => mapConcurrent([1], 0, async (item) => item), /positive integer/);
});
