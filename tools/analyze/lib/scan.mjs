/**
 * Scan a GmsCore checkout's `play-services-wearable` module and produce a gap report.
 *
 * The report answers three questions an implementer needs before touching code:
 *   1. Which Wearable API calls does the module claim to serve, and which are log-only stubs?
 *   2. Which vendor features does the service advertise to clients, and are they backed by code?
 *   3. Which transport does the module actually speak, and which transports are absent?
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { duplicateTransactionIds, parseAidl } from "./aidl.mjs";
import { classifyBody, extractFeatures, findMethods, maskSource, stubEvidence } from "./java.mjs";

const MODULE = "play-services-wearable";
const SERVICE_AIDL = `${MODULE}/src/main/aidl/com/google/android/gms/wearable/internal/IWearableService.aidl`;
const SERVICE_IMPL = `${MODULE}/core/src/main/java/org/microg/gms/wearable/WearableServiceImpl.java`;
const SERVICE_DECL = `${MODULE}/core/src/main/java/org/microg/gms/wearable/WearableService.java`;

const TRANSPORT_SIGNALS = [
  { key: "legacy-wear-proto", label: "Legacy Wear 1.x wire protocol (org.microg.wearable.proto)", pattern: /org\.microg\.wearable\.proto|RootMessage|ServerMessageListener/ },
  { key: "bluetooth-classic", label: "Bluetooth Classic / RFCOMM", pattern: /BluetoothSocket|RfcommSocket|BluetoothAdapter\.getDefaultAdapter|listenUsingRfcomm/ },
  { key: "bluetooth-le", label: "Bluetooth LE GATT (client or server)", pattern: /BluetoothGatt|BluetoothLeScanner|BluetoothGattServer|GattCallback|ScanCallback/ },
  { key: "nearby-connections", label: "Nearby Connections", pattern: /ConnectionsClient|Nearby\.getConnectionsClient|com\.google\.android\.gms\.nearby/ },
  { key: "cloud-relay", label: "Google cloud relay / GCM push for wearable", pattern: /CloudSync|cloudSync|CloudNode|wearable\.cloud|GcmListener|FirebaseMessaging/ },
  { key: "wifi-sync", label: "Wi-Fi sync", pattern: /WifiConfiguration|WifiManager|syncWifiCredentials/ },
  { key: "ancs", label: "Apple Notification Center Service bridge", pattern: /Ancs|ANCS|injectAncs/ },
];

function readIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function countLines(source) {
  return source.split(/\r?\n/).length;
}

function relative(repo, file) {
  return path.relative(repo, file).split(path.sep).join("/");
}

function gitCommit(repo) {
  try {
    return execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function scanRepository(repoRoot) {
  const repo = path.resolve(repoRoot);
  const moduleDir = path.join(repo, MODULE);
  if (!fs.existsSync(moduleDir)) {
    throw new Error(`${moduleDir} does not exist — this scanner expects a GmsCore checkout`);
  }

  const aidlFiles = walk(moduleDir, (file) => file.endsWith(".aidl")).sort();
  const javaFiles = walk(moduleDir, (file) => file.endsWith(".java")).sort();

  // --- AIDL surface -----------------------------------------------------------------------
  const interfaces = [];
  for (const file of aidlFiles) {
    const source = readIfExists(file) ?? "";
    const parsed = parseAidl(source, relative(repo, file));
    if (parsed.methods.length > 0) interfaces.push(parsed);
  }
  const serviceAidlPath = path.join(repo, SERVICE_AIDL);
  const serviceAidl = interfaces.find((entry) => entry.file === relative(repo, serviceAidlPath));
  if (!serviceAidl) throw new Error(`Could not parse ${SERVICE_AIDL}`);

  // --- Implementation ---------------------------------------------------------------------
  const implSource = readIfExists(path.join(repo, SERVICE_IMPL));
  if (!implSource) throw new Error(`Could not read ${SERVICE_IMPL}`);
  const implMethods = findMethods(implSource);
  const implByName = new Map();
  for (const method of implMethods) {
    // Overloads are rare here; keep the last (most specific) declaration.
    implByName.set(method.name, method);
  }

  const matrix = serviceAidl.methods.map((method) => {
    const implementation = implByName.get(method.name);
    const status = implementation ? classifyBody(implementation.body) : "missing";
    return {
      name: method.name,
      transactionId: method.transactionId,
      group: method.group ?? "Ungrouped",
      signature: method.signature,
      status: status === "empty" ? "missing" : status,
      evidence: implementation && status === "stubbed" ? stubEvidence(implementation.body) : null,
      implLine: implementation ? implementation.line : null,
    };
  });

  const byStatus = matrix.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] ?? 0) + 1;
    return acc;
  }, {});

  const logMarked = (byStatus.stubbed ?? 0) + (byStatus.partial ?? 0);

  const groups = [...new Set(matrix.map((entry) => entry.group))].map((group) => {
    const members = matrix.filter((entry) => entry.group === group);
    return {
      group,
      total: members.length,
      implemented: members.filter((entry) => entry.status === "implemented").length,
      partial: members.filter((entry) => entry.status === "partial").length,
      stubbed: members.filter((entry) => entry.status === "stubbed").length,
      missing: members.filter((entry) => entry.status === "missing").length,
    };
  });

  // --- Advertised features ----------------------------------------------------------------
  const declSource = readIfExists(path.join(repo, SERVICE_DECL)) ?? "";
  const features = extractFeatures(declSource);
  const otherSources = new Map();
  for (const file of javaFiles) {
    if (path.basename(file) === path.basename(SERVICE_DECL)) continue;
    const source = readIfExists(file);
    if (source) otherSources.set(relative(repo, file), maskSource(source, { keepStrings: true }));
  }
  const featureCoverage = features.map((feature) => {
    const references = [...otherSources.entries()]
      .filter(([, source]) => source.includes(`"${feature.name}"`))
      .map(([file]) => file);
    return {
      ...feature,
      referencedBy: references,
      backed: references.length > 0,
    };
  });

  // --- Transport inventory ----------------------------------------------------------------
  const transport = TRANSPORT_SIGNALS.map((signal) => {
    const files = [];
    let hits = 0;
    for (const [file, source] of otherSources.entries()) {
      const matches = source.match(new RegExp(signal.pattern.source, "g"));
      if (matches) {
        hits += matches.length;
        files.push(file);
      }
    }
    const declHits = declSource.match(new RegExp(signal.pattern.source, "g"));
    if (declHits) hits += declHits.length;
    return { key: signal.key, label: signal.label, hits, files: files.slice(0, 12) };
  });

  // --- Module shape -----------------------------------------------------------------------
  const locByArea = {};
  for (const file of javaFiles) {
    const area = relative(repo, file).split("/").slice(0, 5).join("/");
    locByArea[area] = (locByArea[area] ?? 0) + countLines(readIfExists(file) ?? "");
  }
  const publicApiClasses = javaFiles
    .filter((file) => relative(repo, file).includes("/src/main/java/com/google/android/gms/wearable/"))
    .map((file) => path.basename(file, ".java"))
    .sort();

  return {
    generatedAt: new Date().toISOString(),
    repo: path.basename(repo),
    commit: gitCommit(repo),
    module: MODULE,
    moduleStats: {
      javaFiles: javaFiles.length,
      aidlFiles: aidlFiles.length,
      javaLines: javaFiles.reduce((sum, file) => sum + countLines(readIfExists(file) ?? ""), 0),
      publicApiClasses: publicApiClasses.length,
      publicApiClassNames: publicApiClasses,
    },
    serviceInterface: {
      file: serviceAidl.file,
      methodCount: serviceAidl.methods.length,
      duplicateTransactionIds: duplicateTransactionIds(serviceAidl.methods),
    },
    summary: {
      total: matrix.length,
      implemented: byStatus.implemented ?? 0,
      partial: byStatus.partial ?? 0,
      stubbed: byStatus.stubbed ?? 0,
      missing: byStatus.missing ?? 0,
      logMarked,
      stubRatio: matrix.length === 0 ? 0 : logMarked / matrix.length,
    },
    groups,
    matrix,
    features: {
      declared: features.length,
      backedCount: featureCoverage.filter((feature) => feature.backed).length,
      items: featureCoverage,
    },
    transport,
    locByArea,
  };
}
