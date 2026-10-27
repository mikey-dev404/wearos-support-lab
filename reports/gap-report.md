# microG Wear OS gap report

Generated 2026-10-27T14:58:10.137Z from `microg/GmsCore` at `342c28011b46a164b969f62acaaa32941927c4b4`.

This is a static read of the `play-services-wearable` module: which binder methods the
service declares, which of them actually do something, which vendor features are advertised
to client apps, and which transports exist in the tree. It cannot tell you whether pairing
works on a real watch — only a device can.

## Headline

- `IWearableService` methods declared: **48**
- Fully implemented: **23** (48%)
- Implemented but still logging `unimplemented Method`: **3**
- Log-only stubs: **22** (52% of the surface is log-marked)
- Missing entirely: **0**
- Vendor features advertised in `WearableService.FEATURES`: **33**, backed by code elsewhere in the module: **0**
- Java lines in the module: **7,843** across 80 files

## Coverage by API group

| Group | Methods | Implemented | Partial | Stubs | Missing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Configs | 5 | 5 | 0 | 0 | 0 |
| DataItems | 7 | 7 | 0 | 0 | 0 |
| Other | 13 | 6 | 0 | 7 | 0 |
| Capabilties | 4 | 0 | 3 | 1 | 0 |
| Apple Notification Center Service | 3 | 0 | 0 | 3 | 0 |
| Channels | 7 | 0 | 0 | 7 | 0 |
| Cloud Sync | 5 | 2 | 0 | 3 | 0 |
| deprecated Connection | 4 | 3 | 0 | 1 | 0 |

## Log-only stubs

Each method below exists on the binder, so clients can call it, but the body only logs
`unimplemented Method` (and, in some cases, answers with a failure status).

| # | Method | Group | Line | Evidence |
| ---: | --- | --- | ---: | --- |
| 1 | `getAllCapabilities` | Capabilties | 296 | Log.d(TAG, "unimplemented Method: getConnectedCapaibilties: " + nodeFilter); callbacks.onGetAllCapabilit |
| 2 | `getStorageInformation` | Other | 338 | Log.d(TAG, "unimplemented Method: getStorageInformation"); |
| 3 | `clearStorage` | Other | 343 | Log.d(TAG, "unimplemented Method: clearStorage"); |
| 4 | `endCall` | Other | 348 | Log.d(TAG, "unimplemented Method: endCall"); |
| 5 | `acceptRingingCall` | Other | 353 | Log.d(TAG, "unimplemented Method: acceptRingingCall"); |
| 6 | `silenceRinger` | Other | 358 | Log.d(TAG, "unimplemented Method: silenceRinger"); |
| 7 | `injectAncsNotificationForTesting` | Apple Notification Center Service | 367 | Log.d(TAG, "unimplemented Method: injectAncsNotificationForTesting: " + notification); |
| 8 | `doAncsPositiveAction` | Apple Notification Center Service | 372 | Log.d(TAG, "unimplemented Method: doAncsPositiveAction: " + i); |
| 9 | `doAncsNegativeAction` | Apple Notification Center Service | 377 | Log.d(TAG, "unimplemented Method: doAncsNegativeAction: " + i); |
| 10 | `openChannel` | Channels | 382 | Log.d(TAG, "unimplemented Method: openChannel; " + s1 + ", " + s2); |
| 11 | `closeChannel` | Channels | 391 | Log.d(TAG, "unimplemented Method: closeChannel: " + s); |
| 12 | `closeChannelWithError` | Channels | 396 | Log.d(TAG, "unimplemented Method: closeChannelWithError:" + s + ", " + errorCode); |
| 13 | `getChannelInputStream` | Channels | 402 | Log.d(TAG, "unimplemented Method: getChannelInputStream: " + s); |
| 14 | `getChannelOutputStream` | Channels | 407 | Log.d(TAG, "unimplemented Method: getChannelOutputStream: " + s); |
| 15 | `writeChannelInputToFd` | Channels | 412 | Log.d(TAG, "unimplemented Method: writeChannelInputToFd: " + s); |
| 16 | `readChannelOutputFromFd` | Channels | 417 | Log.d(TAG, "unimplemented Method: readChannelOutputFromFd: " + s + ", " + l1 + ", " + l2); |
| 17 | `syncWifiCredentials` | Other | 422 | Log.d(TAG, "unimplemented Method: syncWifiCredentials"); |
| 18 | `getCloudSyncOptInDone` | Cloud Sync | 236 | Log.d(TAG, "unimplemented Method: getCloudSyncOptInDone"); |
| 19 | `setCloudSyncSetting` | Cloud Sync | 241 | Log.d(TAG, "unimplemented Method: setCloudSyncSetting"); |
| 20 | `getCloudSyncOptInStatus` | Cloud Sync | 251 | Log.d(TAG, "unimplemented Method: getCloudSyncOptInStatus"); |
| 21 | `sendRemoteCommand` | Other | 256 | Log.d(TAG, "unimplemented Method: sendRemoteCommand: " + b); |
| 22 | `putConnection` | deprecated Connection | 432 | Log.d(TAG, "unimplemented Method: putConnection"); |

## Partial: works, but still logs `unimplemented Method`

These bodies do real work and remain flagged. Worth cleaning up in the same change that touches
the surrounding code, because the log line is what makes readers — and this scanner — call them stubs.

| Method | Group | Line |
| --- | --- | ---: |
| `getConnectedCapability` | Capabilties | 283 |
| `addLocalCapability` | Capabilties | 302 |
| `removeLocalCapability` | Capabilties | 313 |

