package org.microg.gms.wearable;

public class WearableService extends BaseService {
    public static final Feature[] FEATURES = new Feature[]{
            new Feature("app_client", 4L),
            new Feature("wearable_services", 1L),
            new Feature("wear_supported_feature", 2L)
    };
}
