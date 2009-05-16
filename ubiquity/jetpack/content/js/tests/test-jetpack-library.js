var DictionaryTests = {
  testSetAndGet: function(self) {
    var dict = new Dictionary();
    var a = {foo: "bar"};
    var b = {baz: "blah"};
    var c = window;
    dict.set("hi", "there");
    dict.set(a, b);
    self.assertEqual(dict.get("hi"), "there");
    self.assertEqual(dict.get(a), b);
    dict.set(a, c);
    self.assertEqual(dict.get(a), c);
    self.assertEqual(dict.length, 2);
  },

  testRemove: function(self) {
    var dict = new Dictionary();
    var a = {a: 1};
    dict.set(1, 2);
    dict.set(3, 4);
    dict.set(a, 1);
    dict.remove(3);
    self.assertEqual(dict.get(3), null);
    self.assertEqual(dict.length, 2);
    self.assertRaises(function() { dict.remove(3); }, Error);
  }
};

var JetpackLibraryTests = {
  testTabIsObject: function(self) {
    var Jetpack = new JetpackLibrary();
    self.assert(typeof(Jetpack.tabs.focused) == "object");
    Jetpack.unload();
  },

  testMixInEventsBubble: function(self) {
    var Jetpack = new JetpackLibrary();
    Jetpack.tabs.onReady(
      function onReady(document) {
        Jetpack.tabs.onReady.unbind(onReady);
        self.assert(this, tab);
        self.assert($(document).text() == "hello");
        tab.close();
        Jetpack.unload();
        self.success();
      });
    var tab = Jetpack.tabs.open("data:text/html,hello");
    self.setTimeout(1000);
  },

  testTabOpenFocusAndClose: function(self) {
    var Jetpack = new JetpackLibrary();
    var originalTabCount = Jetpack.tabs.length;
    var tab = Jetpack.tabs.open("data:text/html,hai2u");
    self.assert(Jetpack.tabs.focused != tab);
    self.assert(Jetpack.tabs.length == originalTabCount+1);
    tab.focus();
    self.assert(Jetpack.tabs.focused == tab);
    tab.onReady(
      function onReady(document) {
        self.assert(this, tab);
        tab.onReady.unbind(onReady);
        self.assert($(document).text() == "hai2u");
        tab.close();
        self.assert(Jetpack.tabs.length == originalTabCount);
        Jetpack.unload();
        self.success();
      });
    self.setTimeout(1000);
  }
};
