// Sargam native bridge (safe mode): status bar colour + hardware back button.
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App } from "@capacitor/app";

const native = Capacitor.isNativePlatform();
const quiet = p => { try { if (p && p.catch) p.catch(() => {}); } catch (e) {} };

window.SargamNative = {
  isNative: native,
  bars(color) {
    if (!native) return;
    quiet(StatusBar.setBackgroundColor({ color }));
    quiet(StatusBar.setStyle({ style: Style.Dark }));
  },
  onBack(cb) { if (native) quiet(App.addListener("backButton", () => cb())); },
  exit() { if (native) quiet(App.exitApp()); }
};
