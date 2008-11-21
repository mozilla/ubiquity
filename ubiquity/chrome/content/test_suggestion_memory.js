var TestSuggestionMemory;

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
   var testConnection = null;

   function suggestionMemorySetup() {
     if (!testConnection) {
       function suggestionMemoryTeardown() {
         testConnection.close();
         testConnection = null;
         file.remove(false);
       };

       if (file.exists())
         file.remove(false);
       testConnection = RealSuggestionMemory.openDatabase(file);
       TestSuite.currentTest.addToTeardown(suggestionMemoryTeardown);
     }
   };

   TestSuggestionMemory = function TestSuggestionMemory() {
     suggestionMemorySetup();

     var connection = testConnection;
     var id = "test";

     this.__RealSuggestionMemory = RealSuggestionMemory;
     this.__RealSuggestionMemory(id, connection);
   };

   TestSuggestionMemory.prototype = RealSuggestionMemory.prototype;
})();
