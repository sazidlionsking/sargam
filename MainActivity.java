package com.sajid.sargam;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SargamScanPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
