# Adds the storage/media permissions the phone scan needs to the generated AndroidManifest.xml
import re

p = "android/app/src/main/AndroidManifest.xml"
s = open(p, encoding="utf-8").read()
lines = [
    '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
]
add = ""
for line in lines:
    name = re.search(r'android:name="([^"]+)"', line).group(1)
    if name not in s:
        add += "\n    " + line
assert "<manifest" in s, "manifest not found"
s = re.sub(r"(<manifest[^>]*>)", lambda m: m.group(1) + add, s, count=1)
open(p, "w", encoding="utf-8").write(s)
print("manifest patched")
