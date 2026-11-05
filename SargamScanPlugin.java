package com.sajid.sargam;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Size;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(
    name = "SargamScan",
    permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "video", strings = { Manifest.permission.READ_MEDIA_VIDEO }),
        @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class SargamScanPlugin extends Plugin {

    private static final Pattern ROOT = Pattern.compile("^/storage/(emulated/\\d+|[^/]+)/");

    private String[] needed() {
        if (Build.VERSION.SDK_INT >= 33) return new String[] { "audio", "video" };
        return new String[] { "storage" };
    }

    private boolean granted() {
        for (String a : needed()) {
            if (getPermissionState(a) != PermissionState.GRANTED) return false;
        }
        return true;
    }

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", granted());
        call.resolve(r);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (granted()) {
            hasAccess(call);
            return;
        }
        requestPermissionForAliases(needed(), call, "accessDone");
    }

    @PermissionCallback
    private void accessDone(PluginCall call) {
        hasAccess(call);
    }

    @PluginMethod
    public void scan(final PluginCall call) {
        if (!granted()) {
            call.reject("no permission");
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSArray arr = new JSArray();
                    queryAudio(arr);
                    try {
                        queryVideo(arr);
                    } catch (Throwable t) {
                        // video access can be limited; audio results are still returned
                    }
                    JSObject r = new JSObject();
                    r.put("items", arr);
                    call.resolve(r);
                } catch (Throwable t) {
                    call.reject(String.valueOf(t.getMessage()));
                }
            }
        }).start();
    }

    private static String str(Cursor c, String col) {
        int i = c.getColumnIndex(col);
        if (i < 0 || c.isNull(i)) return "";
        String s = c.getString(i);
        return s == null ? "" : s;
    }

    private static long lng(Cursor c, String col) {
        int i = c.getColumnIndex(col);
        if (i < 0 || c.isNull(i)) return 0;
        return c.getLong(i);
    }

    private static String folderOf(Cursor c) {
        String rel = str(c, "relative_path");
        if (rel.length() == 0) {
            String data = str(c, "_data");
            Matcher m = ROOT.matcher(data);
            if (m.find()) data = data.substring(m.end());
            int k = data.lastIndexOf('/');
            rel = k >= 0 ? data.substring(0, k) : "";
        }
        while (rel.endsWith("/")) rel = rel.substring(0, rel.length() - 1);
        return rel;
    }

    private void queryAudio(JSArray arr) {
        ContentResolver cr = getContext().getContentResolver();
        List<String> cols = new ArrayList<String>();
        cols.add(MediaStore.Audio.Media._ID);
        cols.add(MediaStore.Audio.Media.TITLE);
        cols.add(MediaStore.Audio.Media.ARTIST);
        cols.add(MediaStore.Audio.Media.ALBUM);
        cols.add(MediaStore.Audio.Media.DURATION);
        cols.add(MediaStore.Audio.Media.DISPLAY_NAME);
        cols.add(MediaStore.Audio.Media.SIZE);
        cols.add(MediaStore.Audio.Media.MIME_TYPE);
        cols.add(MediaStore.Audio.Media.DATA);
        cols.add(MediaStore.Audio.Media.IS_RINGTONE);
        cols.add(MediaStore.Audio.Media.IS_ALARM);
        cols.add(MediaStore.Audio.Media.IS_NOTIFICATION);
        if (Build.VERSION.SDK_INT >= 29) cols.add("relative_path");
        if (Build.VERSION.SDK_INT >= 31) cols.add("is_recording");
        Cursor c = cr.query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cols.toArray(new String[0]), null, null, null);
        if (c == null) return;
        try {
            while (c.moveToNext()) {
                if (lng(c, "is_ringtone") != 0 || lng(c, "is_alarm") != 0 || lng(c, "is_notification") != 0 || lng(c, "is_recording") != 0) continue;
                String path = str(c, "_data");
                if (path.length() == 0) continue;
                String name = str(c, "_display_name");
                String folder = folderOf(c);
                if (ScanFilter.isExcluded(folder, name, str(c, "mime_type"))) continue;
                String artist = str(c, "artist");
                if (artist.equals("<unknown>")) artist = "";
                String album = str(c, "album");
                if (album.equals("<unknown>")) album = "";
                JSObject o = new JSObject();
                o.put("id", lng(c, "_id"));
                o.put("kind", "a");
                o.put("title", str(c, "title"));
                o.put("artist", artist);
                o.put("album", album);
                o.put("dur", lng(c, "duration") / 1000.0);
                o.put("name", name);
                o.put("size", lng(c, "_size"));
                o.put("path", path);
                o.put("folder", folder);
                arr.put(o);
            }
        } finally {
            c.close();
        }
    }

    private void queryVideo(JSArray arr) {
        ContentResolver cr = getContext().getContentResolver();
        List<String> cols = new ArrayList<String>();
        cols.add(MediaStore.Video.Media._ID);
        cols.add(MediaStore.Video.Media.TITLE);
        cols.add(MediaStore.Video.Media.ARTIST);
        cols.add(MediaStore.Video.Media.DURATION);
        cols.add(MediaStore.Video.Media.DISPLAY_NAME);
        cols.add(MediaStore.Video.Media.SIZE);
        cols.add(MediaStore.Video.Media.MIME_TYPE);
        cols.add(MediaStore.Video.Media.DATA);
        if (Build.VERSION.SDK_INT >= 29) cols.add("relative_path");
        Cursor c = cr.query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cols.toArray(new String[0]), null, null, null);
        if (c == null) return;
        try {
            while (c.moveToNext()) {
                String path = str(c, "_data");
                if (path.length() == 0) continue;
                String name = str(c, "_display_name");
                String folder = folderOf(c);
                if (ScanFilter.isExcluded(folder, name, "")) continue;
                String artist = str(c, "artist");
                if (artist.equals("<unknown>")) artist = "";
                JSObject o = new JSObject();
                o.put("id", lng(c, "_id"));
                o.put("kind", "v");
                o.put("title", str(c, "title"));
                o.put("artist", artist);
                o.put("album", "");
                o.put("dur", lng(c, "duration") / 1000.0);
                o.put("name", name);
                o.put("size", lng(c, "_size"));
                o.put("path", path);
                o.put("folder", folder);
                arr.put(o);
            }
        } finally {
            c.close();
        }
    }

    @PluginMethod
    public void thumb(final PluginCall call) {
        final long id = call.getData().optLong("id", -1);
        final String kind = call.getString("kind", "a");
        final int size = call.getInt("size", 300);
        new Thread(new Runnable() {
            @Override
            public void run() {
                JSObject r = new JSObject();
                try {
                    String d = makeThumb(id, kind, size);
                    if (d != null) r.put("data", d);
                } catch (Throwable t) {
                    // no picture available
                }
                call.resolve(r);
            }
        }).start();
    }

    private static double luma(Bitmap b) {
        long sum = 0;
        int n = 0;
        for (int y = 0; y < 12; y++) {
            for (int x = 0; x < 12; x++) {
                int p = b.getPixel(Math.min(b.getWidth() - 1, x * b.getWidth() / 12), Math.min(b.getHeight() - 1, y * b.getHeight() / 12));
                sum += ((p >> 16) & 255) + ((p >> 8) & 255) + (p & 255);
                n += 3;
            }
        }
        return n == 0 ? 0 : (double) sum / n;
    }

    private static Bitmap decode(byte[] pic, int max) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(pic, 0, pic.length, o);
        int s = 1;
        while (o.outWidth / (s * 2) >= max && o.outHeight / (s * 2) >= max) s *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = s;
        return BitmapFactory.decodeByteArray(pic, 0, pic.length, o2);
    }

    private String makeThumb(long id, String kind, int size) {
        boolean video = "v".equals(kind);
        Uri uri = ContentUris.withAppendedId(video ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
        Bitmap bmp = null;
        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        try {
            mr.setDataSource(getContext(), uri);
            if (video) {
                String ds = mr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
                long durMs = ds == null ? 0 : Long.parseLong(ds);
                long[] pts = durMs > 4000 ? new long[] { durMs * 25 / 100, durMs * 50 / 100, durMs * 70 / 100 } : new long[] { 0 };
                double bestL = -1;
                for (long t : pts) {
                    Bitmap f = mr.getFrameAtTime(t * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                    if (f == null) continue;
                    double l = luma(f);
                    if (l > bestL) {
                        bestL = l;
                        bmp = f;
                    }
                }
            } else {
                byte[] pic = mr.getEmbeddedPicture();
                if (pic != null) bmp = decode(pic, size);
            }
        } catch (Throwable t) {
            // fall through to the system thumbnail
        } finally {
            try {
                mr.release();
            } catch (Throwable t) {
                // ignore
            }
        }
        if (bmp == null && Build.VERSION.SDK_INT >= 29) {
            try {
                bmp = getContext().getContentResolver().loadThumbnail(uri, new Size(size, size), null);
            } catch (Throwable t) {
                // none
            }
        }
        if (bmp == null) return null;
        int w = bmp.getWidth(), h = bmp.getHeight();
        int big = Math.max(w, h);
        if (big > size) {
            float k = (float) size / big;
            bmp = Bitmap.createScaledBitmap(bmp, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), true);
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.JPEG, 88, bos);
        return "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
    }
}
