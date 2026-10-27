/**
 * Minimal Java source reader: method bodies with brace matching, stub markers, and a few
 * declaration-level shapes (the service feature list). Not a Java parser — deliberately small
 * enough to audit in one sitting, strict enough that a mis-parse fails the tests.
 */

/**
 * Replace comments (and, optionally, string/char literal contents) with spaces while preserving
 * offsets and newlines. Structure scanning masks strings; evidence scanning keeps them.
 */
export function maskSource(source, { keepStrings = false, keepComments = false } = {}) {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const two = source.slice(index, index + 2);
    if (keepComments) {
      out += source[index];
      index += 1;
    } else if (two === "//") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - index);
      index = stop;
    } else if (two === "/*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
    } else if (!keepStrings && (source[index] === '"' || source[index] === "'")) {
      const quote = source[index];
      let stop = index + 1;
      while (stop < source.length && source[stop] !== quote) {
        if (source[stop] === "\\") stop += 1;
        stop += 1;
      }
      out += source.slice(index, stop + 1).replace(/[^\n]/g, " ");
      index = stop + 1;
    } else {
      out += source[index];
      index += 1;
    }
  }
  return out;
}

/** Backwards-compatible alias used by older callers/tests. */
export const stripComments = (source) => maskSource(source);

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === "\n") line += 1;
  }
  return line;
}

/** Given the index of an opening brace, return the index just past its matching close. */
export function matchBrace(source, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

const METHOD_PATTERN =
  /(?:^|[\s;{}])((?:public|protected|private|static|final|synchronized|abstract|native)\s+)*([A-Za-z_][\w.$]*)\s+([A-Za-z_]\w*)\s*\(([^;{]*?)\)\s*(?:throws\s+[\w.,\s]+)?\{/g;

/**
 * @param {string} source
 * @returns {Array<{name: string, returnType: string, signature: string, body: string, line: number}>}
 */
export function findMethods(source) {
  const structural = maskSource(source); // strings blanked: braces inside literals cannot confuse us
  // Comments and literals both carry evidence ("unimplemented Method", "TODO: implement"), so
  // keep them for classification while structure is read from the masked copy.
  const evidential = maskSource(source, { keepStrings: true, keepComments: true });
  /** @type {Array<{name: string, returnType: string, signature: string, body: string, line: number}>} */
  const methods = [];
  METHOD_PATTERN.lastIndex = 0;
  let match;
  while ((match = METHOD_PATTERN.exec(structural)) !== null) {
    const returnType = match[2];
    const name = match[3];
    const params = match[4].trim();
    const bodyStart = structural.indexOf("{", match.index + match[0].length - 1);
    const bodyEnd = matchBrace(structural, bodyStart);
    if (bodyStart === -1 || bodyEnd === -1) continue;
    methods.push({
      name,
      returnType,
      signature: `${name}(${params})`,
      body: evidential.slice(bodyStart + 1, bodyEnd - 1),
      line: lineAt(structural, match.index),
    });
    METHOD_PATTERN.lastIndex = bodyEnd;
  }
  return methods;
}

const STUB_MARKERS = [
  /unimplemented Method/i,
  /UnsupportedOperationException/,
  /not implemented/i,
  /TODO:\s*implement/i,
];

export function stubEvidence(body) {
  for (const marker of STUB_MARKERS) {
    const match = body.match(marker);
    if (match) {
      const start = Math.max(0, (match.index ?? 0) - 40);
      return body.slice(start, (match.index ?? 0) + match[0].length + 80).replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

/**
 * Classify a method body.
 *
 * `partial` matters: `getConnectedCapability` logs "unimplemented Method" and then actually
 * resolves the capability through CapabilityManager. Treating it as a pure stub would be wrong,
 * and treating it as clean would hide a stale log that sends readers down the wrong path.
 *
 * @returns {"implemented"|"partial"|"stubbed"|"empty"}
 */
export function classifyBody(body) {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "empty";
  if (!stubEvidence(body)) {
    return /^\{?\s*(return\s+null\s*;?)?\s*\}?$/.test(trimmed) ? "empty" : "implemented";
  }
  // Remove log statements, then look for real delegation to another component.
  const withoutLogging = body.replace(/\bLog\.[a-z]+\([^;]*\)\s*;/g, "");
  const delegates = /\b(capabilities|wearable|connection|manager|storage|service)\s*\.\s*\w+\s*\(/.test(
    withoutLogging,
  );
  return delegates ? "partial" : "stubbed";
}

/**
 * Extract `new Feature("name", version)` entries from a `Feature[]` declaration.
 * @returns {Array<{name: string, version: number}>}
 */
export function extractFeatures(source) {
  const evidential = maskSource(source, { keepStrings: true });
  const arrayMatch = evidential.match(/Feature\[\]\s*[A-Za-z_]\w*\s*=\s*(?:new\s+Feature\[\]\s*)?\{([\s\S]*?)\n\s*\};/);
  const block = arrayMatch ? arrayMatch[1] : evidential;
  const features = [];
  const pattern = /new\s+Feature\s*\(\s*"([^"]+)"\s*,\s*(\d+)L?\s*\)/g;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    features.push({ name: match[1], version: Number(match[2]) });
  }
  return features;
}
