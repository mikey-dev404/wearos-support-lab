package org.microg.gms.wearable;

public class WearableServiceImpl extends IWearableService.Stub {
    private static final String TAG = "GmsWearSvcImpl";

    @Override
    public void putConfig(IWearableCallbacks callbacks, final ConnectionConfiguration config) throws RemoteException {
        postMain(callbacks, () -> {
            wearable.createConnection(config);
            callbacks.onStatus(Status.SUCCESS);
        });
    }

    @Override
    public void getConfigs(IWearableCallbacks callbacks) throws RemoteException {
        postMain(callbacks, () -> {
            try {
                callbacks.onGetConfigsResponse(new GetConfigsResponse(0, wearable.getConfigurations()));
            } catch (Exception e) {
                callbacks.onGetConfigsResponse(new GetConfigsResponse(8, new ConnectionConfiguration[0]));
            }
        });
    }

    @Override
    public void putData(IWearableCallbacks callbacks, PutDataRequest request) throws RemoteException {
        // A brace inside a string must not confuse the brace matcher: "{ not a block }"
        this.wearable.networkHandler.post(new CallbackRunnable(callbacks) {
            @Override
            public void run(IWearableCallbacks callbacks) throws RemoteException {
                callbacks.onPutDataResponse(new PutDataResponse(0, request.getDataItem()));
            }
        });
    }

    @Override
    public void getDataItem(IWearableCallbacks callbacks, Uri uri) {
        throw new UnsupportedOperationException("not reachable in this fixture");
    }

    @Override
    public void getConnectedCapability(IWearableCallbacks callbacks, String capability, int nodeFilter) throws RemoteException {
        Log.d(TAG, "unimplemented Method: getConnectedCapability " + capability + ", " + nodeFilter);
        callbacks.onGetCapabilityResponse(new GetCapabilityResponse(0, null));
    }

    @Override
    public void addLocalCapability(IWearableCallbacks callbacks, String capability) throws RemoteException {
        Log.d(TAG, "unimplemented Method: addLocalCapability: " + capability);
        callbacks.onAddLocalCapabilityResponse(new AddLocalCapabilityResponse(capabilities.add(capability)));
    }

    @Override
    public void addListener(IWearableCallbacks callbacks, AddListenerRequest request) throws RemoteException {
        // TODO: implement
    }

    @Override
    public void openChannel(IWearableCallbacks callbacks, String s1, String s2) throws RemoteException {
        Log.d(TAG, "unimplemented Method: openChannel; " + s1 + ", " + s2);
    }
}
