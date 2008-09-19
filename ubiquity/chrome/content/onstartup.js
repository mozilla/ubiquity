function startup_setBasicPreferences() {
  // Allow JS chrome errors to show up in the error console.
  Application.prefs.setValue("javascript.options.showInConsole", true);
}

function startup_openUbiquityWelcomePage()
{
  const VERSION_PREF ="extensions.ubiquity.lastversion";

  // Compare the version in our preferences from our version in the
  // install.rdf.
  var ext = Application.extensions.get("ubiquity@labs.mozilla.com");
  var currVersion = Application.prefs.getValue(VERSION_PREF, "firstrun");
  if (currVersion != ext.version) {
    Application.prefs.setValue(VERSION_PREF, ext.version);
    cmd_help();
  }
}
