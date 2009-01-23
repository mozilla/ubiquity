Components.utils.import("resource://ubiquity/modules/hiddenbrowser.js");
Components.utils.import("resource://ubiquity/tests/framework.js");

function testHiddenBrowserWorks() {
  this.skipIfXPCShell();

  var self = this;
  var url = 'data:text/html,<b id="main">hi</b>';

  function onFactory(factory) {
    function onNextBrowser(browser) {
      self.assertEquals(browser.contentWindow.wrappedJSObject.foo, 1);
    }

    function onBrowser(browser) {
      self.assert(browser.getAttribute("src") == url);
      self.assertEquals(
        browser.contentDocument.getElementById("main").innerHTML,
        "hi"
      );
      browser.contentWindow.wrappedJSObject.foo = 1;
      factory.makeBrowser(url, self.makeCallback(onNextBrowser));
    }

    factory.makeBrowser(url, self.makeCallback(onBrowser));
  }

  makeHiddenBrowserFactory(self.makeCallback(onFactory));
}

exportTests(this);
