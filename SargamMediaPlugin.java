package com.sajid.sargam;

import android.content.Intent;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SargamMedia",
    permissions = { @Permission(strings = { "android.permission.POST_NOTIFICATIONS" }, alias = "notif") }
)
public class SargamMediaPlugin extends Plugin {

    @Override
    public void load() {
        SargamMediaService.cmd = new SargamMediaService.Cmd() {
            @Override public void on(String action, long posMs) {
                JSObject o = new JSObject();
                o.put("a", action);
                o.put("pos", posMs);
                notifyListeners("cmd", o);
            }
        };
    }

    @PluginMethod
    public void update(PluginCall call) {
        try {
            SargamMediaService.title = call.getString("title", "");
            SargamMediaService.artist = call.getString("artist", "");
            SargamMediaService.album = call.getString("album", "");
            SargamMediaService.playing = call.getBoolean("playing", false);
            SargamMediaService.pos = call.getDouble("pos", 0.0).longValue();
            SargamMediaService.dur = call.getDouble("dur", 0.0).longValue();
            SargamMediaService.speed = call.getDouble("speed", 1.0).floatValue();
            if (call.hasOption("art")) {
                Bitmap bm = null;
                String a = call.getString("art");
                if (a != null && a.length() > 0) {
                    byte[] b = Base64.decode(a, Base64.DEFAULT);
                    bm = BitmapFactory.decodeByteArray(b, 0, b.length);
                }
                SargamMediaService.art = bm;
            }
            SargamMediaService.refresh(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("media update failed");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        SargamMediaService.halt();
        call.resolve();
    }

    @PluginMethod
    public void askNotif(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notif") != PermissionState.GRANTED) {
            requestPermissionForAlias("notif", call, "notifDone");
        } else {
            call.resolve();
        }
    }

    @PermissionCallback
    private void notifDone(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void battery(PluginCall call) {
        try {
            String pkg = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (Build.VERSION.SDK_INT >= 23 && pm != null && !pm.isIgnoringBatteryOptimizations(pkg)) {
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                i.setData(Uri.parse("package:" + pkg));
                startActivityForResult(call, i, "batteryDone");
                return;
            }
        } catch (Exception e) { /* fall through */ }
        call.resolve();
    }

    @ActivityCallback
    private void batteryDone(PluginCall call, ActivityResult result) {
        if (call != null) call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        SargamMediaService.cmd = null;
        SargamMediaService.halt();
        super.handleOnDestroy();
    }
}
