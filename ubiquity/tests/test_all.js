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

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/nounutils.js");
Components.utils.import("resource://ubiquity-modules/sandboxfactory.js");
Components.utils.import("resource://ubiquity-modules/codesource.js");
Components.utils.import("resource://ubiquity-modules/parser/parser.js");
Components.utils.import("resource://ubiquity-modules/parser/locale_en.js");
Components.utils.import("resource://ubiquity-modules/linkrel_codesvc.js");
Components.utils.import("resource://ubiquity-modules/cmdmanager.js");
Components.utils.import("resource://ubiquity-modules/cmdsource.js");
Components.utils.import("resource://ubiquity-modules/localeutils.js");
Components.utils.import("resource://ubiquity-modules/collection.js");

Components.utils.import("resource://ubiquity-tests/framework.js");
Components.utils.import("resource://ubiquity-tests/test_safebox.js");
Components.utils.import("resource://ubiquity-tests/test_eventhub.js");
Components.utils.import("resource://ubiquity-tests/test_suggestion_memory.js");

var globalObj = this;
const LANG = "en";

function FakeAnnSvc() {
  var ann = {};
  var urls = {};

  var self = this;
  var observer;

  self.addObserver = function(anObserver) {
    if (observer)
      throw new Error("Don't know how to deal w/ multiple observers.");
    observer = anObserver;
  };

  self.getPagesWithAnnotation = function(name) {
    var results = [];
    for (uri in ann)
      if (typeof(ann[uri][name]) != 'undefined')
        results.push(urls[uri]);
    return results;
  };

  self.pageHasAnnotation = function(uri, name) {
    if (ann[uri.spec] &&
        typeof(ann[uri.spec][name]) != 'undefined')
      return true;
    return false;
  };

  self.getPageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    return ann[uri.spec][name];
  };

  self.setPageAnnotation = function(uri, name, value, dummy,
                                    expiration) {
    if (!ann[uri.spec]) {
      ann[uri.spec] = new Object();
      urls[uri.spec] = uri;
    }
    ann[uri.spec][name] = value;
    observer.onPageAnnotationSet(uri, name);
  };

  self.removePageAnnotation = function(uri, name) {
    if (!self.pageHasAnnotation(uri, name))
      throw Error('No such annotation');
    delete ann[uri.spec][name];
    observer.onPageAnnotationRemoved(uri, name);
  };

  self.EXPIRE_NEVER = 0;
}

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

function testMixedCodeSourceCollectionWorks() {
  let a = new StringCodeSource('a', 'a');
  let b = new StringCodeSource('b', 'b');
  let c = new StringCodeSource('c', 'c');
  let d = new StringCodeSource('d', 'd');
  let e = new StringCodeSource('e', 'e');
  let f = new StringCodeSource('f', 'f');

  let mixed = new MixedCodeSourceCollection(
    new IterableCollection([a, b]),
    new IterableCollection([c, d]),
    new IterableCollection([e, f])
    );

  let codeSources = [];
  for (cs in mixed) {
    codeSources.push(cs);
  }

  this.assert(codeSources[0].getCode() == 'abcef');
  this.assert(codeSources[0].id == 'c');
  this.assert(codeSources[0].codeSections[1].filename == 'b');
  this.assert(codeSources[0].codeSections[1].length == 1);

  this.assert(codeSources[1].getCode() == 'abdef');
  this.assert(codeSources[1].id == 'd');
  this.assert(codeSources[1].codeSections[2].filename == 'd');
  this.assert(codeSources[1].codeSections[2].length == 1);
}

function testLinkRelCodeServiceWorks() {
  var LRCS = new LinkRelCodeService(new FakeAnnSvc());
  var url = "http://www.foo.com";
  var code = "function blah() {}";

  this.assert(!LRCS.isMarkedPage(url));
  LRCS.addMarkedPage({url: url,
                      sourceCode: code,
                      canUpdate: false});
  this.assert(LRCS.isMarkedPage(url));

  var results = LRCS.getMarkedPages();

  this.assert(results.length == 1);

  // Ensure the result is what we think it is.
  var page = results[0];
  this.assert(page.getCode() == code);

  // Add another marked page and make sure things still make sense.
  var moreCode = "function narg() {}";
  LRCS.addMarkedPage({url: "http://www.bar.com",
                      sourceCode: moreCode,
                      canUpdate: false});
  results = LRCS.getMarkedPages();

  this.assert(results[0].getCode() == code);
  this.assert(results[1].getCode() == moreCode);

  // TODO: Iterate through the collection and ensure that it behaves
  // how we think it should.

  results[0].remove();

  this.assert(!LRCS.isMarkedPage(url));
}

function FakeCommandSource( cmdList ) {
  this._cmdList = cmdList;
  for ( var x in cmdList ) {
    this._cmdList[x].name = x;
  }
}
FakeCommandSource.prototype = {
  getCommand: function(name) {
    return this._cmdList[name];
  },
  getAllCommands: function(name) {
    return this._cmdList;
  },
  getAllNounTypes: function() {
    return [];
  },
  refresh: function() {
  }
};

function getNounList() {
  return [];
}

function getCompletions( input, verbs, nountypes, context ) {
  if (!context)
    context = { textSelection: "", htmlSelection: "" };

  var fakeContextUtils = {
    getHtmlSelection: function() { return context.htmlSelection; },
    getSelection: function() { return context.textSelection; }
  };

  var parser = makeTestParser( LANG,
			       verbs,
			       nountypes,
                               fakeContextUtils,
                               new TestSuggestionMemory() );
  parser.updateSuggestionList( input, context );
  return parser.getSuggestionList();
}

