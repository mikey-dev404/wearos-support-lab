/**
 * AIDL parser.
 *
 * Only the subset the wear module uses: one `interface X { ... }` block whose members are
 * `void name(args) = N;`, with occasional `//` label comments that introduce a group
 * (Configs, DataItems, Channels, …).
 */

/** @typedef {{name: string, transactionId: number|null, signature: string, group: string|null, line: number}} AidlMethod */

/**
 * @param {string} source
 * @param {string} [file]
 * @returns {{name: string, file: string, methods: AidlMethod[]}}
 */
export function parseAidl(source, file = "<aidl>") {
  const lines = source.split(/\r?\n/);
  const interfaceMatch = source.match(/interface\s+([A-Za-z0-9_]+)\s*\{/);

  /** @type {AidlMethod[]} */
  const methods = [];
  let label = null;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (trimmed.startsWith("//")) {
      const text = trimmed.replace(/^\/\/\s?/, "").trim();
      // A group label is a short noun phrase; prose ends with punctuation or is long.
      if (text.length > 0 && text.length <= 40 && !/[.:]$/.test(text)) label = text;
      continue;
    }

    const declaration = trimmed.match(
      /^(?:oneway\s+)?[A-Za-z0-9_.<>\[\]]+\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:=\s*(\d+))?\s*;/,
    );
    if (declaration) {
      methods.push({
        name: declaration[1],
        transactionId: declaration[3] ? Number(declaration[3]) : null,
        signature: `${declaration[1]}(${declaration[2].trim()})`,
        group: label ?? "Other",
        line: index + 1,
      });
      continue;
    }

    // A blank line ends a labelled block; unlabelled methods fall into "Other".
    if (trimmed.length === 0) {
      label = null;
      continue;
    }
    if (!/^(import|package)\b/.test(trimmed)) label = null;
  }

  return {
    name: interfaceMatch ? interfaceMatch[1] : file.replace(/\.aidl$/, ""),
    file,
    methods,
  };
}

/** Transaction ids must be unique and stable — a cheap integrity check. */
export function duplicateTransactionIds(methods) {
  const seen = new Map();
  const duplicates = [];
  for (const method of methods) {
    if (method.transactionId === null) continue;
    if (seen.has(method.transactionId)) {
      duplicates.push({ transactionId: method.transactionId, methods: [seen.get(method.transactionId), method.name] });
    } else {
      seen.set(method.transactionId, method.name);
    }
  }
  return duplicates;
}
