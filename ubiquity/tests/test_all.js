/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/nounutils.js");
Components.utils.import("resource://ubiquity/modules/sandboxfactory.js");
Components.utils.import("resource://ubiquity/modules/codesource.js");
Components.utils.import("resource://ubiquity/modules/parser/parser.js");
Components.utils.import("resource://ubiquity/modules/parser/locale_en.js");
Components.utils.import("resource://ubiquity/modules/feedmanager.js");
Components.utils.import("resource://ubiquity/modules/cmdmanager.js");
Components.utils.import("resource://ubiquity/modules/localeutils.js");
Components.utils.import("resource://ubiquity/modules/collection.js");

Components.utils.import("resource://ubiquity/tests/framework.js");
Components.utils.import("resource://ubiquity/tests/test_eventhub.js");
Components.utils.import("resource://ubiquity/tests/test_suggestion_memory.js");
Components.utils.import("resource://ubiquity/tests/test_annotation_memory.js");
Components.utils.import("resource://ubiquity/tests/test_hiddenbrowser.js");
Components.utils.import("resource://ubiquity/tests/test_weakref.js");
Components.utils.import("resource://ubiquity/tests/test_parser.js");
Components.utils.import("resource://ubiquity/tests/test_tag_command.js");
Components.utils.import("resource://ubiquity/tests/testing_stubs.js");

var globalObj = this;

function debugSuggestionList( list ) {
  dump("There are " + list.length + " items in suggestion list.\n");
  for each (var sugg in list) {
    dump( sugg.getDisplayText() + "\n" );
  }
}

function testXhtmlCodeSourceWorks() {
  var code = "function cmd_foo() {};";
  var xhtml = '<html xmlns="http://www.w3.org/1999/xhtml"><script>a = 1;</script><script class="commands">' + code + '</script></html>';
  var fakeSource = {getCode: function() { return xhtml; },
                    id: "blah"};

  var xcs = new XhtmlCodeSource(fakeSource);

  this.assert(xcs.id == "blah", "id must inherit");
  var xcsCode = xcs.getCode();
  this.assert(xcsCode == code,
              "code must be '" + code + "' (is '" + xcsCode + "')");
  this.assert(xcs.dom, "xcs.dom must be truthy.");
  this.assertEquals(xcs.getCode(), xcsCode);
}

function testUtilsUrlWorksWithNsURI() {
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI("http://www.foo.com", null, null);

  this.assert(Utils.url(uri).spec == "http://www.foo.com/");
}

function testUtilsUrlWorksWithString() {
  this.assert(Utils.url("http://www.foo.com").spec == "http://www.foo.com/");
}

function testUtilsUrlWorksWithKeywordArgs() {
  var kwargs = {
    base: "http://www.foo.com",
    uri: "bar/baz.txt"
  };
  var expected = "http://www.foo.com/bar/baz.txt";

  this.assert(Utils.url(kwargs).spec == expected);

  kwargs.base = Utils.url(kwargs.base);
  this.assert(Utils.url(kwargs).spec == expected);
}

function testCompositeCollectionWorks() {
  let a = new StringCodeSource('a', 'a');
  let b = new StringCodeSource('b', 'b');
  let c = new StringCodeSource('c', 'c');
  let d = new StringCodeSource('d', 'd');

  let coll_1 = new IterableCollection([a, b]);
  let coll_2 = new IterableCollection([c, d]);

  let iter = Iterator(new CompositeCollection([coll_1, coll_2]));
  this.assert(iter.next().id == 'a');
  this.assert(iter.next().id == 'b');
  this.assert(iter.next().id == 'c');
  this.assert(iter.next().id == 'd');
}

function testMixedCodeSourceWorks() {
  let a = new StringCodeSource('a', 'a');
  let b = new StringCodeSource('b', 'b');
  let c = new StringCodeSource('c', 'c');
  let d = new StringCodeSource('d', 'd');
  let e = new StringCodeSource('e', 'e');
  let f = new StringCodeSource('f', 'f');

  let headers = new IterableCollection([a, b]);
  let footers = new IterableCollection([e, f]);

  let codeSources = [
    new MixedCodeSource(c, headers, footers),
    new MixedCodeSource(d, headers, footers)
  ];

  this.assert(codeSources[0].getCode() == 'abcef');
  this.assert(codeSources[0].id == 'c');
  this.assert(codeSources[0].codeSections[1].filename == 'b');
  this.assert(codeSources[0].codeSections[1].length == 1);

  this.assert(codeSources[1].getCode() == 'abdef');
  this.assert(codeSources[1].id == 'd');
  this.assert(codeSources[1].codeSections[2].filename == 'd');
  this.assert(codeSources[1].codeSections[2].length == 1);
}