function makeTestParser(lang, verbs, nouns, contextUtils) {
  lang = lang ? lang : LANG;
  verbs = verbs ? verbs : [];
  nouns = nouns ? nouns : [];

  if (!contextUtils)
    contextUtils = {
      getHtmlSelection: function() { return ""; },
      getSelection: function() { return ""; }
    };

  return NLParser.makeParserForLanguage(lang, verbs, nouns, contextUtils,
                                        new TestSuggestionMemory());
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

  var cmdMan = new CommandManager(fakeSource, mockMsgService,
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

  var cmdMan = new CommandManager(fakeSource, mockMsgService,
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

  var cmdMan = new CommandManager(fakeSource, mockMsgService,
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

  var cmdMan = new CommandManager(fakeSource, mockMsgService, makeTestParser());

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

function testCommandSourcePageLoadFuncsWork() {
  var testCode = "pageLoadFuncs = [function(window) {window.called = true;}];";
  var testCodeSource = {
    getCode : function() { return testCode; },
    id: 'test'
  };

  var cmdSrc = new CommandSource(testCodeSource, undefined,
                                 new SandboxFactory({}, globalObj));

  var window = {called: false};
  cmdSrc.onPageLoad(window);
  this.assertEquals(window.called, true);
}

function testCommandSourceOneCmdWorks() {
  var testCode = "function cmd_foo_thing() { return 5; }";
  var testCodeSource = {
    getCode : function() { return testCode; },
    id: 'test'
  };

  var cmdSrc = new CommandSource(testCodeSource, undefined,
                                 new SandboxFactory({}, globalObj));
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");
  for(name in cmdSrc.commandNames) {
    dump("command: " + name + "\n");
  }
  var cmd = cmdSrc.getCommand("foo-thing");
  this.assert(cmd, "Sample command should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command should execute properly.");
}

function testCommandSourceTwoCodeSourcesWork() {
  var testCode1 = "a=5;function cmd_foo() { return a; }\n";
  var testCode2 = "a=6;function cmd_bar() { return a; }\n";

  var testCodeSource1 = {
    getCode : function() { return testCode1; },
    id: 'source1'
  };

  var testCodeSource2 = {
    getCode : function() { return testCode2; },
    id: 'source2'
  };

  var cmdSrc = new CommandSource([testCodeSource1,
                                  testCodeSource2],
                                undefined,
                                new SandboxFactory({}, globalObj));
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd, "Sample command 'foo' should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command 'foo' should execute properly.");

  cmd = cmdSrc.getCommand("bar");
  this.assert(cmd, "Sample command 'bar' should exist.");
  this.assert(cmd.execute() == 6,
              "Sample command 'bar' should execute properly.");
}

function testCommandSourceCatchesExceptionsWhenLoading() {
  var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg; }
  };

  var testCodeSource = {
    getCode : function() { return "awegaewg"; },
    id: "test"
  };

  var cmdSrc = new CommandSource(testCodeSource, mockMsgService,
                                 new SandboxFactory({}, globalObj));
  cmdSrc.getCommand("existentcommand");

  this.assert(
    (mockMsgService.lastMsg.text.indexOf("exception occurred") >= 0 &&
     mockMsgService.lastMsg.exception),
    "Command source must log exception."
  );
}

function testCommandSourceTwoCmdsWork() {
  var testCode = ("function cmd_foo() { return 5; }\n" +
                  "function cmd_bar() { return 6; }\n");

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var cmdSrc = new CommandSource(testCodeSource, undefined,
                                 new SandboxFactory({}, globalObj));
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd, "Sample command 'foo' should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command 'foo' should execute properly.");

  cmd = cmdSrc.getCommand("bar");
  this.assert(cmd, "Sample command 'bar' should exist.");
  this.assert(cmd.execute() == 6,
              "Sample command 'bar' should execute properly.");
}

function testCommandNonGlobalsAreResetBetweenInvocations() {
  var testCode = ( "x = 1; function cmd_foo() { return x++; }" );

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var cmdSrc = new CommandSource(testCodeSource, undefined,
                                 new SandboxFactory({}, globalObj));

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  // Change the code returned from the code source so we're
  // guaranteed to rebuild the context.
  testCode += "/* trivial code change */";
  cmdSrc.refresh();

  cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on second call.");
}

function testMakeGlobalsWork() {
  function makeGlobals(codeSource) {
    return {id: codeSource.id};
  }

  var testCode = "function cmd_foo() { return id; }";

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var sandboxFactory = new SandboxFactory(makeGlobals, globalObj);

  var cmdSrc = new CommandSource(testCodeSource, undefined, sandboxFactory);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == "test",
              "Command 'foo' should return 'test'.");
}

function testCommandGlobalsWork() {
  var testCode = ( "function cmd_foo() { " +
                   "  if (globals.x) " +
                   "    return ++globals.x; " +
                   "  globals.x = 1; " +
                   "  return globals.x; " +
                   "}" );

  var testCodeSource = {
    getCode : function() { return testCode; },
    id: "test"
  };

  var sandboxFactory = new SandboxFactory({globals: {}}, globalObj);

  var cmdSrc = new CommandSource(testCodeSource, undefined, sandboxFactory);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 2,
              "Command 'foo' should return 2 on second call.");
}

// This tests bug #25, but it's being commented out for now so that
// all unit tests succeed.
//function testSandboxSupportsJs17() {
//  var sbf = new SandboxFactory({});
//  var s = sbf.makeSandbox();
//  sbf.evalInSandbox("let k = 1;", s);
//}

