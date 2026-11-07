package com.sajid.sargam;

import android.content.Intent;
import android.content.ContentUris;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
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
        SargamPlayer.lis = new SargamPlayer.Listener() {
            @Override public void on(String s, int tok, long pos, long dur, boolean playing, String msg) {
                JSObject o = new JSObject();
                o.put("s", s);
                o.put("tok", tok);
                o.put("pos", pos);
                o.put("dur", dur);
                o.put("playing", playing);
                if (msg != null) o.put("msg", msg);
                notifyListeners("pl", o);
            }
        };
    }

    /* ---------- native player (see SargamPlayer) ---------- */
    @PluginMethod
    public void pLoad(PluginCall call) {
        try {
            String path = call.getString("path", "");
            long mid = call.getDouble("mid", 0.0).longValue();
            boolean video = "v".equals(call.getString("kind", "a"));
            String uri = null;
            if (mid > 0) {
                uri = ContentUris.withAppendedId(video ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mid).toString();
            }
            long start = call.getDouble("start", 0.0).longValue();
            boolean auto = call.getBoolean("auto", true);
            float rate = call.getDouble("rate", 1.0).floatValue();
            int tok = call.getInt("tok", 0);
            SargamPlayer.load(getContext(), path, uri, start, auto, rate, tok);
            call.resolve();
        } catch (Exception e) {
            call.reject("load failed");
        }
    }

    @PluginMethod
    public void pPlay(PluginCall call) { SargamPlayer.play(); call.resolve(); }

    @PluginMethod
    public void pPause(PluginCall call) { SargamPlayer.pause(); call.resolve(); }

    @PluginMethod
    public void pSeek(PluginCall call) {
        SargamPlayer.seek(call.getDouble("pos", 0.0).longValue());
        call.resolve();
    }

    @PluginMethod
    public void pRate(PluginCall call) {
        SargamPlayer.setRate(call.getDouble("rate", 1.0).floatValue());
        call.resolve();
    }

    @PluginMethod
    public void pStop(PluginCall call) { SargamPlayer.stop(); call.resolve(); }

    @PluginMethod
    public void pEq(PluginCall call) {
        JSObject r = new JSObject();
        try {
            boolean on = call.getBoolean("on", false);
            float bass = call.getDouble("bass", 0.0).floatValue();
            float[] g = new float[5];
            JSArray a = call.getArray("g");
            for (int i = 0; i < 5; i++) g[i] = (float) a.getDouble(i);
            r.put("ok", SargamPlayer.eq(getContext(), on, g, bass));
        } catch (Exception e) {
            r.put("ok", false);
        }
        call.resolve(r);
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
        SargamPlayer.lis = null;
        SargamPlayer.stop();
        SargamMediaService.halt();
        super.handleOnDestroy();
    }
}
