# Patches the generated Android project: permissions, media service, plugin sources, notification icon.
import os, re, shutil

man = "android/app/src/main/AndroidManifest.xml"
s = open(man, encoding="utf-8").read()
assert "<manifest" in s and "<application" in s, "manifest not found"

perms = [
    '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
    '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<uses-permission android:name="android.permission.WAKE_LOCK" />',
    '<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />',
    '<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />',
]
add = ""
for line in perms:
    name = re.search(r'android:name="([^"]+)"', line).group(1)
    if name not in s:
        add += "\n    " + line
s = re.sub(r"(<manifest[^>]*>)", lambda m: m.group(1) + add, s, count=1)

if "SargamMediaService" not in s:
    svc = '\n        <service android:name=".SargamMediaService" android:exported="false" android:foregroundServiceType="mediaPlayback" android:stopWithTask="true" />\n    '
    s = s.replace("</application>", svc + "</application>", 1)
open(man, "w", encoding="utf-8").write(s)

# plugin sources
jd = "android/app/src/main/java/com/sajid/sargam"
os.makedirs(jd, exist_ok=True)
for f in ["SargamMediaPlugin.java", "SargamMediaService.java"]:
    shutil.copy(f, jd)

# notification icon
rd = "android/app/src/main/res/drawable"
os.makedirs(rd, exist_ok=True)
shutil.copy("ic_stat_sargam.xml", rd)
print("manifest + media service patched")
