package com.sajid.sargam;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.media.audiofx.BassBoost;
import android.media.audiofx.Equalizer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

/**
 * Native audio player (android.media.MediaPlayer) used instead of the WebView <audio>.
 * Everything runs on the main thread. JS drives it through SargamMediaPlugin and receives events back.
 * The foreground service (SargamMediaService) keeps the process alive; the notification stays in the service.
 */
public class SargamPlayer {
    public interface Listener { void on(String s, int tok, long pos, long dur, boolean playing, String msg); }

    static volatile Listener lis;
    private static final Handler H = new Handler(Looper.getMainLooper());
    private static final Object LOCK = new Object();

    private static Context app;
    private static MediaPlayer mp;
    private static int tok = 0;
    private static volatile int session = 0;
    private static boolean prepared = false, playing = false, wantPlay = false, resumeOnFocus = false, focus = false, noisyReg = false;
    private static long startAt = 0;
    private static float rate = 1f, appliedRate = 1f;
    private static Equalizer eqz;
    private static BassBoost bb;

    private static void main(Runnable r) {
        if (Looper.myLooper() == Looper.getMainLooper()) r.run(); else H.post(r);
    }

    private static void emit(String s, boolean pl, String msg) {
        Listener l = lis;
        if (l == null) return;
        long pos = 0, dur = 0;
        try { if (mp != null && prepared) { pos = mp.getCurrentPosition(); dur = mp.getDuration(); } } catch (Exception e) { }
        try { l.on(s, tok, pos, dur, pl, msg); } catch (Exception e) { }
    }

    /* ---------------- ticking (position about 4 times a second) ---------------- */
    private static final Runnable TICK = new Runnable() {
        @Override public void run() {
            try {
                if (mp != null && prepared && playing) {
                    SargamMediaService.pos = mp.getCurrentPosition();
                    emit("tick", true, null);
                }
            } catch (Exception e) { }
            if (playing) H.postDelayed(this, 250);
        }
    };
    private static void startTick() { H.removeCallbacks(TICK); H.postDelayed(TICK, 250); }
    private static void stopTick() { H.removeCallbacks(TICK); }

    /* ---------------- audio focus + headphones unplugged ---------------- */
    private static final AudioManager.OnAudioFocusChangeListener FL = new AudioManager.OnAudioFocusChangeListener() {
        @Override public void onAudioFocusChange(int f) {
            try {
                if (f == AudioManager.AUDIOFOCUS_LOSS) { focus = false; doPause(false); }
                else if (f == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) { if (playing) { doPause(true); resumeOnFocus = true; } }
                else if (f == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) { if (mp != null) mp.setVolume(0.25f, 0.25f); }
                else if (f == AudioManager.AUDIOFOCUS_GAIN) {
                    if (mp != null) mp.setVolume(1f, 1f);
                    if (resumeOnFocus) { resumeOnFocus = false; doPlay(); }
                }
            } catch (Exception e) { }
        }
    };

    @SuppressWarnings("deprecation")
    private static void getFocus() {
        if (focus || app == null) return;
        try {
            AudioManager am = (AudioManager) app.getSystemService(Context.AUDIO_SERVICE);
            focus = am.requestAudioFocus(FL, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } catch (Exception e) { }
    }

    @SuppressWarnings("deprecation")
    private static void dropFocus() {
        if (!focus || app == null) return;
        focus = false;
        try { ((AudioManager) app.getSystemService(Context.AUDIO_SERVICE)).abandonAudioFocus(FL); } catch (Exception e) { }
    }

    private static void regNoisy() {
        if (noisyReg || app == null) return;
        try {
            app.registerReceiver(new BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent i) { if (playing) doPause(false); }
            }, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
            noisyReg = true;
        } catch (Throwable e) { }
    }

    /* ---------------- audio session (effects stay attached across tracks) ---------------- */
    private static int sessionId(Context c) {
        if (session <= 0) {
            try { session = ((AudioManager) c.getSystemService(Context.AUDIO_SERVICE)).generateAudioSessionId(); } catch (Throwable e) { session = 0; }
        }
        return session;
    }

