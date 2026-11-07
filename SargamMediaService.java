package com.sajid.sargam;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;

/** Foreground service: keeps music alive in the background and shows the media notification / lock-screen controls. */
public class SargamMediaService extends Service {
    public interface Cmd { void on(String action, long posMs); }

    static volatile Cmd cmd;
    static volatile SargamMediaService inst;
    static String title = "", artist = "", album = "";
    static Bitmap art;
    static boolean playing;
    static long pos, dur;
    static float speed = 1f;

    static final String CH = "sargam_playback";
    static final int ID = 7411;
    static final String A_PLAY = "sargam.PLAY", A_PAUSE = "sargam.PAUSE", A_NEXT = "sargam.NEXT", A_PREV = "sargam.PREV", A_STOP = "sargam.STOP";

    private MediaSession session;
    private PowerManager.WakeLock wl;
    private boolean fg = false;
    private NotificationManager nm;

    /** Called from the plugin (any thread): show or refresh the notification. */
    static void refresh(final Context c) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override public void run() {
                try {
                    if (inst != null) { inst.render(); return; }
                    Intent i = new Intent(c, SargamMediaService.class);
                    if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
                } catch (Exception e) { /* app not allowed to start a service right now */ }
            }
        });
    }

    static void halt() {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override public void run() { if (inst != null) inst.shutdown(); }
        });
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        inst = this;
        nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH, "Sargam playback", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        session = new MediaSession(this, "Sargam");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { send("play", 0); }
            @Override public void onPause() { send("pause", 0); }
            @Override public void onSkipToNext() { send("next", 0); }
            @Override public void onSkipToPrevious() { send("prev", 0); }
            @Override public void onStop() { send("stop", 0); }
            @Override public void onSeekTo(long p) { send("seek", p); }
        });
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sargam:play");
            wl.setReferenceCounted(false);
        } catch (Exception e) { wl = null; }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent != null ? intent.getAction() : null;
        if (a != null) {
            if (A_PLAY.equals(a)) send("play", 0);
            else if (A_PAUSE.equals(a)) send("pause", 0);
            else if (A_NEXT.equals(a)) send("next", 0);
            else if (A_PREV.equals(a)) send("prev", 0);
            else if (A_STOP.equals(a)) send("stop", 0);
        }
        render();
        return START_NOT_STICKY;
    }

    private void send(String a, long p) {
        // the native player reacts at once (works even if the web page is slow in the background), then JS is told too
        boolean handled = false;
        try { handled = SargamPlayer.sysCmd(a, p); } catch (Throwable e) { }
        if (handled) render();
        Cmd c = cmd; if (c != null) c.on(a, p);
    }

    private PendingIntent act(String a, int code) {
        Intent i = new Intent(this, SargamMediaService.class).setAction(a);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getService(this, code, i, fl);
    }

    private int res(String name, int fallback) {
        int r = getResources().getIdentifier(name, "drawable", getPackageName());
        return r != 0 ? r : fallback;
    }

    void render() {
        try {
            MediaMetadata.Builder mb = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, album)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, dur > 0 ? dur : -1);
            if (art != null) {
                mb.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, art);
                mb.putBitmap(MediaMetadata.METADATA_KEY_ART, art);
            }
            session.setMetadata(mb.build());
            long acts = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO | PlaybackState.ACTION_STOP;
            session.setPlaybackState(new PlaybackState.Builder().setActions(acts)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, pos, playing ? speed : 0f, SystemClock.elapsedRealtime()).build());
            session.setActive(true);

            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
            b.setSmallIcon(res("ic_stat_sargam", android.R.drawable.ic_media_play))
                .setContentTitle(title).setContentText(artist)
                .setSubText(album != null && album.length() > 0 ? album : null)
                .setLargeIcon(art)
                .setVisibility(Notification.VISIBILITY_PUBLIC).setCategory(Notification.CATEGORY_TRANSPORT)
                .setShowWhen(false).setOngoing(true).setOnlyAlertOnce(true)
                .addAction(android.R.drawable.ic_media_previous, "Previous", act(A_PREV, 1))
                .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "Pause" : "Play", act(playing ? A_PAUSE : A_PLAY, 2))
                .addAction(android.R.drawable.ic_media_next, "Next", act(A_NEXT, 3))
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Close", act(A_STOP, 4))
                .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2));
            Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (open != null) {
                open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                b.setContentIntent(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)));
            }
            Notification n = b.build();
            if (!fg) {
                try {
                    if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                    else startForeground(ID, n);
                    fg = true;
                } catch (Exception e) { nm.notify(ID, n); }
            } else {
                nm.notify(ID, n);
            }
            if (wl != null) {
                if (playing) { if (!wl.isHeld()) wl.acquire(6 * 60 * 60 * 1000L); }
                else if (wl.isHeld()) wl.release();
            }
        } catch (Exception e) { /* never crash the app because of the notification */ }
    }

    void shutdown() {
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) {}
        try { if (session != null) { session.setActive(false); } } catch (Exception e) {}
        fg = false;
        try { stopForeground(true); } catch (Exception e) {}
        try { nm.cancel(ID); } catch (Exception e) {}
        stopSelf();
    }

    @Override public void onDestroy() {
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) {}
        try { if (session != null) { session.setActive(false); session.release(); } } catch (Exception e) {}
        try { SargamPlayer.release(); } catch (Throwable e) { }
        session = null; inst = null;
        super.onDestroy();
    }
}
