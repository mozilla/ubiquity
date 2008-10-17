(function() {
   var RealSuggestionMemory = {};
   Components.utils.import("resource://ubiquity-modules/suggestion_memory.js",
                           RealSuggestionMemory);
   RealSuggestionMemory = RealSuggestionMemory.SuggestionMemory;

   var Ci = Components.interfaces;
   var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);
   var file = dirSvc.get("TmpD", Ci.nsIFile);
   file.append("testdb.sqlite");
   var testConnection;

   suggestionMemorySetup = function suggestionMemorySetup() {
     if (file.exists())
       file.remove(false);
     testConnection = RealSuggestionMemory.openDatabase(file);
   };

   suggestionMemoryTeardown = function suggestionMemoryTeardown() {
     testConnection.close();
     file.remove(false);
   };

   SuggestionMemory = function SuggestionMemory(id, connection) {
     // If no connection was specified, then we're using the global
     // app-wide singleton for the JS module; but we don't want to
     // do that, so instead we use our global test-wide singleton.
     if (!connection)
       connection = testConnection;
     this._init(id, connection);
   };

   SuggestionMemory.prototype = RealSuggestionMemory.prototype;
})();