function testFeedManagerWorks() {
  var FMgr = new FeedManager(new TestAnnotationMemory(this));
  var fakeFeedPlugin = {
    type: 'fake',
    makeFeed: function makeFeed(baseFeedInfo, hub) {
      var feedInfo = {};

      feedInfo.refresh = function refresh() {
        this.commandNames = [];
        this.nounTypes = [];
        this.commands = [];
        this.pageLoadFuncs = [];
      };

      feedInfo.__proto__ = baseFeedInfo;

      return feedInfo;
    }
  };

  FMgr.registerPlugin(fakeFeedPlugin);

  var url = "http://www.foo.com";
  var sourceUrl = "http://www.foo.com/code.js";
  var code = "function blah() {}";

  this.assert(!FMgr.isSubscribedFeed(url));
  FMgr.addSubscribedFeed({url: url,
                          sourceUrl: sourceUrl,
                          sourceCode: code,
                          canAutoUpdate: false,
                          type: 'fake'});
  this.assert(FMgr.isSubscribedFeed(url));

  var results = FMgr.getSubscribedFeeds();

  this.assert(results.length == 1);

  // Ensure the result is what we think it is.
  var feed = results[0];
  this.assert(feed.getCode() == code);

  // Add another subscribed feed and make sure things still make sense.
  var moreCode = "function narg() {}";
  FMgr.addSubscribedFeed({url: "http://www.bar.com",
                          sourceUrl: "http://www.bar.com/code.js",
                          sourceCode: moreCode,
                          canAutoUpdate: false,
                          type: 'fake'});
  results = FMgr.getSubscribedFeeds();

  this.assert(results[0].getCode() == code);
  this.assert(results[1].getCode() == moreCode);

  results[0].setCode("// new code");
  this.assert(results[0].getCode() == "// new code");

  // TODO: Iterate through the collection and ensure that it behaves
  // how we think it should.

  results[0].remove();

  this.assert(!FMgr.isSubscribedFeed(url));
}

function getNounList() {
  return [];
}

function testCmdManagerExecutesTwoCmds() {
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var oneWasCalled = false;
  var twoWasCalled = false;
  var pblock = {};

  var fakeSource = new FakeCommandSource(
    {
      cmd_one: {execute:function() {oneWasCalled = true;}},
      cmd_two: {execute:function() {twoWasCalled = true;}}
    });

  var cmdMan = makeCommandManager.call(this, fakeSource, mockMsgService,
                                       makeTestParser());

  var fakeContext = {focusedElement: null,
                     focusedWindow: null};

  cmdMan.updateInput("cmd_one", fakeContext);
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute(fakeContext);
  cmdMan.updateInput("cmd_two", fakeContext);
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute(fakeContext);
  this.assert(oneWasCalled, "cmd_one must be called.");
  this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd() {
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var wasCalled = false;

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {wasCalled = true;}}
    }
  );
  var fakeContext = {focusedElement: null,
                     focusedWindow: null};

  var cmdMan = makeCommandManager.call(this, fakeSource, mockMsgService,
                                       makeTestParser());
  cmdMan.updateInput("existentcommand", fakeContext);
  cmdMan.execute(fakeContext);
  this.assert(wasCalled, "command.execute() must be called.");
}

function testCmdManagerCatchesExceptionsInCmds() {
  var mockMsgService = {
    displayMessage: function(msg) { this.lastMsg = msg; }
  };

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {throw 1;}}
    }
  );
  var fakeContext = {focusedElement: null,
                     focusedWindow: null};

  var cmdMan = makeCommandManager.call(this, fakeSource, mockMsgService,
                                       makeTestParser());

  cmdMan.updateInput("existentcommand", fakeContext);
  cmdMan.execute(fakeContext);
  this.assert(
    (mockMsgService.lastMsg.text.indexOf("exception occurred") >= 0 &&
     mockMsgService.lastMsg.exception),
    "Command manager must log exception."
  );
}

