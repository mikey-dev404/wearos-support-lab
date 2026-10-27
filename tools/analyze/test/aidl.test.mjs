import assert from "node:assert/strict";
import { test } from "node:test";
import { duplicateTransactionIds, parseAidl } from "../lib/aidl.mjs";

const SOURCE = `
package com.google.android.gms.wearable.internal;

interface IWearableService {
    // Configs
    void putConfig(IWearableCallbacks callbacks, in ConnectionConfiguration config) = 19;
    void getConfigs(IWearableCallbacks callbacks) = 21;

    void addListener(IWearableCallbacks callbacks, in AddListenerRequest request) = 15;

    // Channels
    void openChannel(IWearableCallbacks callbacks, String s1, String s2) = 30;
}
`;

test("parses every method with its transaction id", () => {
  const parsed = parseAidl(SOURCE, "IWearableService.aidl");
  assert.equal(parsed.name, "IWearableService");
  assert.equal(parsed.methods.length, 4);
  assert.deepEqual(
    parsed.methods.map((method) => [method.name, method.transactionId]),
    [
      ["putConfig", 19],
      ["getConfigs", 21],
      ["addListener", 15],
      ["openChannel", 30],
    ],
  );
});

test("keeps signatures readable", () => {
  const parsed = parseAidl(SOURCE);
  assert.match(parsed.methods[0].signature, /^putConfig\(/);
  assert.match(parsed.methods[3].signature, /String s1, String s2/);
});

test("labels only the block directly under a comment", () => {
  const parsed = parseAidl(SOURCE);
  const byName = Object.fromEntries(parsed.methods.map((method) => [method.name, method.group]));
  assert.equal(byName.putConfig, "Configs");
  assert.equal(byName.getConfigs, "Configs");
  // Blank line resets the label, so this method is not mis-attributed to Configs.
  assert.equal(byName.addListener, "Other");
  assert.equal(byName.openChannel, "Channels");
});

test("detects duplicate transaction ids", () => {
  const parsed = parseAidl(`
    interface Broken {
        void a() = 7;
        void b() = 7;
    }
  `);
  const duplicates = duplicateTransactionIds(parsed.methods);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].transactionId, 7);
});

test("ignores prose comments as group labels", () => {
  const parsed = parseAidl(`
    interface X {
        // This comment is a sentence that should not become a group label.
        void a() = 1;
    }
  `);
  assert.equal(parsed.methods[0].group, "Other");
});
