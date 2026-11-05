// Sargam native bridge (safe mode): only the status bar colour.
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const native = Capacitor.isNativePlatform();
const quiet = p => { try { if (p && p.catch) p.catch(() => {}); } catch (e) {} };

window.SargamNative = {
  isNative: native,
  bars(color) {
    if (!native) return;
    quiet(StatusBar.setBackgroundColor({ color }));
    quiet(StatusBar.setStyle({ style: Style.Dark }));
  }
};
