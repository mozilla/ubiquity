function exportConfiguration() {
  // JSON-able configuration data.
  var config = {};

  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/setup.js", jsm);
  Components.utils.import("resource://ubiquity/modules/utils.js", jsm);

  var services = jsm.UbiquitySetup.createServices();
  if (services.feedManager._annSvc) {
    var annSvc = services.feedManager._annSvc;
    config.annotations = JSON.parse(annSvc.toJSONString());
  }

  config.skins = services.skinService.skinList;

  // Iterate through all preferences and write them out.
  config.prefs = {};
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService);
  prefs = prefs.getBranch("extensions.ubiquity.");

  var children = prefs.getChildList("", {});
  children.forEach(
    function(name) {
      if (prefs.prefHasUserValue(name)) {
        var value = "(invalid)";
        switch (prefs.getPrefType(name)) {
        case prefs.PREF_STRING:
          value = prefs.getCharPref(name);
          break;
        case prefs.PREF_INT:
          value = prefs.getIntPref(name);
          break;
        case prefs.PREF_BOOL:
          value = prefs.getBoolPref(name);
          break;
        }
        config.prefs[name] = value;
      }
    });

  // JSONify the data, write it out to a data: URI and open it in
  // a new browser tab so it's saved for as long as the user
  // wants to keep the tab open.
  var json = JSON.stringify(config);
  jsm.Utils.openUrlInBrowser("data:text/plain," + encodeURI(json));
}
