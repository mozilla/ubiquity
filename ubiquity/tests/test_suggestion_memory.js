EXPORTED_SYMBOLS = ["TestSuggestionMemory"];

Components.utils.import("resource://ubiquity/tests/framework.js");

var RealSuggestionMemory = {};
Components.utils.import("resource://ubiquity/modules/suggestion_memory.js",
                        RealSuggestionMemory);
RealSuggestionMemory = RealSuggestionMemory.SuggestionMemory;

function getTempDbFile() {
  var Ci = Components.interfaces;
  var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Ci.nsIProperties);
  var file = dirSvc.get("TmpD", Ci.nsIFile);
  file.append("testdb.sqlite");
  file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0x600);
  return file;
}
var suggestiondb_file = getTempDbFile();
var suggestiondb_connection = null;


TestSuggestionMemory = function TestSuggestionMemory() {
  if (!suggestiondb_connection) {
    function suggestionMemoryTeardown() {
      suggestiondb_connection.close();
      suggestiondb_connection = null;
      try {
        suggestiondb_file.remove(false);
      } catch (e) { }
    };

    try {
      if (suggestiondb_file.exists())
        suggestiondb_file.remove(false);
    } catch (e) { }

    suggestiondb_connection = RealSuggestionMemory.openDatabase(suggestiondb_file);
    TestSuite.currentTest.addToTeardown(suggestionMemoryTeardown);
  }

  var connection = suggestiondb_connection;
  var id = "test";

  this.__RealSuggestionMemory = RealSuggestionMemory;
  this.__RealSuggestionMemory(id, connection);
};

TestSuggestionMemory.prototype = RealSuggestionMemory.prototype;
