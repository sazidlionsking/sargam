package com.sajid.sargam;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Size;

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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
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
                    if (allFiles()) {
                        try {
                            walk(arr);
                        } catch (Throwable t) {
                            // the folder walk is a bonus; MediaStore results are still returned
                        }
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
        cols.add("date_added");
        if (Build.VERSION.SDK_INT >= 29) cols.add("relative_path");
        if (Build.VERSION.SDK_INT >= 31) cols.add("is_recording");
        Cursor c = cr.query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cols.toArray(new String[0]), null, null, null);
        if (c == null) return;
        try {
            while (c.moveToNext()) {
                String path = str(c, "_data");
                if (path.length() == 0) continue;
                String name = str(c, "_display_name");
                String folder = folderOf(c);
                boolean sug = lng(c, "is_ringtone") != 0 || lng(c, "is_alarm") != 0 || lng(c, "is_notification") != 0 || lng(c, "is_recording") != 0
                    || ScanFilter.isExcluded(folder, name, str(c, "mime_type"));
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
                o.put("sug", sug);
                o.put("added", lng(c, "date_added"));
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
        cols.add("date_added");
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
                boolean sug = ScanFilter.isExcluded(folder, name, "");
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
                o.put("sug", sug);
                o.put("added", lng(c, "date_added"));
                arr.put(o);
            }
        } finally {
            c.close();
        }
    }

    @PluginMethod
    public void thumb(final PluginCall call) {
        final long id = call.getData().optLong("id", -1);
        final String path = call.getString("path", "");
        final String kind = call.getString("kind", "a");
        final int size = call.getInt("size", 300);
        new Thread(new Runnable() {
            @Override
            public void run() {
                JSObject r = new JSObject();
                try {
                    String d = makeThumb(id, kind, size, path);
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

    private String makeThumb(long id, String kind, int size, String path) {
        boolean video = "v".equals(kind);
        Uri uri = id > 0 ? ContentUris.withAppendedId(video ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id) : null;
        Bitmap bmp = null;
        MediaMetadataRetriever mr = new MediaMetadataRetriever();
        try {
            if (uri != null) mr.setDataSource(getContext(), uri);
            else mr.setDataSource(path);
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
        if (bmp == null && uri != null && Build.VERSION.SDK_INT >= 29) {
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

    // ---------------------------------------------------------------- all-files access, folder walk, bin

    private static final Set<String> AUD = new HashSet<String>(Arrays.asList("mp3", "m4a", "aac", "wav", "flac", "ogg", "oga", "opus", "wma", "amr", "mka", "m4b"));
    private static final Set<String> VID = new HashSet<String>(Arrays.asList("mp4", "mkv", "webm", "3gp", "mov", "avi", "m4v"));

    private boolean allFiles() {
        return Build.VERSION.SDK_INT >= 30 && Environment.isExternalStorageManager();
    }

    @PluginMethod
    public void hasAllFiles(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", allFiles());
        call.resolve(r);
    }

    @PluginMethod
    public void askAllFiles(PluginCall call) {
        if (allFiles() || Build.VERSION.SDK_INT < 30) {
            JSObject r = new JSObject();
            r.put("granted", allFiles());
            call.resolve(r);
            return;
        }
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            startActivityForResult(call, i, "allDone");
        } catch (Exception e) {
            try {
                startActivityForResult(call, new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION), "allDone");
            } catch (Exception e2) {
                JSObject r = new JSObject();
                r.put("granted", false);
                call.resolve(r);
            }
        }
    }

    @ActivityCallback
    private void allDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        r.put("granted", allFiles());
        call.resolve(r);
    }

    /** Finds audio/video files that the phone's media database does not list. Photos and everything else are ignored. */
    private void walk(JSArray arr) {
        Set<String> have = new HashSet<String>();
        for (int i = 0; i < arr.length(); i++) {
            try {
                have.add(arr.getJSONObject(i).getString("path"));
            } catch (Exception e) {
                // skip
            }
        }
        File root = Environment.getExternalStorageDirectory();
        String rootPath = root.getAbsolutePath();
        ArrayDeque<File> stack = new ArrayDeque<File>();
        stack.push(root);
        int count = 0;
        while (!stack.isEmpty() && count < 300000) {
            File dir = stack.pop();
            File[] list = dir.listFiles();
            if (list == null) continue;
            for (File f : list) {
                String n = f.getName();
                if (f.isDirectory()) {
                    if (n.startsWith(".")) continue;
                    String rel = f.getAbsolutePath().substring(rootPath.length()).toLowerCase(Locale.ROOT);
                    if (rel.equals("/android/data") || rel.equals("/android/obb")) continue;
                    stack.push(f);
                    continue;
                }
                int k = n.lastIndexOf('.');
                if (k < 0) continue;
                String ext = n.substring(k + 1).toLowerCase(Locale.ROOT);
                boolean a = AUD.contains(ext), v = VID.contains(ext);
                if (!a && !v) continue;
                count++;
                String p = f.getAbsolutePath();
                if (have.contains(p)) continue;
                String par = f.getParent() == null ? "" : f.getParent();
                String folder = par.length() > rootPath.length() ? par.substring(rootPath.length() + 1) : "";
                String mime = ext.equals("amr") ? "audio/amr" : ext.equals("3gp") ? "audio/3gpp" : "";
                JSObject o = new JSObject();
                o.put("id", -1);
                o.put("kind", v ? "v" : "a");
                o.put("title", "");
                o.put("artist", "");
                o.put("album", "");
                o.put("dur", 0);
                o.put("name", n);
                o.put("size", f.length());
                o.put("path", p);
                o.put("folder", folder);
                o.put("sug", ScanFilter.isExcluded(folder, n, mime));
                o.put("added", f.lastModified() / 1000);
                arr.put(o);
            }
        }
    }

    private File binDir() {
        File d = new File(Environment.getExternalStorageDirectory(), ".SargamBin");
        if (!d.exists()) d.mkdirs();
        File nm = new File(d, ".nomedia");
        if (!nm.exists()) {
            try {
                nm.createNewFile();
            } catch (Exception e) {
                // not critical
            }
        }
        return d;
    }

    private static boolean moveFile(File from, File to) {
        if (from.renameTo(to)) return true;
        try {
            InputStream in = new FileInputStream(from);
            OutputStream out = new FileOutputStream(to);
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            out.close();
            return from.delete();
        } catch (Exception e) {
            to.delete();
            return false;
        }
    }

    private void refreshMedia(String... paths) {
        try {
            MediaScannerConnection.scanFile(getContext(), paths, null, null);
        } catch (Throwable t) {
            // ignore
        }
    }

    /** Moves a file into the hidden Sargam bin folder. Returns the new path. */
    @PluginMethod
    public void toBin(PluginCall call) {
        if (!allFiles()) {
            call.reject("no all-files access");
            return;
        }
        File from = new File(call.getString("path", ""));
        if (!from.isFile()) {
            call.reject("file not found");
            return;
        }
        File to = new File(binDir(), System.currentTimeMillis() + "_" + from.getName());
        if (!moveFile(from, to)) {
            call.reject("could not move");
            return;
        }
        refreshMedia(from.getAbsolutePath());
        JSObject r = new JSObject();
        r.put("path", to.getAbsolutePath());
        call.resolve(r);
    }

    /** Puts a binned file back where it came from (or next to it with a number if the name is taken). */
    @PluginMethod
    public void fromBin(PluginCall call) {
        File from = new File(call.getString("bin", ""));
        File to = new File(call.getString("path", ""));
        if (!from.isFile()) {
            call.reject("file not found");
            return;
        }
        File par = to.getParentFile();
        if (par != null && !par.exists()) par.mkdirs();
        if (to.exists()) {
            String n = to.getName();
            int k = n.lastIndexOf('.');
            String base = k > 0 ? n.substring(0, k) : n, ext = k > 0 ? n.substring(k) : "";
            int i = 1;
            while (to.exists()) {
                to = new File(par, base + " (" + i + ")" + ext);
                i++;
            }
        }
        if (!moveFile(from, to)) {
            call.reject("could not move");
            return;
        }
        refreshMedia(to.getAbsolutePath());
        JSObject r = new JSObject();
        r.put("path", to.getAbsolutePath());
        call.resolve(r);
    }

    /** Deletes a binned file for good. */
    @PluginMethod
    public void purge(PluginCall call) {
        File f = new File(call.getString("path", ""));
        if (f.getAbsolutePath().contains("/.SargamBin/")) f.delete();
        call.resolve();
    }
}
