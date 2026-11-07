package com.sajid.sargam;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SargamScanPlugin.class);
        registerPlugin(SargamMediaPlugin.class);
        super.onCreate(savedInstanceState);
        handleWidget(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidget(intent);
    }

    // a tile on the home-screen widget was tapped
    private void handleWidget(Intent i) {
        try {
            if (i != null && "sargam.WPLAY".equals(i.getAction())) {
                String k = i.getStringExtra("k");
                i.setAction(null);
                if (k != null) SargamMediaPlugin.deliver(k);
            }
        } catch (Exception e) { }
    }

    @Override
    public void onStart() {
        super.onStart();
        keepAlive();
        try { getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false); } catch (Exception e) {}
    }

    // Keep the web page (and its audio) running while the app is in the background.
    @Override
    public void onPause() {
        super.onPause();
        keepAlive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepAlive();
    }

    private void keepAlive() {
        try {
            WebView w = getBridge().getWebView();
            if (w != null) { w.onResume(); w.resumeTimers(); }
        } catch (Exception e) {}
    }
}