## Implemented methods

`putConfig`, `deleteConfig`, `getConfigs`, `enableConfig`, `disableConfig`, `putData`, `getDataItem`, `getDataItems`, `getDataItemsByUri`, `getDataItemsByUriWithFilter`, `deleteDataItems`, `deleteDataItemsWithFilter`, `sendMessage`, `getFdForAsset`, `getLocalNode`, `getConnectedNodes`, `addListener`, `removeListener`, `optInCloudSync`, `getCloudSyncSetting`, `getConnection`, `enableConnection`, `disableConnection`

## Advertised features vs. code

`WearableService.FEATURES` is the capability list returned to clients at connection time.
A feature that appears nowhere else in the module is advertised without an implementation path.

| Feature | Version | Referenced elsewhere | Files |
| --- | ---: | --- | --- |
| `app_client` | 4 | **no** | — |
| `carrier_auth` | 1 | **no** | — |
| `wear3_oem_companion` | 1 | **no** | — |
| `wear_await_data_sync_complete` | 1 | **no** | — |
| `wear_backup_restore` | 8 | **no** | — |
| `wear_consent` | 2 | **no** | — |
| `wear_consent_recordoptin` | 1 | **no** | — |
| `wear_consent_recordoptin_swaadl` | 1 | **no** | — |
| `wear_consent_supervised` | 2 | **no** | — |
| `wear_get_phone_switching_feature_status` | 1 | **no** | — |
| `wear_fast_pair_account_key_sync` | 1 | **no** | — |
| `wear_fast_pair_get_account_keys` | 1 | **no** | — |
| `wear_fast_pair_get_account_key_by_account` | 1 | **no** | — |
| `wear_flush_batched_data` | 1 | **no** | — |
| `wear_get_related_configs` | 1 | **no** | — |
| `wear_get_node_id` | 1 | **no** | — |
| `wear_logging_service` | 2 | **no** | — |
| `wear_retry_connection` | 1 | **no** | — |
| `wear_set_cloud_sync_setting_by_node` | 1 | **no** | — |
| `wear_first_party_consents` | 2 | **no** | — |
| `wear_update_config` | 1 | **no** | — |
| `wear_update_connection_retry_strategy` | 1 | **no** | — |
| `wear_update_delay_config` | 1 | **no** | — |
| `wearable_services` | 1 | **no** | — |
| `wear_cancel_migration` | 1 | **no** | — |
| `wear_customizable_screens` | 2 | **no** | — |
| `wear_wifi_immediate_connect` | 1 | **no** | — |
| `wear_get_node_active_network_metered` | 1 | **no** | — |
| `wear_consents_per_watch` | 3 | **no** | — |
| `wear_material3_experience` | 1 | **no** | — |
| `wear_offload_connection` | 1 | **no** | — |
| `wear_get_local_capabilities` | 1 | **no** | — |
| `wear_notify_channel_flushed` | 1 | **no** | — |

## Transport inventory

Signal hits are lexical: they show what the tree mentions, not what works. The cloud-relay
hits, for example, are mostly the `CloudSync*` API surface, whose service methods are stubs.

| Transport | Signal hits | Files |
| --- | ---: | --- |
| Legacy Wear 1.x wire protocol (org.microg.wearable.proto) | 38 | play-services-wearable/core/src/main/java/org/microg/gms/wearable/DataItemRecord.java, play-services-wearable/core/src/main/java/org/microg/gms/wearable/MessageHandler.java, play-services-wearable/core/src/main/java/org/microg/gms/wearable/WearableImpl.java |
| Bluetooth Classic / RFCOMM | 0 | — |
| Bluetooth LE GATT (client or server) | 0 | — |
| Nearby Connections | 0 | — |
| Google cloud relay / GCM push for wearable | 40 | play-services-wearable/core/src/main/java/org/microg/gms/wearable/WearableServiceImpl.java, play-services-wearable/src/main/java/com/google/android/gms/wearable/internal/GetCloudSyncOptInOutDoneResponse.java, play-services-wearable/src/main/java/com/google/android/gms/wearable/internal/GetCloudSyncOptInStatusResponse.java, play-services-wearable/src/main/java/com/google/android/gms/wearable/internal/GetCloudSyncSettingResponse.java |
| Wi-Fi sync | 2 | play-services-wearable/core/src/main/java/org/microg/gms/wearable/WearableServiceImpl.java |
| Apple Notification Center Service bridge | 17 | play-services-wearable/core/src/main/java/org/microg/gms/wearable/WearableServiceImpl.java, play-services-wearable/src/main/java/com/google/android/gms/wearable/AncsNotification.java, play-services-wearable/src/main/java/com/google/android/gms/wearable/WearableListenerService.java, play-services-wearable/src/main/java/com/google/android/gms/wearable/internal/AncsNotificationParcelable.java |

## Module shape

| Area | Java lines |
| --- | ---: |
| `play-services-wearable/src/main/java/com` | 4,110 |
| `play-services-wearable/core/src/main/java` | 2,476 |
| `play-services-wearable/src/main/java/org` | 1,257 |

Public API classes shipped in the module: 60.

## Reproduce

```bash
git clone --filter=blob:none --sparse https://github.com/microg/GmsCore.git
cd GmsCore && git sparse-checkout set play-services-wearable
node tools/analyze/index.mjs --repo /path/to/GmsCore --out reports
```

