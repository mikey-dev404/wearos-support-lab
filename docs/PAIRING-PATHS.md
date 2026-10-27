# Four ways a phone can reach a watch

Pairing is the whole problem, and "pairing" means at least four different stacks depending on watch
generation and companion build. This page compares them so an implementer can pick a target and
instrument it, instead of writing Data Layer code against a transport nobody has identified.

Nothing here is verified on hardware. Statements about the Google path are inference from the code,
the issue thread and public behaviour of Wear OS; they are labelled as such.

---

## At a glance

| Path | Watch generation | Who initiates | Transport | microG today | Feasibility for a replacement |
| --- | --- | --- | --- | --- | --- |
| **A. Legacy companion** | Wear 1.x / early 2.x | Phone companion app ("Wear OS by Google" legacy build) | RFCOMM socket, protobuf `RootMessage` frames | **Implemented** (this module) | Works, for hardware nobody is buying |
| **B. Google provisioning + relay** | Wear OS 3+ | Watch, via setup wizard; phone app assists | Google endpoints; BLE for local fallback | None | Low without protocol knowledge; needs Google-side identity |
| **C. Direct BLE with proprietary framing** | Wear OS 3+ (same as B, different leg) | Companion app negotiates | BLE GATT, encrypted, unknown framing | None | Medium if the framing can be captured and is not server-bound |
| **D. Play-Services-free companion** (CN Wear OS build) | Wear OS 3+, Galaxy Watch 4+ | Companion app with no GMS dependency | Unknown — the research target | None | Medium; the only path *observed* working without Google services |

Path D is the lead described in [`BRIEF.md`](BRIEF.md#6-the-most-interesting-lead-a-play-services-free-wear-os-build).

---

## A. Legacy companion (what microG implements)

**Participants:** phone app ↔ watch app over a socket.

**In the tree:**

- `MessageHandler extends org.microg.wearable.ServerMessageListener` — the handshake is a
  `Connect` frame carrying name, node id, network id, peer android id and version.
- After connect, a `SyncStart` frame carries a sync table (`cloud`, local node id, peer node id),
  then `SetDataItem`, `Request`, `Heartbeat` and `FilePiece` frames follow.
- `WearableImpl` persists nodes (`NodeDatabaseHelper`), data items (`DataItemRecord`) and dispatches
  to listeners.

**Why it does not help:** the companion app that speaks this protocol is the pre-3.0 Wear OS phone
app. Current watches ship a different one, and the legacy build does not pair them.

**Still useful:** it is a working reference implementation of the *semantics* (sync tables, node ids,
listener dispatch). Any new transport can reuse `WearableImpl`'s storage and callback layers
unchanged — which is exactly why the API layer shows 23 implemented methods.

---

## B. Google provisioning + cloud relay

**Inference, from code and observed behaviour:**

- Wear OS 3+ setup creates a device identity on the watch and associates it with a Google account;
  the phone side assists with credentials.
- The Data Layer is addressed by node id. Google's implementation can route a message via a relay
  when phone and watch are not on the same link, which is why "cloud sync" appears as a setting in
  the API (`optInCloudSync`, `setCloudSyncSetting`, `getCloudSyncOptInStatus`).
- microG advertises `wear_consent*`, `wear_fast_pair_account_key_*`, `wear_backup_restore` — the
  feature names of that provisioning flow — with no implementation behind them.

**Why it is a trap:** even a perfect phone-side implementation needs the watch to accept a
non-Google identity, and the relay is a Google service. Unless the pairing flow has a local-only
fallback, this path cannot be completed without Google infrastructure.

**What to measure:** during a successful stock pairing, does the phone ever talk to a Google host
before the watch appears as a node? (`adb shell settings get global http_proxy` plus a capture, or
DNS logging on the router.) If pairing completes with the WAN dropped, a local fallback exists and
path C or D is the way in.

---

## C. Direct BLE with proprietary framing

**What is known:** the companion app and the watch exchange BLE traffic; some of it is standard
(GATT services for device info, battery), some is not. The Data Layer payloads are encrypted with
keys established during pairing.

**How to instrument (phone side, no root):**

1. Developer options → **Enable Bluetooth HCI snoop log**.
2. Perform a full pairing on the reference stack; capture `btsnoop_hci.log`
   (`adb bugreport` includes it, or `adb pull /data/misc/bluetooth/logs/btsnoop_hci.log` on
   debuggable builds).
3. Open in Wireshark; filter `btatt` and `btsmp`, look for the pairing exchange (SMP), then for
   encrypted ATT writes whose length and cadence match Data Layer traffic.
4. Correlate with `logcat` from `GmsWearSvc`, `GmsWearMsgHandler` and the companion app's own tags
   to label which frames carry sync vs. notifications.

**Risks:** bonding keys are per-device; replaying captured frames on another pair will not work.
If the framing is a standard GATT profile with an app-layer envelope, this is tractable. If it is a
custom L2CAP channel with a server-derived key, it is not.

---

## D. Play-Services-free companion (CN Wear OS build)

**Evidence:** a 2026-09-11 report in
[#2843](https://github.com/microg/GmsCore/issues/2843) of a Galaxy Watch 6 pairing with a phone that
had **neither GMS nor microG installed**, using a Chinese Wear OS phone app plus Galaxy Wearable;
microG's `eepymeowers` agreed it is plausible because "google is banned there and therefore it has
to work without play services".

**Why this is the best lead:** it is the only observed pairing that does not involve Google services.
Whatever identity and transport it uses is by definition implementable elsewhere.

**Research questions, in order:**

1. Which APK build was used, and is it obtainable without a CN account?
2. Does the flow require an account at all (CN vendor account, Samsung account, none)?
3. Which component owns BLE: the Wear OS app, Galaxy Wearable, or the watch's own firmware?
4. Does the Data Layer work end-to-end in that setup, or only notifications/media?
5. Is the phone-side app itself replaceable, or does the watch pin it by signature/package name?

**Instrumentation:** capture `btsnoop` on the phone during a clean pairing with that build; record
`adb logcat -b all` for both apps; note every `bindService`/`AIDL` call the app makes into Play
Services (if any) with `dumpsys activity services` and by hooking the package manager on a rooted
test device.

**If it works:** the deliverable is a transport plus a provisioning shim, and the acceptance test is
pairing a Galaxy Watch or Pixel Watch from a clean microG ROM using that companion build — no Google
account, no GMS.

---

## What this means for a PR

- Do not start with channels/notifications/capabilities. They are layer 3; nobody can verify them.
- Pick **one** target: "pair a Galaxy Watch 6 with a microG phone using companion build X" is a
  better PR title than "Wear OS support".
- Ship the capture. A `btsnoop` + `logcat` bundle in the PR body answers the reviewer's only
  recurring question before it is asked.
- If the transport cannot be identified, say so in the issue with the captures you have. That is
  still a useful contribution, and it does not overclaim.
