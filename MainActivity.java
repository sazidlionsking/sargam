package com.sajid.sargam;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SargamScanPlugin.class);
        registerPlugin(SargamMediaPlugin.class);
        super.onCreate(savedInstanceState);
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
