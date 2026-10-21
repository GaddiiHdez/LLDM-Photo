package com.bereasnap.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins locales deben registrarse antes de super.onCreate
        registerPlugin(MediaSaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
