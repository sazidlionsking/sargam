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

# Capacitor's manifest already declares one androidx FileProvider (authority ${applicationId}.fileprovider).
# A second one with the same class would break the build, so we reuse it and only replace its paths file.
if "androidx.core.content.FileProvider" not in s:
    prov = '\n        <provider android:name="androidx.core.content.FileProvider" android:authorities="${applicationId}.fileprovider" android:exported="false" android:grantUriPermissions="true"><meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" /></provider>\n    '
    s = s.replace("</application>", prov + "</application>", 1)

if "SargamMediaService" not in s:
    svc = '\n        <service android:name=".SargamMediaService" android:exported="false" android:foregroundServiceType="mediaPlayback" android:stopWithTask="true" />\n    '
    s = s.replace("</application>", svc + "</application>", 1)
open(man, "w", encoding="utf-8").write(s)

# plugin sources
jd = "android/app/src/main/java/com/sajid/sargam"
os.makedirs(jd, exist_ok=True)
for f in ["SargamMediaPlugin.java", "SargamMediaService.java", "SargamPlayer.java"]:
    shutil.copy(f, jd)

# share file paths
xd = "android/app/src/main/res/xml"
os.makedirs(xd, exist_ok=True)
shutil.copy("sargam_paths.xml", os.path.join(xd, "file_paths.xml"))

# notification icon
rd = "android/app/src/main/res/drawable"
os.makedirs(rd, exist_ok=True)
shutil.copy("ic_stat_sargam.xml", rd)
print("manifest + media service patched")

# fixed debug signing key: set it explicitly so every build is signed the same way and updates install over old ones
gp = "android/app/build.gradle"
g = open(gp, encoding="utf-8").read()
if "SARGAM_SIGN" not in g:
    ks = os.path.abspath("signing/debug.keystore").replace("\\", "/")
    assert os.path.exists(ks), "signing/debug.keystore missing"
    block = (
        "\n    // SARGAM_SIGN: same key on every build\n"
        "    signingConfigs {\n"
        "        debug {\n"
        '            storeFile file("' + ks + '")\n'
        '            storePassword "android"\n'
        '            keyAlias "androiddebugkey"\n'
        '            keyPassword "android"\n'
        "        }\n"
        "    }\n"
    )
    g2 = re.sub(r"(\nandroid\s*\{)", lambda m: m.group(1) + block, g, count=1)
    assert g2 != g, "android block not found in build.gradle"
    open(gp, "w", encoding="utf-8").write(g2)
print("signing patched")