function testParseDirectOnly() {
  var dogGotPetted = false;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var cmd_pet = {
    execute: function(context, directObject, modifiers) {
      dogGotPetted = directObject.text;
    },
    name: "pet",
    DOLabel: "kind of dog",
    DOType: dog,
    modifiers: {}
  };

  var completions = getCompletions( "pet b", [cmd_pet], [dog], null );
  this.assert( completions.length == 2, "should be 2 completions" );
  this.assert( completions[0]._verb._name == "pet", "verb should be pet");
  this.assert( completions[0]._argSuggs.direct_object.text == "beagle",
	       "obj should be beagle");
  this.assert( completions[1]._verb._name == "pet", "verb should be pet");
  this.assert( completions[1]._argSuggs.direct_object.text == "bulldog",
	       "obj should be bulldog");
  completions[0].execute();
  this.assert( dogGotPetted == "beagle");
  completions[1].execute();
  this.assert( dogGotPetted == "bulldog" );
}

function testParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
				"beagle", "bulldog", "husky"]);
  var washingObj = new NounUtils.NounType( "washing object",
					  ["sponge", "hose", "spork",
					  "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, directObject, modifiers) {
      dogGotWashed = directObject.text;
      dogGotWashedWith = modifiers["with"].text;
    },
    name:"wash",
    DOLabel:"kind of dog",
    DOType: dog,
    modifiers: {"with": washingObj}
  };

  var inputWords = "wash pood with sp";
  var completions = getCompletions( inputWords, [cmd_wash],
				    [dog, washingObj], null);
  this.assert( completions.length == 2, "Should be 2 completions" );
  this.assert( completions[0]._verb._name == "wash");
  this.assert( completions[0]._argSuggs.direct_object.text == "poodle");
  this.assert( completions[0]._argSuggs.with.text == "sponge");
  this.assert( completions[1]._verb._name == "wash");
  this.assert( completions[1]._argSuggs.direct_object.text == "poodle");
  this.assert( completions[1]._argSuggs.with.text == "spork");
  completions[0].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "sponge");
  completions[1].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "spork");
}

// TODO: Re-enable when we fix #343
function DISABLED_testCmdManagerSuggestsForEmptyInput() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = new NounUtils.NounType( "thingType", ["tree"] );
  var nounTypeTwo = new NounUtils.NounType( "stuffType", ["mud"] );
  var fakeSource = new FakeCommandSource(
  {
    cmd_one: {execute:function(context, directObj) {
		oneWasCalled = directObj.text;
	      },
              DOLabel:"thing",
	      DOType:nounTypeOne},
    cmd_two: {execute:function(context, directObj) {
		twoWasCalled = directObj.text;
	      },
	      DOLabel:"stuff",
	      DOType:nounTypeTwo}
  });
  fakeSource.getAllNounTypes = function() {
    return [nounTypeOne, nounTypeTwo];
  };
  var cmdMan = new CommandManager(fakeSource, null, LANG);
  var getAC = cmdMan.makeCommandSuggester();
  var suggDict = getAC({textSelection:"tree"});
  this.assert( suggDict["Cmd_one"], "cmd one should be in" );
  this.assert( !suggDict["Cmd_two"], "cmd two should be out" );
  var execute = suggDict["Cmd_one"];
  execute();
  this.assert( oneWasCalled == "tree", "should have been calld with tree" );
  suggDict = getAC({textSelection:"mud"});
  this.assert( !suggDict["Cmd_one"], "cmd one should be out" );
  this.assert( suggDict["Cmd_two"], "cmd two should be in" );
  execute = suggDict["Cmd_two"];
  execute();
  this.assert( twoWasCalled == "mud", "should have been called with mud" );
}

