#!/usr/bin/env node
/**
 * Gap report CLI.
 *
 *   node tools/analyze/index.mjs --repo ../GmsCore --out reports
 *   node tools/analyze/index.mjs --repo ../GmsCore --json-only
 */

import fs from "node:fs";
import path from "node:path";
import { scanRepository } from "./lib/scan.mjs";
import { renderMarkdown } from "./render.mjs";

function parseArgs(argv) {
  const args = { repo: process.env.GMSCORE_REPO ?? ".", out: "reports", jsonOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") args.repo = argv[++index];
    else if (arg === "--out") args.out = argv[++index];
    else if (arg === "--json-only") args.jsonOnly = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node tools/analyze/index.mjs [--repo <GmsCore checkout>] [--out <dir>] [--json-only]");
      process.exit(0);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

let report;
try {
  report = scanRepository(args.repo);
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}

if (args.out) fs.mkdirSync(args.out, { recursive: true });

const json = `${JSON.stringify(report, null, 2)}\n`;
const markdown = renderMarkdown(report);

if (args.jsonOnly) {
  process.stdout.write(json);
} else {
  const jsonPath = path.join(args.out, "gap-report.json");
  const mdPath = path.join(args.out, "gap-report.md");
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(mdPath, markdown);
  console.log(`wrote ${jsonPath}`);
  console.log(`wrote ${mdPath}`);
  const { summary, features } = report;
  console.log(
    `\n${summary.implemented}/${summary.total} implemented · ${summary.partial} partial (stale log) · ${summary.stubbed} log-only stubs · ${summary.missing} missing · ${features.backedCount}/${features.declared} advertised features backed by code`,
  );
}
