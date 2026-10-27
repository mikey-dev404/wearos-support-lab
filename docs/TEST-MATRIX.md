# Test matrix and evidence bundle

A patch cannot be reviewed on source alone. This is the smallest matrix that produces reviewable
evidence for Wear OS support, plus the exact artifacts a PR should attach.

---

## 1. Hardware and builds

| Axis | Minimum to claim anything | Useful additions |
| --- | --- | --- |
| Watch | One Wear OS 3+ device, factory reset | One Samsung (Galaxy Watch 4/5/6/7) **and** one Pixel Watch — they provision differently |
| Phone | One non-GMS ROM with microG (`LineageOS for microG`, `/e/OS`, or plain LineageOS + microG) | A second ROM (GrapheneOS or stock with Play Services disabled) to prove it is not ROM-specific |
| Companion app | The build you are targeting, version pinned | The stock Play build, as a control |
| Cable / capture | USB for `adb` + `btsnoop` + screen recording | A BLE sniffer (nRF/ellisys) if HCI logging is insufficient |
| Clean state | Watch factory reset between attempts | A second watch kept paired to a stock phone for protocol comparison |

Record the exact versions in the PR: watch model, watch build number, phone ROM build fingerprint,
microG version, companion app version code, and whether the watch had ever been paired to a
GMS phone.

---

## 2. Scenarios

Ordered so that failure early is informative rather than demoralising. Every scenario is
single-cause; do not bundle them.

| # | Scenario | Depends on | Pass criteria |
| ---: | --- | --- | --- |
| S1 | Pair watch from clean state, no Google account | Transport + provisioning | Watch appears as a node; `getConnectedNodes` returns it; pairing completes without a Google sign-in |
| S2 | Reconnect after phone reboot | Persistence | Node returns without re-pairing; listeners fire |
| S3 | Reconnect after watch reboot | Persistence | Same, from the watch side |
| S4 | Phone notification appears on watch | Notification bridge | Notification within 5 s, correct app name and text |
| S5 | Dismiss from watch clears the phone notification | Notification bridge | Phone notification dismissed; no duplicate on redelivery |
| S6 | Reply from watch to a messaging app | Notification bridge + actions | Reply arrives in the phone app |
| S7 | Media controls on watch drive phone playback | Media session bridge | Play/pause/next work; metadata matches |
| S8 | `MessageApi.sendMessage` phone → watch | Data Layer | `WearableListenerService.onMessageReceived` fires on the watch app |
| S9 | `DataApi.putDataItem` + listener round trip | Data Layer + sync | Item persisted, listener fires, value survives reconnect |
| S10 | Capability discovery from both sides | Capabilities (currently 0/4) | `getCapability` returns the peer node for a registered capability |
| S11 | `ChannelApi` open + stream 1 MB | Channels (currently 0/7) | Bytes arrive intact; channel closes cleanly |
| S12 | Notification storm (50 in 60 s) | Bridge robustness | No ANR, no dropped notifications beyond the documented queue |
| S13 | 30-minute idle, then send | Connection stability | Reconnects without user action; battery drain comparable to stock |

S1 is the gate. S4–S7 are the user-visible product. S8–S11 are what makes it "Wear OS support"
rather than "notification mirroring".

---

## 3. Evidence bundle

Attach all five to the PR. Reviewers asked for exactly this on
[#3849](https://github.com/microg/GmsCore/pull/3849) and
[#3852](https://github.com/microg/GmsCore/pull/3852).

### 3.1 Screen recording

- One continuous take, ≥ 60 s, starting before the watch is put on the charger/dock.
- Show: phone home screen, watch screen, pairing completes, a notification arriving, a media
  command working.
- No cuts. A cut is an invitation to ask for another video.

### 3.2 Logcat

```bash
adb logcat -c
adb logcat -v threadtime > ferry-pairing.log
# perform pairing and scenarios S1–S4, then stop
```

Include at minimum the tags used by the module and the companion:

```bash
adb logcat -d -s GmsWearSvc:V GmsWearSvcImpl:V GmsWearMsgHandler:V WearableService:V '*:S' > wearable.log
```

### 3.3 Bluetooth HCI capture

Developer options → **Enable Bluetooth HCI snoop log** → reboot → reproduce → pull:

```bash
adb bugreport bugreport.zip        # contains btsnoop_hci.log on most builds
adb pull /data/misc/bluetooth/logs/btsnoop_hci.log
```

State the filter you used in Wireshark (`btatt`, `btsmp`) and what you concluded.

### 3.4 Environment dump

```bash
adb shell getprop ro.build.fingerprint
adb shell getprop ro.build.version.release
adb shell pm list packages | grep -Ei 'microg|wearable|gms|wear'
adb shell dumpsys package com.google.android.apps.wearable.app | head -40
adb shell dumpsys bluetooth_manager | head -60
```

### 3.5 Reproducible steps

A numbered list someone else can follow on the same hardware, including the exact companion APK
version and where it came from. If the APK is not publicly distributable, say so and describe the
flow instead of linking it.

---

## 4. PR body template

```markdown
## What this changes

<one layer only — transport, provisioning, or one feature group>

## Why

<the specific failure it fixes, with the code path that currently stubs it>

## Hardware evidence

- Watch: <model> / <build>
- Phone: <ROM> / <build fingerprint> / microG <version>
- Companion: <version code> (<source>)
- Video: <link> (single take, 0:00–1:12)
- Logcat: <link>
- HCI capture: <link>
- Scenarios passing: S1, S2, S4

## Not covered

<what you could not test, and why. Silence here is worse than an honest gap.>

## Risk

<migration, storage, manifest changes, feature-list changes>
```

---

## 5. Anti-patterns that got earlier PRs closed

- Claiming a working demo without a video or capture (asked on #3849 and #3852).
- Bundling hundreds of files, including unrelated cleanup, so the transport change cannot be
  isolated in review.
- Implementing user-visible features (notifications) while the transport they need stays absent, so
  nothing can be observed on a device.
- Advertising 33 vendor features that no code backs — the companion app then takes paths that do
  not exist, and failures look like protocol bugs.
