Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/cmdmanager.js");
Components.utils.import("resource://ubiquity/modules/cmdutils.js");
Components.utils.import("resource://ubiquity/modules/nounutils.js");
Components.utils.import("resource://ubiquity/modules/default_feed_plugin.js");
Components.utils.import("resource://ubiquity/modules/parser/new/namespace.js");
Components.utils.import("resource://ubiquity/modules/parser/new/parser.js");
Components.utils.import("resource://ubiquity/tests/test_suggestion_memory.js");
Components.utils.import("resource://ubiquity/tests/testing_stubs.js");
Components.utils.import("resource://ubiquity/tests/framework.js");

const VER = 2;
const LANG = "en";
const MAX_SUGGESTIONS = 10;


function makeTestParser2(lang, verbs, contextUtils) {
  return NLParser2.makeParserForLanguage(
    lang || LANG,
    verbs || [],
    contextUtils || fakeContextUtils,
    new TestSuggestionMemory());
}

function BetterFakeCommandSource( cmdList ) {
  var cmd;
  this._cmdList = [ makeCommand( cmd ) for each (cmd in cmdList ) ];
  for each (var c in this._cmdList) {
    dump("BetterFakeCommandSource has verb named " + c.names + ".\n");
  }
}
BetterFakeCommandSource.prototype = {
  addListener: function() {},
  getCommand: function(name) {
    return this._cmdList[name];
  },
  getAllCommands: function(name) {
    return this._cmdList;
  },
  refresh: function() {
  }
};

// Infrastructure for asynchronous tests:
function getCompletionsAsync( input, verbs, context, callback) {

  if (!context)
    context = { textSelection: "", htmlSelection: "" };
  var parser = makeTestParser2(LANG, verbs );
  var query = parser.newQuery( input, context, MAX_SUGGESTIONS, true );
  /* The true at the end tells it not to run immediately.  This is
   * important because otherwise it would run before we assigned the
   * callback. */
  query.onResults = function() {
    if (query.finished) {
      callback(query.suggestionList);
    }
  };
  query.run();
}

function makeCommand(options) {
  // Calls cmdUtils.CreateCommand, but returns the object instead of just
  // dumping it in a global namespace.
  var fakeGlobal = {
    commands: [],
    feed: {id: "this_is_a_test_case_not_really_a_feed"},
    Utils: Utils,
  };
  ({__proto__: CmdUtils, __globalObject: fakeGlobal}).CreateCommand(options);
  return DefaultFeedPlugin.makeCmdForObj(
    fakeGlobal,
    fakeGlobal.commands[0],
    Utils.url("chrome://ubiquity/content/test.html"));
}

// Actual test cases begin here:

function testSmokeTestParserTwo() {
  // Instantiate a ubiquity with Parser 2 and all the built-in feeds and
  // nountypes; ensure that it doesn't break.
  var self = this;
  try {
    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/setup.js", jsm);
    Components.utils.import("resource://ubiquity/modules/parser/parser.js", jsm);

    var services = jsm.UbiquitySetup.createServices();
    // but don't set up windows or chrome or anything... just use this to
    // get installed feeds.
    var NLParser = jsm.NLParserMaker(VER);
    var nlParser = NLParser.makeParserForLanguage(
      LANG,
      [],
      []
    );
    // now do what CommandManager does using services.commandSource
    nlParser.setCommandList(services.commandSource.getAllCommands());
  } catch (e) {
    this.assert(false, "Error caught in smoke test: " + e );
  }


  // Do a query here and make sure one of the builtin commands is
  // suggested...
 /* var fakeContext = { textSelection: "", htmlSelection: "" };
  var q = nlParser.newQuery("help", fakeContext, MAX_SUGGESTIONS, true);


  var testFunc = self.makeCallback(
    function(suggestionList) {
      // TODO for some reason the test is not waiting for this to be called.
      self.assert( suggestionList[0]._verb.name == "help",
                   "Should be help command!");
    });

  q.onResults = function() {
    testFunc(q.suggestionList);
  };
  q.run();*/

}

function testParserTwoDirectOnly() {
  var dogGotPetted = false;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
                                            "beagle", "bulldog", "husky"]);

  var cmd_pet = {
    execute: function(context, args) {
      dogGotPetted = args.object.text;
    },
    names: ["pet"],
    arguments: [
      {role: 'object', nountype: dog}
    ]
  };

  var self = this;
  var testFunc = function(completions) {
    self.assert( completions.length == 2, "should be 2 completions" );
    self.assert( completions[0]._verb.text == "pet", "verb should be pet");
    self.assert( completions[0].args.object[0].text == "beagle",
      "obj should be beagle");
    self.assert( completions[1]._verb.text == "pet", "verb should be pet");
    self.assert( completions[1].args.object[0].text == "bulldog",
      "obj should be bulldog");
    completions[0].execute();
    self.assert( dogGotPetted == "beagle");
    completions[1].execute();
    self.assert( dogGotPetted == "bulldog" );
  };

  getCompletionsAsync( "pet b", [cmd_pet], null,
                       self.makeCallback(testFunc) );
}


function testParserTwoParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
                                            "beagle", "bulldog", "husky"]);
  var washingObj = new NounUtils.NounType( "washing object",
                                           ["sponge", "hose", "spork",
                                            "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, args) {
      dogGotWashed = args.object.text;
      dogGotWashedWith = args.instrument.text;
    },
    names: ["wash"],
    arguments: [
      {role: "object", nountype: dog},
      {role: "instrument", nountype: washingObj}
    ]
  };

  var inputWords = "wash pood with sp";

  var self = this;
  var testFunc = function(completions) {
    self.assert( completions.length == 2, "Should be 2 completions" );
    completions[0].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "sponge");
    completions[1].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "spork");
  };

  getCompletionsAsync( inputWords, [cmd_wash], null,
                       self.makeCallback(testFunc));
}

function testSimplifiedParserTwoApi() {
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
                                            "beagle", "bulldog", "husky"]);
  var washingObj = new NounUtils.NounType( "washing object",
                                           ["sponge", "hose", "spork",
                                            "bathtub", "fire hose"]);
  var cmd_wash = makeCommand({
    execute: function(args) {
      dogGotWashed = args.object.text;
      dogGotWashedWith = args.instrument.text;
    },
    names: ["wash"],
    arguments: { object: dog, instrument: washingObj }
  });

  var inputWords = "wash pood with sp";
  var self = this;
  var testFunc = function(completions) {
    self.assert( completions.length == 2, "Should be 2 completions" );
    self.assert( completions[0]._verb.name == "wash", "Should be named wash");
    self.assert( completions[0].args["object"][0].text == "poodle",
                "Object should be poodle");
    self.assert( completions[0].args["instrument"][0].text == "sponge",
                "Instrument should be sponge");
    self.assert( completions[1]._verb.name == "wash", "Should be named wash");
    self.assert( completions[1].args["object"][0].text == "poodle",
                "Object should be poodle");
    self.assert( completions[1].args["instrument"][0].text == "spork",
                "Instrument should be spork");

    completions[0].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "sponge");
    completions[1].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "spork");
  };

  getCompletionsAsync( inputWords, [cmd_wash], null,
                       this.makeCallback(testFunc));
}

// TODO this test currently failing because verb.names undefined on
// line 230 of parser.js.  Could this be because it's trying to localize
// and failing?  Note both commands that use BetterFakeCommandSource are
// failing in the same way.
function testCmdManagerSuggestsForNounFirstInput() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = new NounUtils.NounType( "thingType", ["tree"] );
  var nounTypeTwo = new NounUtils.NounType( "stuffType", ["mud"] );

  var fakeSource = new BetterFakeCommandSource({
    cmd_one: {
      names: ["one"],
      execute: function(args) {
        if (args.object)
          oneWasCalled = args.object.text;
      },
      arguments: { object: nounTypeOne }
    },
    cmd_two: {
      names: ["two"],
      execute: function(args) {
        if (args.object)
          twoWasCalled = args.object.text;
      },
      arguments: { object: nounTypeTwo }
    }
  });

  var cmdMan = makeCommandManager.call(this, fakeSource, null,
                                       makeTestParser2(),
                                       onCM);
  var noSelection = { textSelection: null, htmlSelection: null };
  var self = this;
  function onCM(cmdMan) {
    cmdMan.updateInput(
      "tree",
      noSelection,
      self.makeCallback(
        function() {
          self.assert( cmdMan.hasSuggestions() );
          cmdMan.execute(noSelection);
          self.assert( oneWasCalled == "tree",
                       "Should have called cmdOne with text selection tree.");
        }
      )
    );
    // TODO I want to put a second test using input "mud", but if they
    // run at the same time the second one will cancel the first one.
  }
}

// TODO a test like above, but update input twice and make sure the second
// one cancels the first one!

/* TODO one like above but only goint through parser, should be able to run
 * two queries at once and not have them interfere with each other...
 */