function testVerbEatsSelection() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new NounUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new NounUtils.NounType( "place", ["grill", "diner", "home"]);
  var cmd_eat = {
    name: "eat",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	foodGotEaten = directObject.text;
      if (modifiers["at"].text)
	foodGotEatenAt = modifiers["at"].text;
    },
    DOLabel:"food",
    DOType: food,
    modifiers: {"at": place}
  };
  var fakeContext = { textSelection: "lunch", htmlSelection:"lunch" };
  var completions = getCompletions("eat this", [cmd_eat], [food, place],
				   fakeContext);
  this.assert( completions.length == 1,
               "Should be one completion for 'eat this'" );
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "obj should be lunch");
  this.assert(foodGotEatenAt == null, "should be no modifier");

  fakeContext.textSelection = "grill";
  fakeContext.htmlSelection = "grill";
  completions = getCompletions("eat breakfast at it", [cmd_eat], [food, place],
			       fakeContext);
  this.assert( completions.length == 1, "should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "breakfast", "food should be breakfast");
  this.assert(foodGotEatenAt == "grill", "place should be grill");

  fakeContext.textSelection = "din";
  fakeContext.htmlSelection = "din";
  completions = getCompletions("eat at home this", [cmd_eat], [food, place],
			       fakeContext);
  this.assert( completions.length == 1, "second should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "dinner", "food should be dinner");
  this.assert(foodGotEatenAt == "home", "place should be home");
}

function testImplicitPronoun() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new NounUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new NounUtils.NounType( "place", ["grill", "diner", "home"]);
  var cmd_eat = {
    name: "eat",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	foodGotEaten = directObject.text;
      if (modifiers["at"].text)
	foodGotEatenAt = modifiers["at"].text;
    },
    DOLabel:"food",
    DOType: food,
    modifiers: {"at": place}
  };
  var fakeContext = { textSelection: "lunch", htmlSelection:"lunch" };

  var completions = getCompletions("eat", [cmd_eat], [food, place],
				   fakeContext);
  this.assert( (completions.length == 1), "Should have 1 completion.");
  completions[0].execute();
  this.assert((foodGotEaten == "lunch"), "DirectObj should have been lunch.");
  this.assert((foodGotEatenAt == null), "Indirectobj should not be set.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "din";
  completions = getCompletions("eat", [cmd_eat], [food, place],
			       fakeContext);

  this.assert( completions.length == 2, "Should have 3 completions.");
  // first completion should be directObject is dinner
  completions[0].execute();
  this.assert((foodGotEaten == "dinner"), "DO should have been dinner.");
  this.assert((foodGotEatenAt == null), "IndirectObjs shouldn't be set.");
  foodGotEaten = null;
  foodGotEatenAt = null;
  // second completion should be direct object null, place is diner
  completions[1].execute();
  this.assert((foodGotEaten == null), "DO should be null.");
  this.assert((foodGotEatenAt == "diner"), "Place should be diner.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "din";
  fakeContext.htmlSelection = "din";
  completions = getCompletions("eat lunch at selection", [cmd_eat],
			       [food, place], fakeContext);
  this.assert( completions.length == 1, "Sould have 1 completion");
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "Should have eaten lunch");
  this.assert(foodGotEatenAt == "diner", "Should have eaten it at diner");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "din";
  fakeContext.htmlSelection = "din";
  completions = getCompletions("eat at grill", [cmd_eat], [food, place],
			       fakeContext);
  this.assert( completions.length == 1, "Should have 1 completion");
  completions[0].execute();
  this.assert((foodGotEaten == "dinner"), "DO should be dinner.");
  this.assert((foodGotEatenAt == "grill"), "ate at grill.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "pants";
  fakeContext.htmlSelection = "pants";
  completions = getCompletions("eat lunch at selection", [cmd_eat], [food, place],
			       fakeContext);

  // This now gets an empty list, but I'm not sure that's wrong, given the
  // new behavior, since there is no valid way to use the "at selection"
  // argument...
  // TODO FAILURE RIGHT HERE EMPTY SUGGESTION LIST!!!!
  /*debugSuggestionList(completions);
  this.assert( completions.length == 1, "Should have 1 completion(D)");
  completions[0].execute();
  this.assert((foodGotEaten == null), "Should have no valid args.");
  this.assert((foodGotEatenAt == null), "Should have no valid args.");
  */

  fakeContext.textSelection = null;
  fakeContext.htmlSelection = null;
  completions = getCompletions("eat this", [cmd_eat], [food, place],
			       fakeContext);
  this.assert( completions.length == 0, "should have no completions");
}

function testMakeSugg() {
  // test that NounUtils.makeSugg doesn't fail on null input, that it preserves
  // html, etc etc.
  /*var thingy = NounUtils.makeSugg(null, "alksdf");
  this.assert( thingy.text == "alksdf", "thingy.text should be set.");*/
  // test above can't be run from the command line as there is no
  // context.focusedWindow, needed for getTextFromHtml.

  var thingy2 = NounUtils.makeSugg(null, null, null);
  this.assert( thingy2 == null, "should return null");
}

function testModifiersTakeMultipleWords() {
  var wishFound = null;
  var wishFoundIn = null;
  var wish = new NounUtils.NounType( "wish", ["apartment", "significant other", "job"]);
  var city = new NounUtils.NounType( "city", ["chicago",
					     "new york",
					     "los angeles",
					     "san francisco"]);
  var cmd_find = {
    name: "find",
    execute: function(context, directObject, modifiers) {
      if (directObject.text)
	wishFound = directObject.text;
      if (modifiers["in"].text)
	wishFoundIn = modifiers["in"].text;
    },
    DOLabel:"wish",
    DOType: wish,
    modifiers: {"in": city}
  };
  var completions = getCompletions("find job in chicago", [cmd_find],
				   [wish, city], null);
  this.assert(completions[0]._argSuggs.direct_object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");

  completions = getCompletions("find significant other in chicago",
				     [cmd_find], [wish, city], null);
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");
  this.assert(completions[0]._argSuggs.direct_object.text == "significant other", "should be SO.");

  completions = getCompletions("find job in new york", [cmd_find],
			       [wish, city], null);
  this.assert(completions[0]._argSuggs.direct_object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "new york", "should be NY");
}

function testSuggestionMemory() {
  var suggMem1 = new TestSuggestionMemory();
  suggMem1.remember( "p", "peas");
  suggMem1.remember( "p", "peas");
  suggMem1.remember( "q", "quinine");
  suggMem1.remember( "q", "quetzalcoatl");
  suggMem1.remember( "p", "polymascotfoamulate");
  suggMem1.remember( "q", "quinine");

  this.assert(suggMem1.getScore("q", "quinine") == 2);
  this.assert(suggMem1.getScore("q", "quetzalcoatl") == 1);
  this.assert(suggMem1.getScore( "q", "peas") == 0 );
  this.assert(suggMem1.getScore( "q", "qualifier") == 0);
  this.assert(suggMem1.getScore( "p", "peas") == 2);
  this.assert(suggMem1.getScore( "p", "polymascotfoamulate") == 1);
  this.assert(suggMem1.getScore( "p", "popcorn" ) == 0 );
  this.assert(suggMem1.getScore( "p", "quinine" ) == 0 );

  // Get rid of the first suggestion memory object, make a new one:
  suggMem1 = null;
  var suggMem2 = new TestSuggestionMemory();
  // Should have all the same values.
  this.assert(suggMem2.getScore("q", "quinine") == 2);
  this.assert(suggMem2.getScore("q", "quetzalcoatl") == 1);
  this.assert(suggMem2.getScore( "q", "peas") == 0 );
  this.assert(suggMem2.getScore( "q", "qualifier") == 0);
  this.assert(suggMem2.getScore( "p", "peas") == 2);
  this.assert(suggMem2.getScore( "p", "polymascotfoamulate") == 1);
  this.assert(suggMem2.getScore( "p", "popcorn" ) == 0 );
  this.assert(suggMem2.getScore( "p", "quinine" ) == 0 );

  // Now test the getTopRanked function:
  var topRankedQ = suggMem2.getTopRanked("q", 5);
  this.assert(topRankedQ.length == 2, "length of q should be two");
  this.assert(topRankedQ[0] == "quinine");
  this.assert(topRankedQ[1] == "quetzalcoatl");

  var topRankedP = suggMem2.getTopRanked("p", 5);
  this.assert(topRankedP.length == 2, "length of p should be two");
  this.assert(topRankedP[0] == "peas");
  this.assert(topRankedP[1] == "polymascotfoamulate");

}

function testSortedBySuggestionMemory() {
  var nounList = [];
  var verbList = [{name: "clock", execute: function(){}},
		  {name: "calendar", execute: function(){}},
		  {name: "couch", execute: function(){}},
		  {name: "conch", execute: function(){}},
		  {name: "crouch", execute: function(){}},
		  {name: "coelecanth", execute: function(){}},
		  {name: "crab", execute: function(){}} ];
  var nlParser = makeTestParser(LANG, verbList, nounList);
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList("c", fakeContext);
  var suggestions = nlParser.getSuggestionList();
  //take the fifth and sixth suggestions, whatever they are...
  var suggFive = suggestions[4];
  var suggFiveName = suggFive._verb._name;
  var suggSix = suggestions[5];
  var suggSixName = suggSix._verb._name;
  // tell the parser we like sugg five and REALLY like sugg six:
  // TODO replace these strengthenMemory calls with execute() calls!
  nlParser.strengthenMemory("c", suggFive);
  nlParser.strengthenMemory("c", suggSix);
  nlParser.strengthenMemory("c", suggSix);

  // now give the same input again...
  nlParser.updateSuggestionList("c", fakeContext);
  suggestions = nlParser.getSuggestionList();
  // the old six should be on top, with the old five in second place:
  this.assert(suggestions[0]._verb._name == suggSixName, "Six should be one");
  this.assert(suggestions[1]._verb._name == suggFiveName, "Five should be two");
}

function testNounFirstSortedByGeneralFrequency() {
  // Noun-first suggestions should be ranked by how often the verb has
  // been chosen before, *regardless of input*.
}

function testSortedByMatchQuality() {
  var nounList = [];
  var verbList = [{name: "frobnicate"},
		  {name: "glurgle"},
		  {name: "nonihilf"},
		  {name: "bnurgle"},
		  {name: "fangoriously"}];
  var nlParser = makeTestParser(LANG, verbList, nounList);
  var fakeContext = {textSelection:"", htmlSelection:""};

  var assert = this.assert;
  function testSortedSuggestions( input, expectedList ) {
    nlParser.updateSuggestionList( input, fakeContext );
    var suggs = nlParser.getSuggestionList();
    assert( suggs.length == expectedList.length, "Should have " + expectedList.length + " suggestions.");
    for (var x in suggs) {
      assert( suggs[x]._verb._name == expectedList[x], expectedList[x] + " should be " + x);
    }
  }
  testSortedSuggestions( "g", ["glurgle", "bnurgle", "fangoriously"]);
  testSortedSuggestions( "n", ["nonihilf", "bnurgle", "frobnicate", "fangoriously"]);
  testSortedSuggestions( "ni", ["nonihilf", "frobnicate"]);
  testSortedSuggestions( "bn", ["bnurgle", "frobnicate"]);
  testSortedSuggestions( "f", ["frobnicate", "fangoriously", "nonihilf"]);
  testSortedSuggestions( "frob", ["frobnicate"]);
  testSortedSuggestions( "urgle", ["glurgle", "bnurgle"]);

  verbList = [{name: "google"},
	      {name: "tag"},
	      {name: "digg"},
	      {name: "bugzilla"},
	      {name: "get-email-address"},
	      {name: "highlight"}];
  nlParser.setCommandList( verbList );
  testSortedSuggestions( "g", ["google", "get-email-address", "tag", "digg", "bugzilla", "highlight"]);
}

// TODO: Re-enable when we fix #343
function DISABLED_testSortSpecificNounsBeforeArbText() {
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var arb_text = {
    _name: "text",
    rankLast: true,
    suggest: function( text, html ) {
      return [ NounUtils.makeSugg(text, html) ];
    }
  };

  var verbList = [{name: "mumble", DOType: arb_text, DOLabel:"stuff"},
                  {name: "wash", DOType: dog, DOLabel: "dog"}];

  var nlParser = makeTestParser(LANG, verbList, [arb_text, dog]);

  var fakeContext = {textSelection:"beagle", htmlSelection:"beagle"};
  var selObj = NLParser.getSelectionObject( fakeContext );
  nlParser.updateSuggestionList( "", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 2, "Should be two suggestions.");
  this.assert( suggs[0]._verb._name == "wash", "First suggestion should be wash");
  this.assert( suggs[1]._verb._name == "mumble", "Second suggestion should be mumble");
}

function testVerbUsesDefaultIfNoArgProvided() {
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  dog.default = function() {
    return NounUtils.makeSugg( "husky" );
  };
  var verbList = [{name:"wash", DOType: dog, DOLabel: "dog"},
		  {name:"play-fetch", DOType: dog, DOLabel: "dog", DODefault: "basenji"}];
  var nlParser = makeTestParser(LANG, verbList, [dog]);
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList( "wash", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion (A).");
  this.assert( suggs[0]._verb._name == "wash", "Suggestion should be wash\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "husky", "Argument should be husky.\n");

  nlParser.updateSuggestionList( "play", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion (B).");
  this.assert( suggs[0]._verb._name == "play-fetch", "Suggestion should be play-fetch\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "basenji", "Argument should be basenji.\n");

  nlParser.updateSuggestionList( "play retr", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 suggestion (C).");
  this.assert( suggs[0]._verb._name == "play-fetch", "Suggestion should be play-fetch\n");
  this.assert( suggs[0]._argSuggs.direct_object.text == "golden retreiver", "Argument should be g.retr.\n");

  //TODO try out defaults for modifier arguments.
}

function testSynonyms() {
  var verbList = [{name: "twiddle", synonyms: ["frobnitz", "twirl"]},
		  {name: "frobnitz"},
		  {name: "frobnicate"}];
  var nlParser = makeTestParser(LANG, verbList, []);
  var fakeContext = {textSelection:"", htmlSelection:""};
  nlParser.updateSuggestionList( "frob", fakeContext );
  var suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 3, "Should be 3 suggs.");
  this.assert( suggs[0]._verb._name == "frobnitz", "frobnitz should be first");
  this.assert( suggs[1]._verb._name == "frobnicate", "frobnicate should be second");
  this.assert( suggs[2]._verb._name == "twiddle", "twiddle should be third");

  nlParser.updateSuggestionList( "twid", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 sugg.");
  this.assert( suggs[0]._verb._name == "twiddle", "twiddle should be it");

  nlParser.updateSuggestionList( "twirl", fakeContext );
  suggs = nlParser.getSuggestionList();
  this.assert( suggs.length == 1, "Should be 1 sugg.");
  this.assert( suggs[0]._verb._name == "twiddle", "twiddle should be it");
}

function testPartiallyParsedSentence() {

  // make sure it also works with a no-arg command:
  var cmd_grumble = {
    name: "grumble",
    execute: function(context, directObject, modifiers) {
    }
  };
  var verbNoArgs = new NLParser.Verb(cmd_grumble);
  var partiallyParsedNoArgs = new NLParser.PartiallyParsedSentence(
    verbNoArgs,
    {},
    selObj,
    0,
    NLParser.getPluginForLanguage(LANG)
    );

  var parsedNoArgs  = partiallyParsedNoArgs.getParsedSentences();
  this.assert( parsedNoArgs.length == 1, "Should have 1 parsing.");
  this.assert( parsedNoArgs[0]._verb._name == "grumble");


  var noun_type_foo = {
    _name: "foo",
    suggest: function( text, html ) {
      return [ NounUtils.makeSugg("foo_a"), NounUtils.makeSugg("foo_b") ];
    }
  };
  var noun_type_bar = {
    _name: "bar",
    suggest: function( text, html ) {
      return [ NounUtils.makeSugg("bar_a"), NounUtils.makeSugg("bar_b") ];
    }
  };
  var noun_type_baz = {
    _name: "baz",
    suggest: function( text, html ) {
      return [];
    }
  };

  var verb = new NLParser.Verb({
				   name: "frobnitz",
				   arguments: {
				     fooArg: {
				       type: noun_type_foo,
				       label: "the foo",
				       flag: "from"
				     },
				     barArg: {
				       type: noun_type_bar,
				       label: "the bar",
				       flag: "by"
				     },
				     bazArg: {
				       type: noun_type_baz,
				       label: "the baz",
				       flag: "before",
				       "default": "super pants"
				     }
				   }
				 });

  var argStrings = {fooArg: ["nonihilf"],
		    barArg: ["rocinante"] };
  // bazArg purposefully left out -- partiallyParsedSentence must be tolerant
  // of missing args.

  var selObj = {
    text: "", html: ""
  };
  var partiallyParsed = new NLParser.PartiallyParsedSentence(
    verb,
    argStrings,
    selObj,
    0,
    NLParser.getPluginForLanguage(LANG)
    );

  var parsed  = partiallyParsed.getParsedSentences();
  // two suggestions for foo, two suggestions for bar: should be four
  // combinations.
  this.assert( parsed.length == 4, "Should be four parsings.");

  // Add another suggestion for bar.  Now there should be six combinations.
  partiallyParsed.addArgumentSuggestion( "barArg",
					 NounUtils.makeSugg("bar_c"));
  parsed  = partiallyParsed.getParsedSentences();
  this.assert( parsed.length == 6, "Should be six (not eight) parsings.");

  // All six should have the default for bazArg since we dind't provide any
  for each (var p in parsed)
    this.assert( p.getArgText('bazArg') == "super pants", "must use default.");

  // Now provide an actual argument for baz:
  partiallyParsed.addArgumentSuggestion( "bazArg",
				         NounUtils.makeSugg("baz_a"));
  parsed  = partiallyParsed.getParsedSentences();
  // Should still have six
  this.assert( parsed.length == 6, "Should be six (not eight) parsings.");

  // All six should have the new value for bazArg.
  for each (var p in parsed)
    this.assert( p.getArgText('bazArg') == "baz_a", "should be baz_a.");

}


function testVerbGetCompletions() {
  var grumbleCalled = false;
  var cmd_grumble = {
    name: "grumble",
    execute: function(context, directObject, modifiers) {
      grumbleCalled = true;
    }
  };
  var comps = getCompletions( "grum", [cmd_grumble], [], null);
  this.assert( comps.length == 1, "Should be one suggestion." );
  this.assert( comps[0]._verb._name == "grumble", "Should be grumble.");
}

// TODO: Re-enable when we fix #343
function DISABLED_testTextAndHtmlDifferent() {
  var executedText = null;
  var executedHtml = null;
  var fakeContext = {
    textSelection: "Pants", htmlSelection:"<blink>Pants</blink>"
  };
  var noun_type_different = {
    _name: "different",
    suggest: function( text, html ) {
      if (text.indexOf("Pant") == 0)
        return [ NounUtils.makeSugg(text, html) ];
      else
	return [];
    }
  };
  var cmd_different = {
    name: "dostuff",
    DOLabel: "thing",
    DOType: noun_type_different,
    execute: function( context, directObject, modifiers) {
      executedText = directObject.text;
      executedHtml = directObject.html;
    }
  };
  var comps = getCompletions("dostuff this", [cmd_different],
			     [noun_type_different], fakeContext);
  this.assert(comps.length == 1, "There should be one completion.");
  comps[0].execute();
  this.assert( executedText == "Pants", "text should be pants.");
  this.assert( executedHtml == "<blink>Pants</blink>", "html should blink!");

  executedText = null;
  executedHtml = null;
  //without any explicit 'this', should still work...
  comps = getCompletions("dostuff", [cmd_different],
			     [noun_type_different], fakeContext);
  this.assert(comps.length == 1, "There should be one completions (2)");
  comps[0].execute();
  this.assert( executedText == "Pants", "text should be pants.");
  this.assert( executedHtml == "<blink>Pants</blink>", "html should blink!");

  // when it's a noun-first suggestion from the parser, should still work...
  executedText = null;
  executedHtml = null;
  var nlParser = makeTestParser(LANG, [cmd_different], [noun_type_different]);
  var selObj = {
    text: "Pantalones", html: "<blink>Pantalones</blink>"
  };
  comps = nlParser.nounFirstSuggestions( selObj );
  this.assert(comps.length == 1, "There should be one partial completion");
  comps = comps[0].getAlternateSelectionInterpolations();
  this.assert(comps.length == 1, "There should still be one partial completion");
  comps = comps[0].getParsedSentences();
  this.assert(comps.length == 1, "There should be one completion (3)");
  comps[0].execute();
  this.assert( executedText == "Pantalones", "text should be pantalones.");
  this.assert( executedHtml == "<blink>Pantalones</blink>", "html should blink!");

}

function testAsyncNounSuggestions() {
  var noun_type_slowness = {
    _name: "slowness",
    suggest: function( text, html, callback ) {
      this._callback = callback;
      if (text.indexOf("hello")== 0) {
        return [ NounUtils.makeSugg("Robert E. Lee") ];
      } else
	return [];
    },
    triggerCallback: function() {
      this._callback( NounUtils.makeSugg("slothitude") );
      this._callback( NounUtils.makeSugg("snuffleupagus") );
    }
  };
  var cmd_slow = {
    name: "dostuff",
    DOLabel: "thing",
    DOType: noun_type_slowness,
    execute: function(context, directObject) {

    }
  };
  var fakeContext = {
    textSelection: "", htmlSelection: ""
  };
  // register an observer to make sure it gets notified when the
  // noun produces suggestions asynchronously.
  var observerCalled = false;
  var observe = function() {
      observerCalled = true;
  };

  var parser = makeTestParser(LANG, [cmd_slow],
			      [noun_type_slowness]);
  parser.updateSuggestionList( "dostuff hello", fakeContext, observe );
  var comps = parser.getSuggestionList();
  var assert = this.assert;
  var assertDirObj = function( completion, expected) {
    assert( completion._argSuggs.direct_object.text == expected,
		 "Expected " + expected );
  };
  this.assert( comps.length == 1, "there should be 1 completions.");
  assertDirObj(comps[0], "Robert E. Lee");

  // Now here comes the async suggestion:
  noun_type_slowness.triggerCallback();
  parser.refreshSuggestionList("dostuff hello");
  comps = parser.getSuggestionList();
  this.assert( comps.length == 3, "there should be 3 completions.");
  assertDirObj( comps[0], "Robert E. Lee");
  assertDirObj( comps[1], "slothitude");
  assertDirObj( comps[2], "snuffleupagus");
  this.assert(observerCalled, "observer should have been called.");

  // Now try one where the noun originally suggests nothing, but then comes
  // up with some async suggestions.  What happens?
  observerCalled = false;
  parser.updateSuggestionList("dostuff halifax", fakeContext, observe);
  comps = parser.getSuggestionList();
  this.assert( comps.length == 0, "there should be 0 completions.");
  // here comes the async suggestion:
  noun_type_slowness.triggerCallback();
  parser.refreshSuggestionList("dostuff halifax");
  comps = parser.getSuggestionList();
    this.assert( comps.length == 2, "there should be 2 completions.");
  assertDirObj( comps[0], "slothitude");
  assertDirObj( comps[1], "snuffleupagus");
  this.assert(observerCalled, "observer should have been called.");

  // Now instead of going through the verb directly, we'll go through the
  // command manager and get a suggestion list, then add a new noun suggestion
  // asynchronously and make sure the parser's suggestion list updated.
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var fakeSource = new FakeCommandSource ({dostuff: cmd_slow});
  var cmdMan = new CommandManager(fakeSource, mockMsgService, makeTestParser());
  cmdMan.updateInput( "dostuff halifax", fakeContext, null );
  this.assert(cmdMan.hasSuggestions() == false, "Should have no completions" );
  noun_type_slowness.triggerCallback();
  cmdMan.onSuggestionsUpdated( "dostuff h", fakeContext, null );
  this.assert(cmdMan.hasSuggestions() == true, "Should have them now.");
}

// TODO replace tests that hit Verb directly, with tests that go through
// NLParser.Parser.

// TODO a test where we go through the NLParser.Parser and make sure the
// ordering is what we expect based on verb quality matches.

// TODO a test where we put inalid value into an argument on purpose, ensure
// verb returns no suggestions.

// TODO a test where a command has three arguments, all arbText; make sure
// the top parsing is the sensible one.

// TODO test of verb initialized with new style arguments dict,
// and a verb initialized with old style arguments, make sure they're equivalent
// in every way.

// TODO have a bogus noun that returns empty suggestions, make sure it doesn't
// crash everything.

// TODO have input that matches either as a verb or as a noun, make sure the
// verb matches come first.

// TODO how bout a test that all first-party feeds can be loaded and work?

// TODO test that selection goes to ANY type-matching argument that's left empty, no
// matter how many other filled arguments there are.  Test that if multiple arguments
// are left empty, the selection is suggested for each one, although not all at the
// same time.

// TODO test that match with more (and more specific) arguments filled
// is ranked ahead of match with unfilled arguments, even if there are
// defaults.


// tests for not yet implemented features:

// TODO disjoint verb matches: make them work and test that they do.
// Maybe a useful subcategory of disjoint matches is "two letters transposed",
// which is very easy to do by accident when typing words like "emial".

// TODO test ranking based on noun match quality, when verb-match quality is
// equivalent.

// TODO make a verb with two direct objects using the new API, make sure
// an exception is raised.

// TODO do a noun-first suggestion with a noun that suggests asynchronously,
// and a verb that will only appear in the suggestion list if the nountype
// has a suggestion...
var noun_arb_text = {
  _name: "text",
  rankLast: true,
  suggest: function( text, html ) {
    return [ NounUtils.makeSugg(text, html) ];
  }
};

function makeSearchCommand(name) {
  return {
    name: name,
    DOLabel: "string",
    DOType: noun_arb_text,
    preview: function() {},
    execute: function() {}
  };
}

// TODO: Re-enable when we fix #343
function DISABLED_testWeirdCompletionsThatDontMakeSense() {
  var cmd_imdb = makeSearchCommand("IMDB");
  var cmd_amazon = makeSearchCommand("amazon-search");
  var comps = getCompletions("ac", [cmd_imdb, cmd_amazon], [noun_arb_text]);
  // Should be no verb-first suggestions, but since both commands take
  // arb text, both of them should prodcue a suggestion with ac as the
  // argument.
  this.assert( comps.length == 2, "Should have 2 suggestions.");
  this.assert( comps[0]._argSuggs.direct_object.text == "ac",
	       "object should be ac.");
  this.assert( comps[1]._argSuggs.direct_object.text == "ac",
	       "this object should be ac too.");
}

function testSynonymsGetDownrankedEvenWithArguments() {
  var cmd_youtube = {
    name: "youtube",
    DOLabel: "string",
    DOType: noun_arb_text,
    synonyms: ["video"],
    preview: function() {},
    exectue: function() {}
  };
  var cmd_define = makeSearchCommand("define");
  var comps = getCompletions("de m", [cmd_youtube, cmd_define], [noun_arb_text]);
  // "define m" should be the first suggestion, while
  // "youtube m" is the second suggestion (due to its synonym "video").
  this.assert( comps.length == 2, "Should have 2 suggestions.");
  this.assert( comps[0]._verb._name == "define", "Should be define.");
  this.assert( comps[0]._argSuggs.direct_object.text == "m",
	       "object should be m.");
  this.assert( comps[1]._verb._name == "youtube", "Should be youtube.");
  this.assert( comps[1]._argSuggs.direct_object.text == "m",
	       "object should be m.");

}

function testUtilsTrim() {
  // Taken from http://www.somacon.com/p355.php.
  this.assert(Utils.trim("\n  hello   ") == "hello");
}

function testUtilsComputeCrpytoHash() {
  var str = "hello world";
  this.assert(Utils.computeCryptoHash("md5", str) == "5eb63bbbe01eeed093cb22bb8f5acdc3");
  this.assert(Utils.computeCryptoHash("sha1", str) == "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed");
}

function getUbiquityComponent(test) {
  var Cc = Components.classes;
  var Ci = Components.interfaces;
  var ubiquity = Cc["@labs.mozilla.com/ubiquity;1"];

  if (typeof(ubiquity) == "undefined")
    // Right now nsUbiquity is an optional component, and if
    // it doesn't exist, let's just skip this test.
    throw new test.SkipTestError();

  ubiquity = ubiquity.getService();
  return ubiquity.QueryInterface(Ci.nsIUbiquity);
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
  Components.utils.import("resource://ubiquity-modules/xml_script_commands_parser.js");
  var code = parseCodeFromXml('<foo>\n<script class="commands"><![CDATA[testing\n\n\n>]]></script></foo>');
  this.assert(code.length == 1);
  this.assert(code[0].lineNumber == 2, "hi");
  this.assert(code[0].code == 'testing\n\n\n>');
}

function testLoadLocaleJsonWorks() {
  var dat = loadLocaleJson("resource://ubiquity-tests/test_all.json");
  this.assert(dat.testLoadLocaleJsonWorks.length == 1);
  this.assert(dat.testLoadLocaleJsonWorks == "\u3053");
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
eval(getLocalFileAsUtf8("resource://ubiquity-tests/test_locale_jp.js"));

exportTests(this);
