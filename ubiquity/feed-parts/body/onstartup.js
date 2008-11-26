function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}
