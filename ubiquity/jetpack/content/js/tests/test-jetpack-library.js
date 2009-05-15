var JetpackLibraryTests ={
  testTabIsObject: function(self) {
    var Jetpack = new JetpackLibrary();
    self.assert(typeof(Jetpack.tabs.focused) == "object");
  },

  testTabOpen: function(self) {
    var Jetpack = new JetpackLibrary();
    var tab = Jetpack.tabs.open("data:text/html,hai2u");
    self.assert(typeof(tab) == "object");
    self.assert(Jetpack.tabs.focused != tab);
    tab.focus();
    self.assert(Jetpack.tabs.focused == tab);
  }
};
