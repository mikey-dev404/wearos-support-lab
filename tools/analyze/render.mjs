/** Markdown rendering for the gap report. */

const pct = (value) => `${(value * 100).toFixed(0)}%`;

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function renderMarkdown(report) {
  const { summary, groups, matrix, features, transport, moduleStats, serviceInterface, commit, generatedAt } = report;
  const lines = [];

  lines.push("# microG Wear OS gap report");
  lines.push("");
  lines.push(`Generated ${generatedAt} from \`microg/GmsCore\` at \`${commit ?? "unknown"}\`.`);
  lines.push("");
  lines.push(
    "This is a static read of the `play-services-wearable` module: which binder methods the",
    "service declares, which of them actually do something, which vendor features are advertised",
    "to client apps, and which transports exist in the tree. It cannot tell you whether pairing",
    "works on a real watch — only a device can.",
  );
  lines.push("");
  lines.push("## Headline");
  lines.push("");
  lines.push(`- \`IWearableService\` methods declared: **${serviceInterface.methodCount}**`);
  lines.push(`- Fully implemented: **${summary.implemented}** (${pct(summary.implemented / summary.total)})`);
  lines.push(`- Implemented but still logging \`unimplemented Method\`: **${summary.partial}**`);
  lines.push(`- Log-only stubs: **${summary.stubbed}** (${pct(summary.stubRatio)} of the surface is log-marked)`);
  lines.push(`- Missing entirely: **${summary.missing}**`);
  lines.push(`- Vendor features advertised in \`WearableService.FEATURES\`: **${features.declared}**, backed by code elsewhere in the module: **${features.backedCount}**`);
  lines.push(`- Java lines in the module: **${moduleStats.javaLines.toLocaleString("en-US")}** across ${moduleStats.javaFiles} files`);
  lines.push("");

  lines.push("## Coverage by API group");
  lines.push("");
  lines.push("| Group | Methods | Implemented | Partial | Stubs | Missing |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const group of groups) {
    lines.push(
      `| ${escapeCell(group.group)} | ${group.total} | ${group.implemented} | ${group.partial ?? 0} | ${group.stubbed} | ${group.missing} |`,
    );
  }
  lines.push("");

  const stubs = matrix.filter((entry) => entry.status === "stubbed");
  if (stubs.length > 0) {
    lines.push("## Log-only stubs");
    lines.push("");
    lines.push("Each method below exists on the binder, so clients can call it, but the body only logs");
    lines.push("`unimplemented Method` (and, in some cases, answers with a failure status).");
    lines.push("");
    lines.push("| # | Method | Group | Line | Evidence |");
    lines.push("| ---: | --- | --- | ---: | --- |");
    stubs.forEach((entry, index) => {
      lines.push(
        `| ${index + 1} | \`${entry.name}\` | ${escapeCell(entry.group)} | ${entry.implLine ?? "—"} | ${escapeCell(entry.evidence ?? "")} |`,
      );
    });
    lines.push("");
  }

  const partial = matrix.filter((entry) => entry.status === "partial");
  if (partial.length > 0) {
    lines.push("## Partial: works, but still logs `unimplemented Method`");
    lines.push("");
    lines.push(
      "These bodies do real work and remain flagged. Worth cleaning up in the same change that touches",
      "the surrounding code, because the log line is what makes readers — and this scanner — call them stubs.",
    );
    lines.push("");
    lines.push("| Method | Group | Line |");
    lines.push("| --- | --- | ---: |");
    for (const entry of partial) {
      lines.push(`| \`${entry.name}\` | ${escapeCell(entry.group)} | ${entry.implLine ?? "—"} |`);
    }
    lines.push("");
  }

  const implemented = matrix.filter((entry) => entry.status === "implemented");
  lines.push("## Implemented methods");
  lines.push("");
  lines.push(implemented.map((entry) => `\`${entry.name}\``).join(", "));
  lines.push("");

  lines.push("## Advertised features vs. code");
  lines.push("");
  lines.push(
    "`WearableService.FEATURES` is the capability list returned to clients at connection time.",
    "A feature that appears nowhere else in the module is advertised without an implementation path.",
  );
  lines.push("");
  lines.push("| Feature | Version | Referenced elsewhere | Files |");
  lines.push("| --- | ---: | --- | --- |");
  for (const feature of features.items) {
    lines.push(
      `| \`${feature.name}\` | ${feature.version} | ${feature.backed ? "yes" : "**no**"} | ${escapeCell(feature.referencedBy.slice(0, 3).join(", ") || "—")} |`,
    );
  }
  lines.push("");

  lines.push("## Transport inventory");
  lines.push("");
  lines.push(
    "Signal hits are lexical: they show what the tree mentions, not what works. The cloud-relay",
    "hits, for example, are mostly the `CloudSync*` API surface, whose service methods are stubs.",
  );
  lines.push("");
  lines.push("| Transport | Signal hits | Files |");
  lines.push("| --- | ---: | --- |");
  for (const entry of transport) {
    lines.push(`| ${entry.label} | ${entry.hits} | ${escapeCell(entry.files.slice(0, 4).join(", ") || "—")} |`);
  }
  lines.push("");

  lines.push("## Module shape");
  lines.push("");
  lines.push("| Area | Java lines |");
  lines.push("| --- | ---: |");
  for (const [area, lineCount] of Object.entries(report.locByArea).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${area}\` | ${lineCount.toLocaleString("en-US")} |`);
  }
  lines.push("");
  lines.push(`Public API classes shipped in the module: ${moduleStats.publicApiClasses}.`);
  lines.push("");

  lines.push("## Reproduce");
  lines.push("");
  lines.push("```bash");
  lines.push("git clone --filter=blob:none --sparse https://github.com/microg/GmsCore.git");
  lines.push("cd GmsCore && git sparse-checkout set play-services-wearable");
  lines.push("node tools/analyze/index.mjs --repo /path/to/GmsCore --out reports");
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
}
