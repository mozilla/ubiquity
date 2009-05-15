var JetpackLibraryTests ={
  testTabIsObject: function(self) {
    var Jetpack = new JetpackLibrary();
    self.assert(typeof(Jetpack.tabs.focused) == "object");
  },

  testTabOpenFocusAndClose: function(self) {
    var Jetpack = new JetpackLibrary();
    var originalTabCount = Jetpack.tabs.length;
    var tab = Jetpack.tabs.open("data:text/html,hai2u");
    self.assert(Jetpack.tabs.focused != tab);
    self.assert(Jetpack.tabs.length == originalTabCount+1);
    tab.focus();
    self.assert(Jetpack.tabs.focused == tab);
    tab.onPageLoad(
      function onPageLoad(document) {
        tab.onPageLoad.unbind(onPageLoad);
        self.assert($(document).text() == "hai2u");
        tab.close();
        self.assert(Jetpack.tabs.length == originalTabCount);
        self.success();
      });
    self.setTimeout(1000);
  }
};
