// This is a trivial JS module that provides an empty object which can
// store globals that need to persist between multiple invocations of
// Ubiquity commands in different browser windows.

var EXPORTED_SYMBOLS = ["UbiquityGlobals"];

var UbiquityGlobals = {
  get languageCode() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
    var lang = prefs.getCharPref("extensions.ubiquity.language");
    return lang;
  }
};
