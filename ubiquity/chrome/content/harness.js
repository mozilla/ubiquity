function onKeydown(aEvent) {
  if (aEvent.keyCode == 88 && aEvent.ctrlKey) {
    gUbiquity.openWindow();
    aEvent.preventDefault();
  }
}

function harnessSetup() {
  // Disable the XUL cache.
  Application.prefs.setValue("nglayout.debug.disable_xul_cache", true);
}

function harnessTeardown() {
}

window.addEventListener("keydown", onKeydown, false);
window.addEventListener("load", harnessSetup, false);
window.addEventListener("unload", harnessTeardown, false);