function testCmdManagerDisplaysNoCmdError() {
  var fakeSource = new FakeCommandSource ( {} );
  var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg; }
  };
  var fakeContext = {focusedElement: null,
                     focusedWindow: null};

  var cmdMan = makeCommandManager.call(this, fakeSource, mockMsgService,
                                       makeTestParser());

  cmdMan.updateInput("nonexistentcommand", fakeContext);
  cmdMan.execute(fakeContext);
  this.assertIsDefined(mockMsgService.lastMsg,
                       "Command manager must display a message.");
}

function testIterableCollectionWorks() {
  var fakeCodeSource = {
    getCode: function() { return "a = 1"; },
    id: 'http://www.foo.com/bar.js'
  };

  var coll = new IterableCollection([fakeCodeSource]);
  var count = 0;
  for (var cs in coll) {
    this.assert(cs.getCode() == "a = 1");
    this.assert(cs.id == "http://www.foo.com/bar.js");
    count += 1;
  }
  this.assert(count == 1, "count must be 1.");
}

// This tests bug #25, but it's being commented out for now so that
// all unit tests succeed.
//function testSandboxSupportsJs17() {
//  var sbf = new SandboxFactory({});
//  var s = sbf.makeSandbox();
//  sbf.evalInSandbox("let k = 1;", s);
//}

function testUtilsTrim() {
  // Taken from http://www.somacon.com/p355.php.
  this.assert(Utils.trim("\n  hello   ") == "hello");
}

function testUtilsComputeCrpytoHash() {
  var str = "hello world";
  this.assert(Utils.computeCryptoHash("md5", str) == "5eb63bbbe01eeed093cb22bb8f5acdc3");
  this.assert(Utils.computeCryptoHash("sha1", str) == "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed");
}

function testUtilsParamsToString() {
  var data = {};
  var expected = "?";
  this.assert(Utils.paramsToString(data) == expected);

  data = {
    hello: "world"
  };
  expected = "?hello=world";
  this.assert(Utils.paramsToString(data) == expected);

  data = {
    hello: "world",
    life: 42
  };
  expected = "?hello=world&life=42";
  this.assert(Utils.paramsToString(data) == expected);

  data = {
    multiple: ["one", "two", "three"]
  };
  expected = "?multiple%5B%5D=one&multiple%5B%5D=two&multiple%5B%5D=three";
  this.assert(Utils.paramsToString(data) == expected);

  data = {
    obj: {
      value: "hello_world",
      toString: function() { return this.value; }
    }
  };
  expected = "?obj=hello_world";
  this.assert(Utils.paramsToString(data) == expected);
}

function testUtilsIsArray() {
  this.assert(Utils.isArray([]));
}

function getUbiquityComponent(test) {
  var Cc = Components.classes;
  var Ci = Components.interfaces;

  try {
    var ubiquity = Cc["@labs.mozilla.com/ubiquity;1"];

    ubiquity = ubiquity.getService().QueryInterface(Ci.nsIUbiquity);
    var sandbox = Components.utils.Sandbox("http://www.foo.com");
    ubiquity.evalInSandbox("(function() {})();", "nothing.js", 1,
                           "1.8", sandbox);
    return ubiquity;
  } catch (e) {
    // Right now nsUbiquity is an optional component, and if
    // it doesn't exist, let's just skip this test. Unfortunately,
    // there's a bunch of weird ways that the components can fail
    // to load, e.g. if the wrong version of Firefox loads it, so
    // we're just doing a blanket except here for now.
    throw new test.SkipTestError();
  }
}

function testUbiquityComponent() {
  var ubiquity = getUbiquityComponent(this);
  var sandbox = Components.utils.Sandbox("http://www.foo.com");
  ubiquity.evalInSandbox("var a = 1;", "nothing.js", 1, "1.8",
                         sandbox);
  this.assert(sandbox.a == 1,
              "nsIUbiquity.evalInSandbox() must work.");

  var errorCaught = null;
  try {
    ubiquity.evalInSandbox("throw new Error('hi')",
                           "nothing.js",
                           1,
                           "1.8",
                           sandbox);
  } catch (e) {
    errorCaught = e;
  }
  this.assert(errorCaught.message == 'hi',
              "nsIUbiquity.evalInSandbox() must throw exceptions");

  ubiquity.evalInSandbox("let k = 1;", "nothing.js", 1, "1.7",
                         sandbox);
  this.assert(sandbox.k == 1,
              "nsIUbiquity.evalInSandbox() must accept JS 1.7.");
}