    private static void dropEffects() {
        synchronized (LOCK) {
            try { if (eqz != null) eqz.release(); } catch (Throwable e) { }
            try { if (bb != null) bb.release(); } catch (Throwable e) { }
            eqz = null; bb = null;
        }
    }

    /* ---------------- load / play / pause / seek ---------------- */
    static void load(Context c, final String path, final String uri, final long start, final boolean auto, final float r, final int t) {
        app = c.getApplicationContext();
        main(new Runnable() { @Override public void run() { doLoad(path, uri, start, auto, r, t); } });
    }

    private static MediaPlayer build(String path, Uri uri) throws Exception {
        MediaPlayer m = new MediaPlayer();
        try {
            int sid = sessionId(app);
            if (sid > 0) { try { m.setAudioSessionId(sid); } catch (Exception e) { } }
            m.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            m.setWakeMode(app, PowerManager.PARTIAL_WAKE_LOCK);
            if (path != null && path.length() > 0) m.setDataSource(path); else m.setDataSource(app, uri);
            return m;
        } catch (Exception e) {
            try { m.release(); } catch (Exception x) { }
            throw e;
        }
    }

    private static void doLoad(String path, String uri, long start, boolean auto, float r, int t) {
        releasePlayer();
        tok = t; wantPlay = auto; rate = r; appliedRate = 1f; startAt = start; prepared = false; playing = false;
        MediaPlayer m = null;
        if (path != null && path.length() > 0) { try { m = build(path, null); } catch (Exception e) { m = null; } }
        if (m == null && uri != null && uri.length() > 0) { try { m = build(null, Uri.parse(uri)); } catch (Exception e) { m = null; } }
        if (m == null) { emit("error", false, "open failed"); return; }
        try {
            int real = m.getAudioSessionId();
            if (real > 0 && real != session) { session = real; dropEffects(); }
        } catch (Exception e) { }
        mp = m;
        final int my = t;
        m.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
            @Override public void onPrepared(MediaPlayer p) {
                if (mp != p || my != tok) return;
                prepared = true;
                try { if (startAt > 0) p.seekTo((int) startAt); } catch (Exception e) { }
                emit("ready", false, null);
                if (wantPlay) doPlay();
            }
        });
        m.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
            @Override public void onCompletion(MediaPlayer p) {
                if (mp != p || my != tok) return;
                playing = false; wantPlay = false; stopTick();
                SargamMediaService.playing = false;
                emit("ended", false, null);
            }
        });
        m.setOnErrorListener(new MediaPlayer.OnErrorListener() {
            @Override public boolean onError(MediaPlayer p, int what, int extra) {
                if (mp != p || my != tok) return true;
                playing = false; stopTick();
                emit("error", false, what + ":" + extra);
                return true;
            }
        });
        m.setOnSeekCompleteListener(new MediaPlayer.OnSeekCompleteListener() {
            @Override public void onSeekComplete(MediaPlayer p) {
                if (mp != p || my != tok) return;
                emit("seeked", playing, null);
            }
        });
        try { m.prepareAsync(); } catch (Exception e) { emit("error", false, "prepare failed"); }
    }

    private static void applyRate() {
        if (Build.VERSION.SDK_INT < 23 || mp == null) return;
        if (Math.abs(rate - appliedRate) < 0.001f) return;
        try {
            PlaybackParams pp = mp.getPlaybackParams();
            pp.setSpeed(rate);
            mp.setPlaybackParams(pp);
            appliedRate = rate;
        } catch (Exception e) { }
    }

    private static void doPlay() {
        wantPlay = true;
        if (mp == null || !prepared) return;
        try {
            getFocus();
            mp.start();
            applyRate();
            playing = true; resumeOnFocus = false;
            regNoisy();
            SargamMediaService.playing = true;
            startTick();
            emit("state", true, null);
        } catch (Exception e) {
            playing = false;
            emit("error", false, "start failed");
        }
    }

    private static void doPause(boolean keepResume) {
        wantPlay = false;
        if (!keepResume) resumeOnFocus = false;
        try { if (mp != null && prepared && mp.isPlaying()) mp.pause(); } catch (Exception e) { }
        playing = false; stopTick();
        SargamMediaService.playing = false;
        try { if (mp != null && prepared) SargamMediaService.pos = mp.getCurrentPosition(); } catch (Exception e) { }
        emit("state", false, null);
    }

    private static void releasePlayer() {
        stopTick();
        playing = false; prepared = false;
        MediaPlayer m = mp; mp = null;
        if (m != null) {
            try { m.setOnPreparedListener(null); m.setOnCompletionListener(null); m.setOnErrorListener(null); m.setOnSeekCompleteListener(null); } catch (Exception e) { }
            try { m.reset(); } catch (Exception e) { }
            try { m.release(); } catch (Exception e) { }
        }
    }

    static void play() { main(new Runnable() { @Override public void run() { doPlay(); } }); }
    static void pause() { main(new Runnable() { @Override public void run() { doPause(false); } }); }

    static void seek(final long ms) {
        main(new Runnable() { @Override public void run() {
            if (mp == null) return;
            if (!prepared) { startAt = ms; return; }
            try { mp.seekTo((int) ms); SargamMediaService.pos = ms; } catch (Exception e) { }
        } });
    }

    static void setRate(final float r) {
        main(new Runnable() { @Override public void run() { rate = r; if (playing) applyRate(); } });
    }

    static void stop() {
        main(new Runnable() { @Override public void run() {
            wantPlay = false; resumeOnFocus = false;
            releasePlayer();
            dropFocus();
        } });
    }

    /** Called by the service (main thread) for notification / lock-screen buttons. Returns true if the native player handled it. */
    static boolean sysCmd(String a, long p) {
        if (mp == null) return false;
        if ("play".equals(a)) { doPlay(); return true; }
        if ("pause".equals(a)) { doPause(false); return true; }
        if ("seek".equals(a)) {
            try { if (prepared) { mp.seekTo((int) p); SargamMediaService.pos = p; } } catch (Exception e) { }
            return true;
        }
        return false;
    }

    /* ---------------- equalizer + bass boost on the player's audio session ---------------- */
    private static final double[] HZ = { 60, 230, 910, 3600, 14000 };

    /** The app has 5 sliders (60 Hz .. 14 kHz). Every band the phone reports gets a value interpolated between them. */
    private static double gainAt(double f, float[] g) {
        if (f <= HZ[0]) return g[0];
        if (f >= HZ[4]) return g[4];
        for (int i = 0; i < 4; i++) {
            if (f <= HZ[i + 1]) {
                double t = (Math.log(f) - Math.log(HZ[i])) / (Math.log(HZ[i + 1]) - Math.log(HZ[i]));
                return g[i] + (g[i + 1] - g[i]) * t;
            }
        }
        return 0;
    }

    static boolean eq(Context c, boolean on, float[] g, float bassDb) {
        synchronized (LOCK) {
            try {
                if (app == null) app = c.getApplicationContext();
                int sid = sessionId(app);
                if (!on) {
                    if (eqz != null) eqz.setEnabled(false);
                    if (bb != null) bb.setEnabled(false);
                    return true;
                }
                if (eqz == null) eqz = new Equalizer(0, sid);
                short n = eqz.getNumberOfBands();
                short[] range = eqz.getBandLevelRange();
                for (short b = 0; b < n; b++) {
                    double f = eqz.getCenterFreq(b) / 1000.0;
                    int mb = (int) Math.round(gainAt(f, g) * 100.0);
                    if (mb < range[0]) mb = range[0];
                    if (mb > range[1]) mb = range[1];
                    eqz.setBandLevel(b, (short) mb);
                }
                eqz.setEnabled(true);
                try {
                    if (bb == null) bb = new BassBoost(0, sid);
                    if (bb.getStrengthSupported()) {
                        int st = Math.round(Math.max(0f, Math.min(15f, bassDb)) / 15f * 1000f);
                        bb.setStrength((short) st);
                        bb.setEnabled(st > 0);
                    }
                } catch (Throwable e) { /* bass boost is optional */ }
                return true;
            } catch (Throwable e) {
                return false;
            }
        }
    }

    /** Service is going away. */
    static void release() {
        main(new Runnable() { @Override public void run() { releasePlayer(); dropFocus(); } });
    }
}