// TODO this test currently failing because verb.names undefined on
// line 230 of parser.js.  Could this be because it's trying to localize
// and failing?
function testCmdManagerSuggestsForEmptyInputWithSelection() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = new NounUtils.NounType( "thingType", ["tree"] );
  var nounTypeTwo = new NounUtils.NounType( "stuffType", ["mud"] );

  var fakeSource = new BetterFakeCommandSource({
    cmd_one: {
      names: ["one"],
      execute: function(args) {
        oneWasCalled = args.object.text;
      },
      arguments: { object: nounTypeOne }
    },
    cmd_two: {
      names: ["two"],
      execute: function(args) {
        twoWasCalled = args.object.text;
      },
      arguments: { object: nounTypeTwo }
    }
  });

  var cmdMan = makeCommandManager.call(this, fakeSource, null,
                                       makeTestParser2(),
                                       onCM);
  // The commented-out stuff can be un-commented once implicit
  // selection interpolation is hapening: see #732 (and #722)
  var self = this;
  function onCM(cmdMan) {
    cmdMan.getSuggestionListNoInput(
      {textSelection:"tree"},
      self.makeCallback(
        function( suggestionList ) {
          /*self.assert( suggestionList.length == 1,
                        "Should be only one suggestion." ) */
          dump("SuggestionList[0].name is " + suggestionList[0]._verb.name + "\n");
          self.assert( suggestionList[0]._verb.name == "one",
                      "cmd one should be it" );
          //suggestionList[0].execute();
          /*self.assert( oneWasCalled == "tree",
                       "Should have been called with text selection tree.");*/
        }
      )
    );
    cmdMan.getSuggestionListNoInput(
      {textSelection:"mud"},
      self.makeCallback(
        function( suggestionList ) {
          /*self.assert( suggestionList.length == 1,
                        "Should be only one suggestion." ) */
          /*self.assert( suggestionList[0].name == "two",
                      "cmd two should be it" );*/
          //suggestionList[0].execute();
          /*self.assert( twoWasCalled == "mud",
                       "Should have been called with text selection mud.");*/
        }
      )
    );
  }
}

function testVerbMatcher() {
  var testParser = new Parser;
  testParser._verbList =
    [{names: ["google"], arguments: []},
     {names: ["check livemark"], arguments: []},
     {names: ["undo closed tabs"], arguments: []}];
  testParser.initializeCache();

  var {verbInitialTest} = testParser._patternCache;
  this.assert(verbInitialTest.test("undo closed tabs"), "whole");
  this.assert(!verbInitialTest.test("gooooogle"), "wrong");
  this.assert(verbInitialTest.test("goog"), "head-prefix");
  this.assert(verbInitialTest.test("live"), "middle-prefix");
  this.assert(verbInitialTest.test("tab"), "middle-prefix again");
}


function testPluginRegistry() {
  var executedPlugin = null;

  var cmdSharify = makeCommand({
    names: ["sharify"],
    arguments: [{role: "object",
                 nountype: /.*/,
                 label: "message"},
               {role: "instrument",
                nountype: CmdUtils.pluginNoun("sharify"),
                label: "sharify service provider"}],
    preview: function(pblock, args) {
      if (args.object)
        pblock.innerHTML = "Sharifies <b>" + args.object.text + "</b> using the selected service provider.";
      else
        pblock.innerHTML = "Adds a thing to your notes.";
    },
    execute: CmdUtils.executeBasedOnPlugin("sharify", "instrument")
  });

  CmdUtils.registerPlugin( "sharify", "twitter",
                           function(args) {
                             executedPlugin = "twitter";});
  CmdUtils.registerPlugin( "sharify", "digg",
                           function(args) {
                             executedPlugin = "digg";});
  CmdUtils.registerPlugin( "sharify", "delicious",
                           function(args) {
                             executedPlugin = "delicious";});

  var self = this;
  var testFunc = function(completions) {
    self.assert( completions.length == 2, "Should be 2 completions" );
    self.assert( completions[0]._verb.name == "sharify", "Should be named sharify");
    self.assert( completions[0].args["instrument"][0].text == "digg",
                "Instrument should be digg");
    self.assert( completions[1].args["object"][0].text == "stuff",
                "Object should be stuff.");

    self.assert( completions[1]._verb.name == "sharify", "Should be named sharify");
    self.assert( completions[1].args["instrument"][0].text == "delicious",
                "Instrument should be delicious");
    self.assert( completions[1].args["object"][0].text == "stuff",
                "Object should be stuff.");

    completions[0].execute();
    self.assert( executedPlugin == "digg");
    completions[1].execute();
    self.assert( executedPlugin == "delicious");
  };

  getCompletionsAsync( "sharify stuff with d", [cmdSharify], null,
                       this.makeCallback(testFunc));

  // TODO this test is timing out, I think because of e[key] is undefined
  // on line 233 of nounutils.js.
}

/* More tests that should be written:
 *   -- For the context menu bug (use cmdmanager.makeCommandSuggester())
 *   -- Coexistence of two verbs with the same name (modulo parens)
 *   -- For internationalization
 *   -- Bring over all the unit tests from parser 1 and modify them to work!
 */

/*
function testNounTypeSpeed() {
  var slownoun = new NounUtils.NounType('anything');
  slownoun.suggest = function(text) {
    dump('checking '+text+'\n');
    var start = new Date();
    var now = null;
    do { now = new Date(); }
    while(now - start < 1000);
    return [ NounUtils.makeSugg(text) ];
  };

  var cmd_hit = {

    execute: function(context, args) {
      dogGotPetted = args.object.text;
    },
    names: {
      en: ["hit"]
    },
    arguments: [
      {role: 'object', nountype: slownoun}
    ]
  };
  var completions = getCompletions( "hit me", [cmd_hit], [slownoun], null );
  dump("Completions are: " + completions + "\n");
  dump("First verb is " + completions[0]._verb.text + "\n");
  this.assert( completions.length == 2, "should be 2 completions" );
}
*/

exportTests(this);
