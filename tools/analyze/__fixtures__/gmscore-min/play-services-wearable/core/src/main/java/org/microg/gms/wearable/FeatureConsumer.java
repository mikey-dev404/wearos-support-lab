package org.microg.gms.wearable;

public class FeatureConsumer {
    void check() {
        if ("wearable_services".equals(name)) {
            enableLegacyPath();
        }
    }
}
