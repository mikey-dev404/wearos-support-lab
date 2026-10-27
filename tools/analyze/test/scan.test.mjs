import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { scanRepository } from "../lib/scan.mjs";
import { renderMarkdown } from "../render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "..", "__fixtures__", "gmscore-min");

test("classifies the fixture's API surface", () => {
  const report = scanRepository(FIXTURE);
  const statuses = Object.fromEntries(report.matrix.map((entry) => [entry.name, entry.status]));

  assert.equal(report.serviceInterface.methodCount, 8);
  assert.equal(statuses.putConfig, "implemented");
  assert.equal(statuses.getConfigs, "implemented");
  assert.equal(statuses.putData, "implemented", "brace inside a string must not break parsing");
  assert.equal(statuses.getDataItem, "stubbed");
  assert.equal(statuses.getConnectedCapability, "stubbed");
  assert.equal(statuses.addListener, "stubbed");
  assert.equal(statuses.openChannel, "stubbed");
  assert.equal(statuses.addLocalCapability, "partial", "logs 'unimplemented' but delegates");

  assert.equal(report.summary.total, 8);
  assert.equal(report.summary.implemented, 3);
  assert.equal(report.summary.partial, 1);
  assert.equal(report.summary.stubbed, 4);
  assert.equal(report.summary.missing, 0);
});

test("attributes groups without leaking labels across blank lines", () => {
  const report = scanRepository(FIXTURE);
  const groups = Object.fromEntries(report.groups.map((group) => [group.group, group]));
  assert.equal(groups.Configs.total, 2);
  assert.equal(groups.DataItems.total, 2);
  assert.equal(groups.Capabilities.total, 2);
  assert.equal(groups.Capabilities.partial, 1);
  assert.equal(groups.Other.total, 1);
  assert.equal(groups.Channels.total, 1);
});

test("reports advertised features that no other file references", () => {
  const report = scanRepository(FIXTURE);
  assert.equal(report.features.declared, 3);
  assert.equal(report.features.backedCount, 1);
  const byName = Object.fromEntries(report.features.items.map((feature) => [feature.name, feature]));
  assert.equal(byName.wearable_services.backed, true);
  assert.match(byName.wearable_services.referencedBy[0], /FeatureConsumer\.java$/);
  assert.equal(byName.app_client.backed, false);
});

test("renders a markdown report with the headline numbers", () => {
  const report = scanRepository(FIXTURE);
  const markdown = renderMarkdown(report);
  assert.match(markdown, /^# microG Wear OS gap report/);
  assert.match(markdown, /`IWearableService` methods declared: \*\*8\*\*/);
  assert.match(markdown, /Log-only stubs: \*\*4\*\*/);
  assert.match(markdown, /Partial: works, but still logs/);
  assert.match(markdown, /## Log-only stubs/);
  assert.match(markdown, /openChannel/);
});

test("renders without stubs", () => {
  const report = scanRepository(FIXTURE);
  report.matrix = report.matrix.map((entry) => ({ ...entry, status: "implemented", evidence: null }));
  report.summary = { total: report.matrix.length, implemented: report.matrix.length, stubbed: 0, missing: 0, stubRatio: 0 };
  const markdown = renderMarkdown(report);
  assert.doesNotMatch(markdown, /## Log-only stubs/);
});

test("rejects a path that is not a GmsCore checkout", () => {
  assert.throws(() => scanRepository(path.join(here, "..")), /play-services-wearable/);
});
