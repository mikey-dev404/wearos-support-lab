# Roadmap: from "Wear OS doesn't work" to a reviewable patch

Ordered by dependency, not by visibility. Each phase has an exit criterion that is evidence, not
opinion — if the criterion fails, the phase failed and the next one is not worth starting.

Assumption: one person, Android experience, a Wear OS 3+ watch and a phone they can flash.

---

## Phase 0 — Know the surface (done)

**Goal:** stop guessing which parts of the module are missing.

- Run `node tools/analyze/index.mjs --repo /path/to/GmsCore --out reports`.
- Output: 23 implemented, 3 partial, 22 stubs, 33 advertised features with zero backing code.

**Exit criterion:** you can name the exact method(s) that make a given API call fail, and the
transport the module speaks.

**Cost:** an hour. This is the cheapest phase and the one earlier attempts skipped.

---

## Phase 1 — Capture a pairing that works without Google services

**Goal:** obtain the byte-level story of a Play-Services-free pairing, so the transport is a
measurement rather than a guess.

Basis: the CN Wear OS companion report in
[#2843](https://github.com/microg/GmsCore/issues/2843) (see
[`PAIRING-PATHS.md`](PAIRING-PATHS.md#d-play-services-free-companion-cn-wear-os-build)).

**Tasks**

1. Reproduce the pairing: non-GMS phone + Wear OS 3+ watch + the companion build that works.
2. Capture `btsnoop_hci.log`, `logcat -b all`, and a screen recording of the whole flow.
3. Identify: which process owns the BLE link, whether an account is required, and which GATT
   services carry pairing vs. data.
4. Write it up as an issue comment (with captures, no binaries) even if you do not proceed.

**Exit criterion:** a labelled capture showing (a) the pairing handshake completing, (b) at least one
Data Layer message, and (c) the owning process on the phone.

**Cost:** 3–5 days with hardware. **Risk:** the build may require a CN account or be unobtainable;
the link may be pinned to a package signature.

**If this fails,** publish the captures and stop. That is a real contribution and it does not
overclaim a mergeable patch.

---

## Phase 2 — Transport prototype outside GmsCore

**Goal:** prove the framing before touching a 7.8k-line module.

**Tasks**

1. Standalone Android (or Kotlin/JVM) prototype that speaks the identified framing: connect, receive
   one frame, send one frame.
2. Reproduce the `Connect`-equivalent and a single `SetDataItem`-equivalent.
3. Only then decide where it lands: a new transport class in `play-services-wearable/core`, or an
   extension of the external `org.microg:wearable` library.

**Exit criterion:** a prototype log showing a frame accepted by the watch and a reply received,
without Google Play Services installed.

**Cost:** 1–2 weeks. **Risk:** encryption keyed to the pairing; proprietary framing without public
documentation.

---

## Phase 3 — Provisioning shim inside microG

**Goal:** the watch finishes pairing *with microG as the phone-side Play Services replacement*.

Relevant existing surface: `WearableService.FEATURES` advertises `wear3_oem_companion`,
`wear_consent*`, `wear_fast_pair_account_key_*`, `wear_backup_restore` — none implemented.

**Tasks**

1. Map each feature the companion asks for during pairing to a service call in `logcat`.
2. Implement the minimum: identity/node id, consent record, account-key exchange (can be local,
   non-Google identities if the protocol accepts them).
3. Decide explicitly what to do with features that cannot be honoured: return a clear failure, and
   stop advertising them.

**Exit criterion:** watch appears in `getConnectedNodes` on a clean ROM, with no Google account.

**Cost:** 1–3 weeks. **Risk:** the highest — an opaque server dependency here can end the project.

---

## Phase 4 — Feature groups, in this order

Ordered by (value × verifiability) ÷ effort, given a working link.

| Order | Group | Methods | Notes |
| ---: | --- | --- | --- |
| 1 | Capabilities (finish) | `getAllCapabilities` + de-stale the other three | Mostly local; unblocks app-side discovery and the `ferry`-style tooling that reads capabilities |
| 2 | Notification bridge | ANCS trio + `WearableListenerService.onNotificationReceived` | Needs a system `NotificationListenerService`; the visible product |
| 3 | Media controls | media session bridging | Ties into the notification path; also visible |
| 4 | Channels | 7 methods | Large-payload transfers; needed by real wear apps |
| 5 | Storage / telephony / Wi-Fi | `getStorageInformation`, `clearStorage`, `endCall`, `acceptRingingCall`, `silenceRinger`, `syncWifiCredentials` | Small, independent, good first PRs |

**Exit criterion per group:** the matching scenarios in [`TEST-MATRIX.md`](TEST-MATRIX.md) pass on at
least one watch/ROM pair, with evidence attached.

---

## Phase 5 — Make it reviewable

**Tasks**

1. Split into PRs by layer (transport / provisioning / one feature group). No mixed PRs — see the
   history in [`BRIEF.md`](BRIEF.md#5-what-the-pull-request-history-shows).
2. Attach the evidence bundle from `TEST-MATRIX.md` §3.
3. Trim `FEATURES` to what the code backs, and say so in the PR body.
4. Keep unrelated files untouched: no README reformatting, no dependency bumps.
5. Open a design-comment first if the transport choice is contestable; it is cheaper to argue about
   one page than 16k lines.

**Exit criterion:** a maintainer engages with the design, not with whether the demo is real.

---

## Contributions available with no hardware

These do not need a watch, and they are small enough to be reviewed on their own merits. They also
make the eventual transport change easier to review.

| Change | Files | Effort | Merge risk |
| --- | --- | --- | ---: |
| Remove the stale `unimplemented Method` logs from `getConnectedCapability`, `addLocalCapability`, `removeLocalCapability` | `WearableServiceImpl.java` (3 lines) | minutes | low |
| Implement `getStorageInformation` / `clearStorage` over the existing data-item store | `WearableServiceImpl.java`, `WearableImpl.java` | 1 day | low |
| Implement `getAllCapabilities` from the local capability set + known peers | `CapabilityManager.java`, service | 1–2 days | medium (node semantics) |
| Robolectric tests for data-item storage and sync-table handling | new test module | 2–3 days | low, if the repo has a test harness for the module |
| Module doc: which methods depend on transport, which are local | `docs/` in GmsCore | hours | low |

None of these claims the bounty. They are the honest way to build standing in the repo before
proposing a transport.

---

## Decision gates

- **After Phase 1:** if no Play-free pairing can be reproduced, stop. Do not write transport code
  against an unobserved protocol.
- **After Phase 3:** if pairing needs a Google-hosted identity, the phone-side approach is dead; the
  remaining angle is path D and its own companion app, which is a different project.
- **Before Phase 5:** if you cannot produce the video, do not open the PR. That is the exact failure
  mode of the last ten attempts.
