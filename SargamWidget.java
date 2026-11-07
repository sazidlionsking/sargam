package com.sajid.sargam;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;
import android.util.Base64;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Home-screen widget: now playing (cover, title, artist, prev / play-pause / next),
 * a glass background tinted with the song colour, and up to 5 tiles (playlists or songs) chosen in the app.
 */
public class SargamWidget extends AppWidgetProvider {
    static final String PREFS = "sargam_widget";
    static final String W_PREV = "sargam.W_PREV", W_TOG = "sargam.W_TOG", W_NEXT = "sargam.W_NEXT";
    static final int DEFAULT_COLOR = 0xFF0F2418;

    private static final int[] TILE_IDS = { R.id.w_t1, R.id.w_t2, R.id.w_t3, R.id.w_t4, R.id.w_t5 };
    private static final int[] TILE_COLORS = { 0xFF1F8F5A, 0xFF2E6FB7, 0xFFB5527A, 0xFFB57A2E, 0xFF6A4FB5, 0xFF2E9AA6 };

    // decoded tiles are kept until the saved list changes
    private static String tileSrc = null;
    private static Bitmap[] tileBmp = new Bitmap[5];
    private static String[] tileKey = new String[5];
    private static int tileCount = 0;

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        try {
            RemoteViews rv = build(c);
            for (int id : ids) m.updateAppWidget(id, rv);
        } catch (Throwable e) { /* never crash */ }
    }

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i != null ? i.getAction() : null;
        if (W_PREV.equals(a) || W_TOG.equals(a) || W_NEXT.equals(a)) {
            try {
                if (SargamMediaService.inst != null) {
                    String act = W_PREV.equals(a) ? SargamMediaService.A_PREV
                        : W_NEXT.equals(a) ? SargamMediaService.A_NEXT
                        : (SargamMediaService.playing ? SargamMediaService.A_PAUSE : SargamMediaService.A_PLAY);
                    c.startService(new Intent(c, SargamMediaService.class).setAction(act));
                } else {
                    refresh(c); // player is gone: show the idle widget so the next tap opens the app
                }
            } catch (Throwable e) { }
            return;
        }
        super.onReceive(c, i);
    }

    /** Redraw every placed widget. Safe to call from anywhere. */
    static void refresh(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, SargamWidget.class));
            if (ids == null || ids.length == 0) return;
            RemoteViews rv = build(c);
            for (int id : ids) m.updateAppWidget(id, rv);
        } catch (Throwable e) { }
    }

    private static int flags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
    }

    private static PendingIntent bc(Context c, String action, int code) {
        Intent i = new Intent(c, SargamWidget.class).setAction(action);
        return PendingIntent.getBroadcast(c, code, i, flags());
    }

    private static PendingIntent openApp(Context c) {
        Intent i = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (i == null) i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(c, 90, i, flags());
    }

    private static PendingIntent tilePi(Context c, int n, String key) {
        Intent i = new Intent(c, MainActivity.class).setAction("sargam.WPLAY").putExtra("k", key);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(c, 100 + n, i, flags());
    }

    static RemoteViews build(Context c) {
        RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.sargam_widget);
        String title = SargamMediaService.title;
        boolean active = SargamMediaService.inst != null && title != null && title.length() > 0;
        loadTiles(c);

        rv.setInt(R.id.w_bg, "setColorFilter", active ? SargamMediaService.color : DEFAULT_COLOR);

        PendingIntent open = openApp(c);
        rv.setOnClickPendingIntent(R.id.w_info, open);
        rv.setOnClickPendingIntent(R.id.w_art, open);

        if (active) {
            rv.setTextViewText(R.id.w_title, title);
            String ar = SargamMediaService.artist;
            rv.setTextViewText(R.id.w_artist, ar == null ? "" : ar);
            Bitmap art = SargamMediaService.art;
            if (art != null) {
                try { rv.setImageViewBitmap(R.id.w_art, round(art, 128, 24f)); }
                catch (Throwable e) { rv.setImageViewResource(R.id.w_art, R.drawable.w_art_ph); }
            } else {
                rv.setImageViewResource(R.id.w_art, R.drawable.w_art_ph);
            }
            rv.setImageViewResource(R.id.w_play, SargamMediaService.playing ? R.drawable.ic_w_pause : R.drawable.ic_w_play);
            rv.setOnClickPendingIntent(R.id.w_prev, bc(c, W_PREV, 1));
            rv.setOnClickPendingIntent(R.id.w_play, bc(c, W_TOG, 2));
            rv.setOnClickPendingIntent(R.id.w_next, bc(c, W_NEXT, 3));
        } else {
            rv.setTextViewText(R.id.w_title, "Sargam");
            rv.setTextViewText(R.id.w_artist, tileCount > 0 ? "Tap a tile to play" : "Open Sargam once to set up tiles");
            rv.setImageViewResource(R.id.w_art, R.drawable.w_art_ph);
            rv.setImageViewResource(R.id.w_play, R.drawable.ic_w_play);
            rv.setOnClickPendingIntent(R.id.w_prev, open);
            rv.setOnClickPendingIntent(R.id.w_play, open);
            rv.setOnClickPendingIntent(R.id.w_next, open);
        }

        for (int i = 0; i < 5; i++) {
            if (i < tileCount && tileBmp[i] != null) {
                rv.setViewVisibility(TILE_IDS[i], View.VISIBLE);
                rv.setImageViewBitmap(TILE_IDS[i], tileBmp[i]);
                rv.setOnClickPendingIntent(TILE_IDS[i], tilePi(c, i, tileKey[i]));
            } else {
                rv.setViewVisibility(TILE_IDS[i], View.INVISIBLE);
            }
        }
        return rv;
    }

    private static synchronized void loadTiles(Context c) {
        String src = c.getSharedPreferences(PREFS, 0).getString("tiles", "[]");
        if (src.equals(tileSrc)) return;
        tileSrc = src;
        tileCount = 0;
        for (int i = 0; i < 5; i++) { tileBmp[i] = null; tileKey[i] = null; }
        try {
            JSONArray a = new JSONArray(src);
            for (int i = 0; i < a.length() && i < 5; i++) {
                JSONObject o = a.getJSONObject(i);
                String k = o.optString("k", "");
                if (k.length() == 0) continue;
                String name = o.optString("n", "");
                String t = o.optString("t", "");
                Bitmap b = null;
                if (t.length() > 0) {
                    try {
                        byte[] raw = Base64.decode(t, Base64.DEFAULT);
                        Bitmap src0 = BitmapFactory.decodeByteArray(raw, 0, raw.length);
                        if (src0 != null) b = round(src0, 96, 18f);
                    } catch (Throwable e) { b = null; }
                }
                if (b == null) b = letterTile(name, 96, 18f);
                tileBmp[tileCount] = b;
                tileKey[tileCount] = k;
                tileCount++;
            }
        } catch (Throwable e) { tileCount = 0; }
    }

    /** Centre-crop to a square and round the corners. */
    private static Bitmap round(Bitmap src, int size, float r) {
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(out);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        cv.drawRoundRect(new RectF(0, 0, size, size), r, r, p);
        p.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        int w = src.getWidth(), h = src.getHeight(), s = Math.min(w, h);
        Rect from = new Rect((w - s) / 2, (h - s) / 2, (w + s) / 2, (h + s) / 2);
        cv.drawBitmap(src, from, new Rect(0, 0, size, size), p);
        return out;
    }

    /** Coloured square with the first letter, used when a playlist / song has no picture. */
    private static Bitmap letterTile(String name, int size, float r) {
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(out);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        int h = name == null ? 0 : Math.abs(name.hashCode());
        p.setColor(TILE_COLORS[h % TILE_COLORS.length]);
        cv.drawRoundRect(new RectF(0, 0, size, size), r, r, p);
        String ch = (name != null && name.trim().length() > 0) ? name.trim().substring(0, 1).toUpperCase() : "?";
        p.setColor(0xFFFFFFFF);
        p.setTextSize(size * 0.5f);
        p.setTypeface(Typeface.DEFAULT_BOLD);
        p.setTextAlign(Paint.Align.CENTER);
        cv.drawText(ch, size / 2f, size / 2f + size * 0.18f, p);
        return out;
    }
}
