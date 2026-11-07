// Sargam native bridge: status bar colour, hardware back button, phone scan (MediaStore).
import { Capacitor, registerPlugin } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App } from "@capacitor/app";

const native = Capacitor.isNativePlatform();
const quiet = p => { try { if (p && p.catch) p.catch(() => {}); } catch (e) {} };
const Scan = native ? registerPlugin("SargamScan") : null;
const Media = native ? registerPlugin("SargamMedia") : null;

window.SargamNative = {
  isNative: native,
  bars(color) {
    if (!native) return;
    quiet(StatusBar.setBackgroundColor({ color }));
    quiet(StatusBar.setStyle({ style: Style.Dark }));
  },
  onBack(cb) { if (native) quiet(App.addListener("backButton", () => cb())); },
  exit(keep) { if (native) quiet(keep ? App.minimizeApp() : App.exitApp()); },
  scan: native ? {
    has: () => Scan.hasAccess(),
    ask: () => Scan.requestAccess(),
    run: () => Scan.scan(),
    thumb: o => Scan.thumb(o),
    hasAll: () => Scan.hasAllFiles(),
    askAll: () => Scan.askAllFiles(),
    toBin: o => Scan.toBin(o),
    fromBin: o => Scan.fromBin(o),
    purge: o => Scan.purge(o),
    shareFile: o => Scan.shareFile(o),
    saveCopy: o => Scan.saveCopy(o),
    writeCache: o => Scan.writeCache(o),
    clearCache: () => Scan.clearCache()
  } : null,
  media: native ? {
    update: o => quiet(Media.update(o)),
    stop: () => quiet(Media.stop()),
    ask: () => Media.askNotif().catch(() => {}),
    battery: () => Media.battery().catch(() => {}),
    onCmd(cb) { quiet(Media.addListener("cmd", e => cb(e || {}))); }
  } : null,
  player: native ? {
    load: o => quiet(Media.pLoad(o)),
    play: () => quiet(Media.pPlay()),
    pause: () => quiet(Media.pPause()),
    seek: o => quiet(Media.pSeek(o)),
    rate: o => quiet(Media.pRate(o)),
    stop: () => quiet(Media.pStop()),
    eq: o => Media.pEq(o),
    onEvent(cb) { quiet(Media.addListener("pl", e => cb(e || {}))); }
  } : null,
  fileSrc(path) { return location.origin + "/_capacitor_file_" + String(path).split("/").map(encodeURIComponent).join("/"); }
};
