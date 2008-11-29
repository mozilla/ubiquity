EXPORTED_SYMBOLS = ["TestSuggestionMemory"];

Components.utils.import("resource://ubiquity-tests/framework.js");

var RealSuggestionMemory = {};
Components.utils.import("resource://ubiquity-modules/suggestion_memory.js",
                        RealSuggestionMemory);
RealSuggestionMemory = RealSuggestionMemory.SuggestionMemory;


TestSuggestionMemory = function TestSuggestionMemory() {
  var Ci = Components.interfaces;
  var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
               .getService(Ci.nsIProperties);
  var file = dirSvc.get("TmpD", Ci.nsIFile);
  file.append("testdb.sqlite");
  var testConnection = null;
  
  if (!testConnection) {
    function suggestionMemoryTeardown() {
      testConnection.close();
      testConnection = null;
      try {
        file.remove(false);
      } catch (e) { }
    };
    
    try {
      if (file.exists())
        file.remove(false);
    } catch (e) { }
    
    testConnection = RealSuggestionMemory.openDatabase(file);
    TestSuite.currentTest.addToTeardown(suggestionMemoryTeardown);
  }

  var connection = testConnection;
  var id = "test";

  this.__RealSuggestionMemory = RealSuggestionMemory;
  this.__RealSuggestionMemory(id, connection);
};

TestSuggestionMemory.prototype = RealSuggestionMemory.prototype;
