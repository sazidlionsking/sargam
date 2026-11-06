package com.sajid.sargam;

import java.util.Locale;
import java.util.regex.Pattern;

/** Decides which folders/files LOOK like recordings, ringtones etc. They are still listed, but their folder starts switched off.
 *  Decides which media files are NOT music/videos (voice recordings, call recordings, ringtones...). No Android classes here. */
public final class ScanFilter {
    private ScanFilter() {}

    private static final String[] DIR_WORDS = {
        "record", "voice", "/ptt", "dcim", "screenshot", "ringtone", "alarms", "notifications", "voicemail"
    };
    private static final Pattern DIR_CALL = Pattern.compile("(^|/)call|[ _\\-]call");
    private static final Pattern NAME_REC = Pattern.compile(
        "^(rec[ _\\-]|rec\\d|recording|new recording|record|voice[ _\\-]?(note|memo|mail|\\d)|call[ _\\-]?rec|ptt-|audio[ _\\-]?recording|sound[ _\\-]?recording).*");

    public static boolean isExcluded(String relPath, String name, String mime) {
        String d = (relPath == null ? "" : relPath).toLowerCase(Locale.ROOT).replace('\\', '/');
        if (d.length() > 0 && !d.endsWith("/")) d = d + "/";
        for (String w : DIR_WORDS) if (d.contains(w)) return true;
        if (DIR_CALL.matcher(d).find()) return true;
        if (d.contains("android/") && !d.contains("android/media/")) return true;
        String n = (name == null ? "" : name).toLowerCase(Locale.ROOT);
        if (NAME_REC.matcher(n).matches()) return true;
        String m = (mime == null ? "" : mime).toLowerCase(Locale.ROOT);
        return m.contains("amr") || m.contains("3gpp");
    }
}
