# The Wear OS bounty, read against the code

> Bounty: [`microg/GmsCore#2843`](https://github.com/microg/GmsCore/issues/2843) · $2,340 pooled ·
> open since 2025-03-31 · 190 comments · 11 claimed PRs, none merged.

This brief is written for someone deciding whether to work the bounty, not for someone claiming it.
It separates three things that the issue thread routinely mixes up: what the product needs, what
the module already does, and what a maintainer will actually merge.

---

## 1. What the bounty asks for

The issue text is short and the acceptance bar is implied rather than written:

- pair a **current-generation** Wear OS device with a phone running microG (no Google Play Services);
- get **basic functionality**: notification echo, media controls, and apps that use the
  Wearable Data Layer on both ends.

"Current-generation" is doing the work in that sentence. Wear OS 1.x and 2.x were a
phone-tethered companion model with a documented-ish message protocol; Wear OS 3 and later
rebuilt pairing and sync around a Google account and Google's device provisioning. The 10-year-old
thread ([#4](https://github.com/microg/GmsCore/issues/4)) is mostly about that shift.

## 2. How the money moves

BountyHub's [hunter documentation](https://www.bountyhub.dev/en/docs/claim-bounty) is explicit:
submit a PR, **wait for merge**, then claim. The bounty creator may instead choose your fork, but
that is discretionary. A closed-but-unmerged PR pays nothing.

The practical consequence: the gate is not "does the code compile", it is "does a maintainer merge
it". Everything in this repository is oriented around that gate.

## 3. What exists in the tree today

Module: `play-services-wearable` (7,843 Java lines, 80 source files, 155 files overall). Generated
numbers are in [`../reports/gap-report.md`](../reports/gap-report.md), pinned to
`342c280` (2026-10-07).

### 3.1 The API surface is declared, half-implemented

`IWearableService.aidl` declares 48 binder methods. 23 are fully implemented; 25 still log
`unimplemented Method`, and of those 22 are genuine no-ops while 3 do real work behind a stale log:

| Group | Methods | Implemented | Partial (stale log) | Stubs |
| --- | ---: | ---: | ---: | ---: |
| Configs | 5 | 5 | 0 | 0 |
| DataItems | 7 | 7 | 0 | 0 |
| Other (listeners, storage, telephony, sync-wifi, `putConnection`…) | 13 | 6 | 0 | 7 |
| Capabilities | 4 | 0 | 3 | 1 |
| Apple Notification Center Service | 3 | 0 | 0 | 3 |
| Channels | 7 | 0 | 0 | 7 |
| Cloud Sync | 5 | 2 | 0 | 3 |
| Deprecated connection API | 4 | 3 | 0 | 1 |

The three partial ones (`getConnectedCapability`, `addLocalCapability`, `removeLocalCapability`)
resolve through `CapabilityManager` and then log "unimplemented" anyway; `getAllCapabilities` answers
with an empty response. So capability discovery half-works — and looks broken in logs, which is why
earlier attempts assumed the whole group was missing.

The implemented half is real work: data items are stored, synced and dispatched to
`WearableListenerService` consumers; node discovery and listeners are wired; the config API works.
That matters because it means the module is not a shell — it is a working Wear 1.x implementation.

> The AIDL's own comment spells the capability section "Capabilties". It is upstream's typo,
> reproduced by the report so the output matches the source.

### 3.2 The transport is Wear 1.x only

`MessageHandler extends org.microg.wearable.ServerMessageListener` and exchanges protobuf frames
(`RootMessage`, `Connect`, `SyncStart`, `SetDataItem`, `Request`, `Heartbeat`, `FilePiece`) over a
socket provided by the external `org.microg:wearable` artifact. That is the legacy companion
protocol — the one the old Wear OS phone app spoke.

A lexical scan of the module for transport signals:

| Transport | References in module |
| --- | ---: |
| Legacy Wear 1.x proto (`org.microg.wearable.proto`, `RootMessage`, `ServerMessageListener`) | 38 |
| Bluetooth Classic / RFCOMM | 0 |
| BLE GATT (client or server) | 0 |
| Nearby Connections | 0 |
| Google cloud relay / GCM for wearable | 40 (almost all `CloudSync*` API classes, whose methods are stubs) |
| Wi-Fi sync | 2 (both inside a stub) |
| ANCS | 17 (all API classes; the service methods are stubs) |

Zero Bluetooth references in this module is not proof that microG has no Bluetooth code — the legacy
sockets live in the external `org.microg:wearable` library. It is proof that **nothing in this module
speaks a modern watch transport**, which is consistent with every PR author's diagnosis.

### 3.3 Features are advertised, not implemented

`WearableService.FEATURES` returns 33 vendor features to clients at connection time
(`wear3_oem_companion`, `wear_consent*`, `wear_fast_pair_account_key_*`, `wear_backup_restore`,
`wear_customizable_screens`, …). The literal string of **every one of them** appears only inside that
one array. Clients are told the platform supports pairing consent, Fast Pair account keys, backup and
restore, and OEM companion flows; no code path backs any of it.

That is the highest-leverage finding in this repo: filling stubs without touching feature
advertisement produces a service that still lies to the companion app at handshake time.

## 4. Where the gap actually is

Three layers, in dependency order.

**Layer 1 — Transport.** Something must carry Data Layer frames between phone and watch. Options:
BLE GATT with a proprietary framing, a Google-hosted relay, or a vendor app's own channel. The
module has none of them. Without this, no amount of API work is observable on a real device.

**Layer 2 — Provisioning and pairing.** Modern pairing is not a Bluetooth PIN exchange: it involves
account provisioning on the watch, consent records, Fast Pair account keys and a node identity that
the Data Layer keys off. The service advertises exactly these features and implements none.

**Layer 3 — Feature surface.** Notification mirroring, media controls, channels, capabilities. These
are what users see, and they are the cheapest to write and the easiest to fake in a demo — which is
why most PRs start here. They cannot be *verified* before layers 1 and 2 work.

## 5. What the pull-request history shows

Eleven PRs have been submitted. Same failure mode every time.

| PR | Date | Size | Author | Outcome |
| --- | --- | ---: | --- | --- |
| [#2939](https://github.com/microg/GmsCore/pull/2939) | early | small | Tripps20 | AuthorizationService request/response parcelables — a slice of the handshake, closed |
| [#2951](https://github.com/microg/GmsCore/pull/2951) | early | medium | StanOnKeys | notification bridge + data layer + media controls, closed |
| [#3178](https://github.com/microg/GmsCore/pull/3178) | early | medium | SBALAVIGNESH123 | "Bluetooth support for WearOS", closed |
| [#3204](https://github.com/microg/GmsCore/pull/3204) | early | medium | deadYokai | "WIP: still buggy, but it alive", closed |
| [#3662](https://github.com/microg/GmsCore/pull/3662) | 2026 | medium | namdamdoi68-oss | pairing + data bridging, closed |
| [#3747](https://github.com/microg/GmsCore/pull/3747) | 2026 | small | digivasserver-ai | ANCS attribute parser only, closed |
| [#3769](https://github.com/microg/GmsCore/pull/3769) | 2026 | large | prakhardewangan2005-hash | Wear 3+ pairing + Data Layer bridge, closed |
| [#3798](https://github.com/microg/GmsCore/pull/3798) | 2026-09-11 | 1,784+ / 23 files | juliofarah | Bluetooth transport, notifications, media controls, closed |
| [#3849](https://github.com/microg/GmsCore/pull/3849) | 2026-10-03 | 16,471+ / 157 files | joannadal4 | claimed working Pixel Watch pairing, account copy, notification mirror, media control and Data Layer, with a demo video; **closed by its author** 2026-10-12 |
| [#3852](https://github.com/microg/GmsCore/pull/3852) | 2026-10-04 | 24,019+ / 215 files | woahwhattheheck | large implementation; closed after confirming it had **no physical watch** to validate with |
| [#3921](https://github.com/microg/GmsCore/pull/3921) | 2026-10-25 | 1 line | BLACK51-S | bot-generated, closed |

Two things stand out. First, the only reviewer question anyone asked is the same one every time —
[TobiPeterG on #3849](https://github.com/microg/GmsCore/pull/3849): *"do you have a video of a WearOS
watch pairing with a phone/emulator running MicroG with these changes?"* — and on #3852 the author
answered honestly that they could not produce one. Second, the best-resourced attempt (#3849) claimed
a working demo and still ended unmerged, closed by its own author.

> The thread also contains months of low-effort bot PRs. Backers now state payout conditions
> explicitly and community members report accounts that submit them. Any contribution is read in that
> context, which raises the bar on evidence rather than lowering it.

## 6. The most interesting lead: a Play-Services-free Wear OS build

On 2026-09-11 in [#2843](https://github.com/microg/GmsCore/issues/2843), a
user reported pairing a **Galaxy Watch 6** to a GrapheneOS/vanilla-Android phone with **neither microG
nor GMS installed**, using a **Chinese build of the Wear OS app** plus the Galaxy Wearable manager.
microG contributor `eepymeowers` initially called it "odd, that should not work", then followed up:
*"it makes sense it'd work with the chinese wearos app since google is banned there and therefore it
has to work without play services."*

That is the single most actionable clue in the thread:

- it demonstrates a **production pairing path that does not require Google Play Services**;
- it implies the watch-side and phone-side components have a fallback provisioning mode
  (account-less, or CN-account based) that a replacement implementation can imitate;
- it explains why a purely phone-side GmsCore PR keeps failing: the phone app is not the only
  participant in the handshake.

Caveats: one anecdotal report, a specific watch/ROM combination, region-gated APKs, and no
captured traffic. It is a lead, not a design. [`PAIRING-PATHS.md`](PAIRING-PATHS.md) lays out what
to measure.

## 7. What a mergeable change would look like

Based on how the maintainers responded (and which PRs they engaged with at all):

1. **One layer at a time.** A PR that replaces the transport is reviewable; a PR that replaces the
   transport *and* rewrites 33 advertised features is not. #3798 (23 files) got a substantive
   question; #3852 (215 files) got a request for proof and a close.
2. **Hardware evidence in the PR body.** Screen recording of pairing from a clean ROM, `logcat`
   from `GmsWearSvc`/`GmsWearMsgHandler` around pairing, and which build of the companion app was
   used. See [`TEST-MATRIX.md`](TEST-MATRIX.md) for the exact bundle.
3. **Stop advertising what you do not implement.** Trimming `FEATURES` to what the code backs is a
   small, defensible PR that makes failures legible instead of silent.
4. **No drive-by edits.** The thread specifically calls out PRs that reformat the README alongside
   an unrelated feature.
5. **A design note before a patch.** For a change this structural, an issue comment describing the
   transport choice (BLE framing vs relay vs companion-app channel) with packet captures is cheaper
   to review than 16k lines.

## 8. Effort, honestly

| Workstream | What it involves | Effort | Risk |
| --- | --- | --- | --- |
| Reproduce the known-good path | Stock CN Wear OS app + Galaxy Wearable on a non-GMS ROM; capture BLE traffic (`btsnoop`), identify pairing and sync channels | 3–5 days, needs hardware | Medium — depends on APK availability and HCI logging on the phone |
| Transport prototype | Implement the observed framing in a microG service or a stub app; prove node discovery | 1–2 weeks | High — undocumented protocol, encryption possible |
| Provisioning | Account/consent/Fast Pair key shims sufficient for the companion app to finish pairing | 1–3 weeks | High — most likely place to hit an opaque server dependency |
| Feature surface | Capabilities, channels, notification bridge, media control | 1–2 weeks | Low technically, unverifiable until the above works |
| Hardening + PR | Tests, feature-flag trimming, docs, hardware evidence | 3–5 days | Medium — review latency |

Total: roughly **5–8 weeks for someone with an Android/BLE background and the devices**, with the
protocol work as the schedule risk. This is not a weekend bounty, and the payout is contingent on a
merge that has not happened in ten months.

## 9. Why an AI-authored PR cannot claim this

The bounty description states: *"Fully AI-generated pull requests are not accepted. You may use AI
tools for assistance, but all submissions must reflect your own understanding and meaningful human
contribution."* The maintainer thread enforces that socially and has become openly hostile to
generated patches.

Independently of the rule, the technical facts make it unclaimable by generation alone:

- acceptance requires hardware evidence that cannot be produced from source;
- the highest-value unknown (the CN pairing transport) needs packet captures from a device;
- review requires answering design questions in the thread, in real time, over weeks.

What AI assistance *is* legitimately good for here: reading 7.8k lines to map the stub inventory
(this repo), drafting the test matrix, diffing a proposed transport against the existing one,
generating the `logcat` triage checklist. That is analysis support, not authorship.

## 10. Sources

- Issue: <https://github.com/microg/GmsCore/issues/2843> (190 comments; bounty label; open)
- Bounty listing: <https://www.bountyhub.dev/en/bounty/view/27a47575-ef9f-49d3-9685-c056d6825f9d/bounty-wearos-support>
- BountyHub hunter rules (payment on merge): <https://www.bountyhub.dev/en/docs/claim-bounty>
- Older Wear thread: <https://github.com/microg/GmsCore/issues/4>
- Module source at `342c280`: `play-services-wearable/src/main/aidl/.../IWearableService.aidl`,
  `play-services-wearable/core/src/main/java/org/microg/gms/wearable/{WearableService,WearableServiceImpl,MessageHandler}.java`
- PRs: #2939, #2951, #3178, #3204, #3662, #3747, #3769, #3798, #3849, #3852, #3921
