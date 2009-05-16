var JetpackRuntimeTests = {
  testContextWorks: function(self) {
    function fakeUri(url) {
      return {spec: url};
    }
    var wasLogCalled = false;
    var fakeConsole = {
      log: function log(text) {
        self.assertEqual(text, "hallo");
        wasLogCalled = true;
      }
    };
    var fakeFeed = {
      uri: fakeUri("http://www.foo.com/blah.html"),
      srcUri: fakeUri("http://www.foo.com/blah.js"),
      getCodeSource: function() {
        return {
          getCode: function() {
            return "console.log('hallo');";
          },
          id: "http://www.foo.com/blah.js"
        };
      }
    };
    var context = new JetpackRuntime.Context(fakeFeed, fakeConsole);
    self.assert(wasLogCalled);
    context.unload();
  }
};
