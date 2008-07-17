function harnessSetup() {
  // Disable the XUL cache.
  Application.prefs.setValue("nglayout.debug.disable_xul_cache", true);
}

function harnessTeardown() {
}

window.addEventListener("load", harnessSetup, false);
window.addEventListener("unload", harnessTeardown, false);
