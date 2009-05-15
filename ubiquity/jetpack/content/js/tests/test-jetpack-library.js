var JetpackLibraryTests ={
  testTabIsObject: function(self) {
    var Jetpack = new JetpackLibrary();
    self.assert(typeof(Jetpack.tabs.focused) == "object");
  },

  testTabOpenFocusAndClose: function(self) {
    var Jetpack = new JetpackLibrary();
    var numTabs = Jetpack.tabs.length;
    var tab = Jetpack.tabs.open("data:text/html,hai2u");
    self.assert(typeof(tab) == "object");
    self.assert(Jetpack.tabs.focused != tab);
    self.assert(Jetpack.tabs.length == numTabs+1);
    tab.focus();
    self.assert(Jetpack.tabs.focused == tab);
    tab.close();
    self.assert(Jetpack.tabs.length == numTabs);
  }
};
