/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package ai.finmind.app;

import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsSession;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final String PRODUCT_PLUS = "finmind_plus";
    private static final String PRODUCT_PRIME = "finmind_prime";
    private static final String BASE_PLAN_PLUS = "plus_monthly";
    private static final String BASE_PLAN_PRIME = "prime_monthly";
    private static final String PREFS_NAME = "billing_entitlements";

    private BillingClient billingClient;
    private boolean isBillingReady = false;
    private final Map<String, ProductDetails> productDetailsById = new HashMap<>();
    private CustomTabsSession postMessageSession;
    private boolean postMessageRequested = false;
    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }

        setupBilling();
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        return uri;
    }

    @Override
    public void onEnterAnimationComplete() {
        super.onEnterAnimationComplete();
        requestPostMessageChannelIfAvailable();
    }

    @Override
    protected CustomTabsCallback getCustomTabsCallback() {
        return new CustomTabsCallback() {
            @Override
            public void onMessageChannelReady(Bundle extras) {
                if (postMessageSession != null) {
                    postMessageSession.postMessage("native_ready", null);
                    sendCurrentEntitlements();
                }
            }

            @Override
            public void onPostMessage(String message, Bundle extras) {
                handlePostMessage(message);
            }
        };
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (billingClient != null) {
            billingClient.endConnection();
        }
    }

    private void setupBilling() {
        billingClient = BillingClient.newBuilder(this)
                .setListener((billingResult, purchases) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                            && purchases != null) {
                        handlePurchases(purchases);
                    }
                })
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    isBillingReady = true;
                    queryProducts();
                    restorePurchases();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isBillingReady = false;
            }
        });
    }

    private void requestPostMessageChannelIfAvailable() {
        if (postMessageRequested) {
            return;
        }

        CustomTabsSession session = getCustomTabsSession();
        if (session == null) {
            return;
        }

        Uri origin = Uri.parse("https://" + getString(R.string.hostName));
        session.requestPostMessageChannel(origin);
        postMessageSession = session;
        postMessageRequested = true;
    }

    private CustomTabsSession getCustomTabsSession() {
        try {
            java.lang.reflect.Field launcherField =
                    com.google.androidbrowserhelper.trusted.LauncherActivity.class
                            .getDeclaredField("mTwaLauncher");
            launcherField.setAccessible(true);
            Object twaLauncher = launcherField.get(this);
            if (twaLauncher == null) {
                return null;
            }

            java.lang.reflect.Field sessionField =
                    com.google.androidbrowserhelper.trusted.TwaLauncher.class
                            .getDeclaredField("mSession");
            sessionField.setAccessible(true);
            return (CustomTabsSession) sessionField.get(twaLauncher);
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    private void handlePostMessage(String message) {
        if (message == null) {
            return;
        }

        String normalized = message.trim().toLowerCase(Locale.US);
        switch (normalized) {
            case "buy_prime":
            case "buyprime":
                buyPrime();
                break;
            case "buy_plus":
            case "buyplus":
                buyPlus();
                break;
            case "restore":
                restorePurchases();
                break;
            default:
                break;
        }
    }

    private void queryProducts() {
        if (!isBillingReady) {
            return;
        }

        List<QueryProductDetailsParams.Product> products = Arrays.asList(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_PLUS)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build(),
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_PRIME)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (result, productDetailsList) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                return;
            }

            productDetailsById.clear();
            for (ProductDetails details : productDetailsList) {
                productDetailsById.put(details.getProductId(), details);
            }
        });
    }

    public void buyPrime() {
        buyProduct(PRODUCT_PRIME);
    }

    public void buyPlus() {
        buyProduct(PRODUCT_PLUS);
    }

    private void buyProduct(String productId) {
        if (!isBillingReady) {
            return;
        }

        ProductDetails details = productDetailsById.get(productId);
        if (details == null || details.getSubscriptionOfferDetails() == null
                || details.getSubscriptionOfferDetails().isEmpty()) {
            return;
        }

        ProductDetails.SubscriptionOfferDetails offer =
                selectOffer(details, getPreferredBasePlanId(productId));
        if (offer == null) {
            return;
        }

        BillingFlowParams.ProductDetailsParams productParams =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .setOfferToken(offer.getOfferToken())
                        .build();

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Arrays.asList(productParams))
                .build();

        billingClient.launchBillingFlow(this, flowParams);
    }

    private String getPreferredBasePlanId(String productId) {
        if (PRODUCT_PRIME.equals(productId)) {
            return BASE_PLAN_PRIME;
        }
        if (PRODUCT_PLUS.equals(productId)) {
            return BASE_PLAN_PLUS;
        }
        return null;
    }

    private ProductDetails.SubscriptionOfferDetails selectOffer(
            ProductDetails details,
            String preferredBasePlanId
    ) {
        List<ProductDetails.SubscriptionOfferDetails> offers =
                details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            return null;
        }

        if (preferredBasePlanId != null && !preferredBasePlanId.isEmpty()) {
            for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                if (preferredBasePlanId.equals(offer.getBasePlanId())) {
                    return offer;
                }
            }
        }

        return offers.get(0);
    }

    private void restorePurchases() {
        if (!isBillingReady) {
            return;
        }

        resetEntitlements();

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                handlePurchases(purchases);
            }
        });
    }

    private void handlePurchases(List<Purchase> purchases) {
        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                if (!purchase.isAcknowledged()) {
                    AcknowledgePurchaseParams ackParams =
                            AcknowledgePurchaseParams.newBuilder()
                                    .setPurchaseToken(purchase.getPurchaseToken())
                                    .build();

                    billingClient.acknowledgePurchase(ackParams, billingResult -> {
                    });
                }

                for (String productId : purchase.getProducts()) {
                    unlockEntitlement(productId);
                }
            }
        }

        notifyTier();
    }

    private void unlockEntitlement(String productId) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean(productId, true).apply();
        notifyWebEntitlement(productId, true);
    }

    private void lockEntitlement(String productId) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean(productId, false).apply();
    }

    private void resetEntitlements() {
        lockEntitlement(PRODUCT_PLUS);
        lockEntitlement(PRODUCT_PRIME);
        notifyWebEntitlement("reset", false);
        notifyTier();
    }

    private void notifyWebEntitlement(String productId, boolean enabled) {
        if (postMessageSession == null) {
            return;
        }

        String message = "entitlement:" + productId + ":" + (enabled ? "on" : "off");
        postMessageSession.postMessage(message, null);
    }

    private void sendCurrentEntitlements() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (prefs.getBoolean(PRODUCT_PLUS, false)) {
            notifyWebEntitlement(PRODUCT_PLUS, true);
        }
        if (prefs.getBoolean(PRODUCT_PRIME, false)) {
            notifyWebEntitlement(PRODUCT_PRIME, true);
        }
        notifyTier();
    }

    private void notifyTier() {
        if (postMessageSession == null) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String tier = "none";
        if (prefs.getBoolean(PRODUCT_PRIME, false)) {
            tier = "prime";
        } else if (prefs.getBoolean(PRODUCT_PLUS, false)) {
            tier = "plus";
        }

        postMessageSession.postMessage("tier:" + tier, null);
    }
}