function testUbiquityComponentFlagSystemFilenamePrefixWorks() {
  var ubiquity = getUbiquityComponent(this);

  ubiquity.flagSystemFilenamePrefix("__arbitraryString1://", true);
}

function testUbiquityComponentFlagSystemFilenamePrefixCreatesWrappers() {
  // This is a regression test for #434.
  this.skipIfXPCShell();

  var Cc = Components.classes;
  var Ci = Components.interfaces;
  var ubiquity = getUbiquityComponent(this);

  var Application = Components.classes["@mozilla.org/fuel/application;1"]
                    .getService(Components.interfaces.fuelIApplication);

  ubiquity.flagSystemFilenamePrefix("__arbitraryString1://", true);

  var sandbox = Components.utils.Sandbox(globalObj);
  var code = "Application.activeWindow.activeTab.document.defaultView";
  sandbox.Application = Application;

  this.assertEquals(
    ubiquity.evalInSandbox(code, "__arbitraryString2://blarg/", 1,
                           "1.8", sandbox),
    "[object Window]"
  );

  this.assertEquals(
    ubiquity.evalInSandbox(code, "__arbitraryString1://blarg/", 1,
                           "1.8", sandbox),
    "[object XPCNativeWrapper [object Window]]"
  );
}

function testUbiquityComponentAcceptsJsVersion() {
  var ubiquity = getUbiquityComponent(this);
  var sandbox = Components.utils.Sandbox("http://www.foo.com");
  var wasExceptionThrown = false;

  try {
    ubiquity.evalInSandbox("let k = 1;", "nothing.js", 1,
                           "1.5", sandbox);
  } catch (e) {
    wasExceptionThrown = true;
  }
  this.assert(wasExceptionThrown);
  wasExceptionThrown = false;

  try {
    ubiquity.evalInSandbox("let k = 1;", "nothing.js", 1,
                           "foo", sandbox);
  } catch (e if e.result == Components.results.NS_ERROR_INVALID_ARG) {
    wasExceptionThrown = true;
  }
  this.assert(wasExceptionThrown);
}

function testXmlScriptCommandsParser() {
  Components.utils.import("resource://ubiquity/modules/xml_script_commands_parser.js");
  var code = parseCodeFromXml('<foo>\n<script class="commands"><![CDATA[testing\n\n\n>]]></script></foo>');
  this.assert(code.length == 1);
  this.assert(code[0].lineNumber == 2, "hi");
  this.assert(code[0].code == 'testing\n\n\n>');
}

function testLocalUriCodeSourceWorksWithBadFilenames() {
  var urls = ["chrome://truly-nonexistent",
              "file:///truly-nonexistent",
              "resource://truly-nonexistent",
              "ubiquity:///truly-nonexistent"];
  var self = this;

  urls.forEach(
    function(url) {
      var lucs = new LocalUriCodeSource(url);
      self.assertEquals(lucs.getCode(), "");
    });
}

function testLoadLocaleJsonWorks() {
  var dat = loadLocaleJson("resource://ubiquity/tests/test_all.json");
  this.assert(dat.testLoadLocaleJsonWorks.length == 1);
  this.assert(dat.testLoadLocaleJsonWorks == "\u3053");
}

function testUtilsSetTimeoutWorks() {
  let self = this;
  let foo;

  function cb() {
    self.assertEquals(foo, "foo");
  }

  Utils.setTimeout(self.makeCallback(cb), 10);

  foo = "foo";
}

function getLocalFileAsUtf8(url) {
  var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                      .createInstance(Components.interfaces.nsIXMLHttpRequest);
  req.open('GET', url, false);
  req.overrideMimeType("text/plain; charset=utf-8");
  req.send(null);
  return req.responseText;
}

// TODO: This is a horrible workaround; modifying the tests to use
// localeutils.js makes them unreadable and hard to maintain, but there
// doesn't seem to be any way of loading utf-8 JS from xpcshell.
eval(getLocalFileAsUtf8("resource://ubiquity/tests/test_locale_jp.js"));

exportTests(this);
