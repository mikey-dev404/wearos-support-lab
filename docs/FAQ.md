# FAQ

Questions this repository tends to raise, answered once so the docs don't have to repeat them.

## Is this a submission for the bounty?

No. There is no pull request against `microg/GmsCore` from this work, and nothing here claims the
$2,340. The bounty pays on a merged PR, and a merged PR needs a working pairing demonstrated on
hardware. This repository produces the analysis that precedes that work, not the work itself.

## Then why does it exist?

Because the interesting question is not "can someone write the code" — eleven people tried — but
*where the gap actually is*. The scanner answers that with evidence instead of impressions, and the
documents turn the answer into a plan someone can execute on a desk with a watch on it.

## What exactly does the scanner measure?

- **Declared surface**: every method on `IWearableService` in the AIDL, with its transaction id.
- **Implementation state**: for each of those, the body in `WearableServiceImpl`, classified as
  `implemented`, `partial` (real work but still logs `unimplemented Method`), `stubbed` (logs only,
  or throws `UnsupportedOperationException` / carries `TODO: implement`), or `missing`.
- **Advertised features**: the strings in `WearableService.FEATURES`, and whether any other file in
  the module references them.
- **Transport**: lexical signals for the legacy proto, Bluetooth Classic, BLE GATT, Nearby,
  cloud-relay and ANCS code paths.

It does not execute anything, and it cannot tell whether a route works on a device.

## Why is a method that works reported as a stub?

It shouldn't be. That is what the `partial` classification is for: a body that logs
`unimplemented Method` and then resolves through `CapabilityManager` is real work behind a stale
log line. If your checkout reports a working method as `stubbed`, the fingerprint it looks for is
missing — open an issue with the method name and the log line.

## How do I reproduce the published numbers?

```bash
git clone --filter=blob:none --sparse https://github.com/microg/GmsCore.git /tmp/GmsCore
git -C /tmp/GmsCore sparse-checkout set play-services-wearable
node tools/analyze/index.mjs --repo /tmp/GmsCore --out reports
```

The committed report names the commit it was generated from. CI regenerates it against `master` on
every push and uploads the result, so drift upstream shows up as a diff in the artifact.

## The numbers changed. Did something break?

Check the commit hash in the report header first. Upstream edits land regularly; a different hash
with different counts is expected. The parser itself is pinned by tests, so a change in the
*classification* of an unchanged file is a bug worth reporting.

## Where should a first pull request go?

Not at `IWearableService`. The module cannot observe a modern watch, so any API work there is
unverifiable. The useful first step is a capture: `btsnoop` plus `logcat` from a pairing that works
without Google services. See [`PAIRING-PATHS.md`](PAIRING-PATHS.md) and
[`TEST-MATRIX.md`](TEST-MATRIX.md).

Contributions to *this* repository are welcome and do not need hardware: parser coverage, additional
signal detectors, or a smaller, clearer report.

## Is any of this AI-generated?

The analysis was produced with AI assistance and reviewed line by line. Every number in the report
is reproducible with the command above, which is the part that matters.
