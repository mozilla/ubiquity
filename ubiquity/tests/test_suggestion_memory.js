EXPORTED_SYMBOLS = ["TestSuggestionMemory"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/tests/framework.js");
Cu.import("resource://ubiquity/modules/suggestion_memory.js");

function getTempDbFile() {
  var file = (Cc["@mozilla.org/file/directory_service;1"]
              .getService(Ci.nsIProperties)
              .get("TmpD", Ci.nsIFile));
  file.append("testdb.sqlite");
  file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0x600);
  return file;
}
var suggestiondb_file = getTempDbFile();
var suggestiondb_connection = null;

function TestSuggestionMemory() {
  if (!suggestiondb_connection) {
    try {
      if (suggestiondb_file.exists())
        suggestiondb_file.remove(false);
    } catch (e) { }
    suggestiondb_connection = SuggestionMemory.openDatabase(suggestiondb_file);
    let self = this;
    TestSuite.currentTest.addToTeardown(function suggestionMemoryTeardown() {
      self.wipe();
      suggestiondb_connection.close();
      suggestiondb_connection = null;
      try {
        suggestiondb_file.remove(false);
      } catch (e) { }
    });
  }
  SuggestionMemory.call(this, "test", suggestiondb_connection);
}

TestSuggestionMemory.prototype = SuggestionMemory.prototype;
