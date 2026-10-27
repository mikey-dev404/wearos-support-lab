# Wear OS support for microG — field notes + gap analyzer

A scoping repository for [`microg/GmsCore#2843`](https://github.com/microg/GmsCore/issues/2843)
("WearOS Support", the [$2,340 BountyHub bounty](https://www.bountyhub.dev/en/bounty/view/27a47575-ef9f-49d3-9685-c056d6825f9d/bounty-wearos-support)).

It contains **no pull request and no bounty claim**. It exists because the interesting question is
not "can someone write the code" — eleven people already tried — but *where exactly the work is*,
and what evidence a patch needs before a maintainer will look at it. That is what this repo
answers, with a small analyzer that reads the module and reports the gap instead of guessing at it.

## What the analyzer found

Pointed at `microg/GmsCore` `master` (`342c280`, 2026-10-07), the `play-services-wearable` module:

| Measure | Value |
| --- | ---: |
| Methods declared on `IWearableService` | 48 |
| Fully implemented | 23 (48%) |
| Works, but still logs `unimplemented Method` | 3 |
| Log-only stubs | 22 (46%) |
| Methods missing entirely | 0 |
| Vendor features advertised in `WearableService.FEATURES` | 33 |
| …of which any other file in the module references | **0** |

The stubs are not spread evenly — they are the features Wear OS users notice first:

- **Channels: 0 of 7.** `ChannelApi` is unusable.
- **Capabilities: 1 of 4 functional.** `getAllCapabilities` returns an empty list; the other three
  resolve through `CapabilityManager` but still log `unimplemented Method`, which misleads readers
  and tools alike.
- **Notification bridge (ANCS): 0 of 3.**
- **Cloud sync settings: 2 of 5.**
- Telephony controls (`endCall`, `acceptRingingCall`, `silenceRinger`): 0 of 3.
- Storage information / clear storage: 0 of 2.

Meanwhile the module speaks only the **legacy Wear 1.x wire protocol** (`org.microg.wearable.proto`,
`RootMessage`, `ServerMessageListener`), with **zero** references to Bluetooth Classic, BLE GATT,
Nearby Connections, or a cloud relay. That is the crux: modern watches do not use that transport.

Full report: [`reports/gap-report.md`](reports/gap-report.md) · raw data:
[`reports/gap-report.json`](reports/gap-report.json).

## The three-layer problem

1. **Transport.** The module's data layer rides a socket to a Wear 1.x-era companion and exchanges
   protobuf `RootMessage` frames. Current watches pair through a different, Google-proprietary
   stack. Until something speaks that stack, every API method above is unobservable.
2. **Provisioning / pairing.** Pairing a Wear OS 3+ watch involves account provisioning, consent
   records and Fast Pair account keys — all advertised (`wear_consent*`, `wear_fast_pair_*`) and
   none implemented.
3. **Feature surface.** Notifications, media controls, channels and capabilities are the visible
   product. They sit on top of (1) and (2).

Most of the closed PRs attacked layer 3 first, or wrote a large amount of layer 3 and hoped.
The 11-PR history is in [`docs/BRIEF.md`](docs/BRIEF.md#5-what-the-pull-request-history-shows).

## Run it yourself

```bash
# Node 20+. No dependencies.
git clone --filter=blob:none --sparse https://github.com/microg/GmsCore.git /tmp/GmsCore
git -C /tmp/GmsCore sparse-checkout set play-services-wearable

npm test                                  # parser + scan tests
node tools/analyze/index.mjs --repo /tmp/GmsCore --out reports
```

The scanner reads AIDL declarations, matches them against `WearableServiceImpl` bodies, flags
`unimplemented Method` / `UnsupportedOperationException` / `TODO: implement` as stubs, and checks
whether advertised features are referenced anywhere else in the module.

## Documents

| File | What it covers |
| --- | --- |
| [`docs/BRIEF.md`](docs/BRIEF.md) | The bounty, the code that exists, the PR history, the real blockers, effort estimate, and why an AI-authored PR cannot claim this one |
| [`docs/PAIRING-PATHS.md`](docs/PAIRING-PATHS.md) | Four pairing/transport paths compared, including the no-Play-Services Chinese Wear OS build discussed in the issue |
| [`docs/TEST-MATRIX.md`](docs/TEST-MATRIX.md) | Devices, ROMs, scenarios and the evidence bundle a patch needs |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | A phased plan with entry/exit criteria mapped onto the module's files |
| [`reports/gap-report.md`](reports/gap-report.md) | Generated coverage matrix and stub inventory |

## Scope and honesty

- **Not a bounty submission.** The bounty pays only on a merged PR (or the creator adopting a fork).
  Nothing here claims it.
- **No hardware was used.** These are static findings about source code. Nothing here proves or
  disproves that pairing works; only a phone plus watch can.
- **Heuristic, not a compiler.** The scanner parses the subset of AIDL/Java the module uses, and its
  tests pin the behaviour. A method that logs `unimplemented Method` and then does real work would
  be reported as a stub — none currently do.
- The repository contains no GmsCore source. It reads a checkout you provide.

MIT licensed. Written with AI assistance, reviewed line by line; the analysis is reproducible with
the command above.
