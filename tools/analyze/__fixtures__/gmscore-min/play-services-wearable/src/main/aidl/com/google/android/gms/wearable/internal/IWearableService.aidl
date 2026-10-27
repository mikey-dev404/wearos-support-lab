package com.google.android.gms.wearable.internal;

interface IWearableService {
    // Configs
    void putConfig(IWearableCallbacks callbacks, in ConnectionConfiguration config) = 19;
    void getConfigs(IWearableCallbacks callbacks) = 21;

    // DataItems
    void putData(IWearableCallbacks callbacks, in PutDataRequest request) = 5;
    void getDataItem(IWearableCallbacks callbacks, in Uri uri) = 6;

    // Capabilities
    void getConnectedCapability(IWearableCallbacks callbacks, String capability, int nodeFilter) = 41;
    void addLocalCapability(IWearableCallbacks callbacks, String capability) = 45;

    void addListener(IWearableCallbacks callbacks, in AddListenerRequest request) = 15;

    // Channels
    void openChannel(IWearableCallbacks callbacks, String s1, String s2) = 30;
}
