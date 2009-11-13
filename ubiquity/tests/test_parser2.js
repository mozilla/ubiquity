const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/cmdmanager.js");
Cu.import("resource://ubiquity/modules/cmdutils.js");
Cu.import("resource://ubiquity/modules/nounutils.js");
Cu.import("resource://ubiquity/modules/default_feed_plugin.js");
Cu.import("resource://ubiquity/modules/parser/new/namespace.js");
Cu.import("resource://ubiquity/modules/parser/new/parser.js");
Cu.import("resource://ubiquity/tests/test_suggestion_memory.js");
Cu.import("resource://ubiquity/tests/testing_stubs.js");
Cu.import("resource://ubiquity/tests/framework.js");
Cu.import("resource://ubiquity/modules/setup.js");

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

var noun_arb_text = {
  label: "?",
  rankLast: true,
  noExternalCalls: true,
  cacheTime: -1,
  suggest: function nat_suggest(text, html, callback, selectionIndices) {
    return [CmdUtils.makeSugg(text, html, null, 0.3, selectionIndices)];
  }
};

function debugCompletions(completions) {
  dump('There are '+completions.length+' completions.\n');
  for each ( var comp in completions ) {
    dump("Completion is " + comp.displayHtmlDebug + "\n");
  }
}

// Infrastructure for asynchronous tests:
function getCompletionsAsync( input, verbs, context, callback, lang) {
  if (!context)
    context = { textSelection: "", htmlSelection: "" };
  var parser = makeTestParser2(lang || LANG, verbs );
  getCompletionsAsyncFromParser(input, parser, context, callback);
}

function getCompletionsAsyncFromParser(input, parser, context, callback) {
  if (!context)
    context = { textSelection: "", htmlSelection: "" };
  dump("passing context into parser.newQuery with context.textSelection = ");
  dump(context.textSelection + "\n");
  var query = parser.newQuery( input, context, MAX_SUGGESTIONS, true );
  /* The true at the end tells it not to run immediately.  This is
   * important because otherwise it would run before we assigned the
   * callback. */
  //Utils.log(parser._verbList,parser._nounTypes);

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
    Utils.url("chrome://ubiquity/content/test.xhtml"));
}

/* this takes an array of options (command primitives) and makes them all
 * commands in one simulated namespace... the sharing of that namespace
 * during construction is crucial for properly ID'ing distinct nountypes!
 * (This fixes testVariableNounWeights--see #746.) */
function makeCommands(arrayOfOptions) {
  // Calls cmdUtils.CreateCommand, but returns the object instead of just
  // dumping it in a global namespace.
  var fakeGlobal = {
    commands: [],
    feed: {id: "this_is_a_test_case_not_really_a_feed"},
    Utils: Utils,
  };
  var myCmdUtils = ({__proto__: CmdUtils, __globalObject: fakeGlobal});
  for each (options in arrayOfOptions) {
    myCmdUtils.CreateCommand(options);
  }
  return [ DefaultFeedPlugin.makeCmdForObj(
                   fakeGlobal,
                   command,
                   Utils.url("chrome://ubiquity/content/test.xhtml"))
           for each (command in fakeGlobal.commands) ];

}

// Actual test cases begin here:

function testSmokeTestParserTwo() {
  if (UbiquitySetup.parserVersion < 2) throw new this.SkipTestError();
  // Instantiate a ubiquity with Parser 2 and all the built-in feeds and
  // nountypes; ensure that it doesn't break.
  var jsm = {};
  Cu.import("resource://ubiquity/modules/parser/parser.js", jsm);
  try {
    var services = UbiquitySetup.createServices();
    // but don't set up windows or chrome or anything... just use this to
    // get installed feeds.
    var NLParser = jsm.NLParserMaker(VER);
    var nlParser = NLParser.makeParserForLanguage(LANG, []);
    // now do what CommandManager does using services.commandSource
    nlParser.setCommandList(services.commandSource.getAllCommands());
  } catch (e) {
    this.assert(false, "Error caught in smoke test: " + e);
  }
}

function testParserTwoDirectOnly() {
  var dogGotPetted = false;
  var dog = new NounUtils.NounType("dog", ["poodle", "golden retreiver",
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

function testParserTwoBasicJaParse() {
  //
  var ateHorse = null;
  var ateHorseWith = null;
  // ラーメン, ごはん, 馬刺
  var food = new NounUtils.NounType( "food", ["\u30E9\u30FC\u30E1\u30F3","\u3054\u306F\u3093","\u99AC\u523A"]);
  // 手, はし, フォーク
  var tool = new NounUtils.NounType( "eating utensil",
                                           ["\u624B", "\u306F\u3057", "\u30D5\u30A9\u30FC\u30AF"]);

  var cmd_eat = {
    execute: function(context, args) {
      ateFood = args.object.text;
      ateFoodWith = args.instrument.text;
    },
    names: ["\u98DF\u3079\u308B"], // 食べる
    arguments: [
      {role: "object", nountype: food},
      {role: "instrument", nountype: tool}
    ]
  };

  // 馬刺をはしで食べる
  var inputWords = "\u99AC\u523A\u3092\u306F\u3057\u3067\u98DF\u3079\u308B";

  var self = this;
  var testFunc = function(completions) {
    debugCompletions(completions);
    // 馬刺 を はし で 食べる
    self.assert( completions.length == 1, "Should be 1 completion" );
    completions[0].execute();
    self.assert( ateFood == "\u99AC\u523A"); // 馬刺
    self.assert( ateFoodWith == "\u306F\u3057"); // はし
  };

  getCompletionsAsync( inputWords, [cmd_eat], null,
                       self.makeCallback(testFunc), 'ja' );

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
    self.assert( dogGotWashedWith == "spork");
    completions[1].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "sponge");
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
    //debugCompletions(completions);
    self.assert( completions.length == 2, "Should be 2 completions" );
    self.assert( completions[0]._verb.name == "wash", "Should be named wash");
    self.assert( completions[0].args["object"][0].text == "poodle",
                "Object should be poodle");
    self.assert( completions[0].args["instrument"][0].text == "spork",
                "Instrument should be spork");
    self.assert( completions[1]._verb.name == "wash", "Should be named wash");
    self.assert( completions[1].args["object"][0].text == "poodle",
                "Object should be poodle");
    self.assert( completions[1].args["instrument"][0].text == "sponge",
                "Instrument should be sponge");

    completions[0].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "spork");
    completions[1].execute();
    self.assert( dogGotWashed == "poodle");
    self.assert( dogGotWashedWith == "sponge");
  };

  getCompletionsAsync( inputWords, [cmd_wash], null,
                       this.makeCallback(testFunc));
}


function testVerbEatsSelectionParserTwo() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  // This also tests creating nountypes from arrays:
  var cmd_eat = makeCommand({
    names: ["eat"],
    arguments: { object: ["breakfast", "lunch", "dinner"],
                 location: ["grill", "diner", "home"]},
    execute: function(args) {
      if (args.object.text)
        foodGotEaten = args.object.text;
      if (args.location.text)
        foodGotEatenAt = args.location.text;
    }
  });
  var fakeContext = { textSelection: "lunch", htmlSelection:"lunch" };
  var self = this;
  getCompletionsAsync("eat this", [cmd_eat], fakeContext,
                      self.makeCallback(testEatFuncOne));

  function testEatFuncOne(completions) {
    // TODO this gets two identical completions of "eat lunch (near ?)"
    for each ( var comp in completions ) {
      dump("Completion is " + comp.displayHtmlDebug + "\n");
    }
    self.assert( completions[0]._verb.name == "eat",
               "First completion verb should be 'eat'" );
    self.assert( completions[0].args.object[0].text == "lunch",
               "First completion verb should have object 'lunch'" );
    completions[0].execute();
    self.assert(foodGotEaten == "lunch", "obj should be lunch");
    self.assert(foodGotEatenAt == null, "should be no modifier");

    fakeContext.textSelection = "grill";
    fakeContext.htmlSelection = "grill";
    getCompletionsAsync("eat breakfast at it", [cmd_eat], fakeContext,
                        self.makeCallback(testEatFuncTwo));
  }

  function testEatFuncTwo(completions) {
    self.assert( completions[0]._verb.name == "eat",
               "First completion verb should be 'eat'" );
    self.assert( completions[0].args.object[0].text == "breakfast",
               "First completion verb should have object 'breakfast'" );
    completions[0].execute();
    self.assert(foodGotEaten == "breakfast", "food should be breakfast");
    self.assert(foodGotEatenAt == "grill", "place should be grill");

    fakeContext.textSelection = "dinne";
    fakeContext.htmlSelection = "dinne";
    getCompletionsAsync("eat at home this", [cmd_eat], fakeContext,
                        self.makeCallback(testEatFuncThree));

  }

  function testEatFuncThree(completions) {
    self.assert( completions[0]._verb.name == "eat",
               "First completion verb should be 'eat'" );
    self.assert( completions[0].args.object[0].text == "dinner",
               "First completion verb should have object 'dinner'" );
    completions[0].execute();
    self.assert(foodGotEaten == "dinner", "food should be dinner");
    self.assert(foodGotEatenAt == "home", "place should be home");
  }
}

function testImplicitPronounParser2() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
    var cmd_eat = makeCommand({
    names: ["eat"],
    arguments: { object: ["breakfast", "lunch", "dinner"],
                 location: ["grill", "diner", "home"]},
    execute: function(args) {
      if (args.object.text)
        foodGotEaten = args.object.text;
      if (args.location.text)
        foodGotEatenAt = args.location.text;
    }
  });
  var fakeContext = { textSelection: "lunch", htmlSelection:"lunch" };
  var self = this;
  getCompletionsAsync("eat", [cmd_eat], fakeContext,
                      self.makeCallback(implicitTestFuncOne));

  function implicitTestFuncOne(completions) {
    // Should have "eat lunch" and "eat ?"
    //debugCompletions(completions);
    self.assert( (completions.length == 2), "Should have 2 completions.");
    completions[0].execute();
    self.assert((foodGotEaten == "lunch"), "DirectObj should have been lunch.");
    self.assert((foodGotEatenAt == null), "Indirectobj should not be set.");
    foodGotEaten = null;
    foodGotEatenAt = null;
    fakeContext.textSelection = "din";
    getCompletionsAsync("eat", [cmd_eat], fakeContext,
                        self.makeCallback(implicitTestFuncTwo));
  }
  function implicitTestFuncTwo(completions) {
    //debugCompletions(completions);
    // second completion should be directObject is dinner
    completions[1].execute();
    self.assert((foodGotEaten == "dinner"), "DO should have been dinner.");
    self.assert((foodGotEatenAt == null), "IndirectObjs shouldn't be set.");
    foodGotEaten = null;
    foodGotEatenAt = null;
    // first completion should be direct object null, place is diner
    completions[0].execute();
    self.assert((foodGotEaten == null), "DO should be null.");
    self.assert((foodGotEatenAt == "diner"), "Place should be diner.");
    foodGotEaten = null;
    foodGotEatenAt = null;
    fakeContext.textSelection = "dine";
    fakeContext.htmlSelection = "dine";
    getCompletionsAsync("eat lunch at selection", [cmd_eat], fakeContext,
                        self.makeCallback(implicitTestFuncThree));

  }
  function implicitTestFuncThree(completions) {
    // TODO failing here.... expecting "eat lunch at diner" but getting:
    // "eat lunch at diner" (expected), "eat dinner at diner"
    // (unexpected), and "eat near diner at diner" (bizzare)
    //debugCompletions(completions);
    completions[0].execute();
    self.assert(foodGotEaten == "lunch", "Should have eaten lunch");
    self.assert(foodGotEatenAt == "diner", "Should have eaten it at diner");
    foodGotEaten = null;
    foodGotEatenAt = null;
    fakeContext.textSelection = "din";
    fakeContext.htmlSelection = "din";
    getCompletionsAsync("eat at grill", [cmd_eat], fakeContext,
                        self.makeCallback(implicitTestFuncFour));
  }
  function implicitTestFuncFour(completions) {
    //debugCompletions(completions);
    completions[0].execute();
    self.assert((foodGotEaten == "dinner"), "DO should be dinner.");
    self.assert((foodGotEatenAt == "grill"), "ate at grill.");
    foodGotEaten = null;
    foodGotEatenAt = null;
    fakeContext.textSelection = "pants";
    fakeContext.htmlSelection = "pants";
    getCompletionsAsync("eat lunch at selection", [cmd_eat], fakeContext,
                        self.makeCallback(implicitTestFuncFive));
  }
  function implicitTestFuncFive(completions) {
    // Self now gets an empty list, but I'm not sure that's wrong, given the
    // new behavior, since there is no valid way to use the "at selection"
    // argument...
    // TODO FAILURE RIGHT HERE EMPTY SUGGESTION LIST!!!!
    /*debugSuggestionList(completions);
     self.assert( completions.length == 1, "Should have 1 completion(D)");
     completions[0].execute();
     self.assert((foodGotEaten == null), "Should have no valid args.");
     self.assert((foodGotEatenAt == null), "Should have no valid args.");
     */
    fakeContext.textSelection = null;
    fakeContext.htmlSelection = null;
    getCompletionsAsync("eat this", [cmd_eat], fakeContext,
                        self.makeCallback(implicitTestFuncSix));
  }
  function implicitTestFuncSix(completions) {
    self.assert( completions.length == 0, "should have no completions");
  }

}


function testDontInterpolateInTheMiddleOfAWord() {
  // a word like "iterate" contains "it", but the selection should not
  // be interpolated in place of that "it".
  var cmd_google = makeCommand({
    names: ["find"],
    arguments: {object: /^((?!find).)*$/}, // anything but "find"
    execute: function(args) {}
    });

  var self = this;
  var fakeContext = { textSelection: "flab", htmlSelection: "flab" };
  getCompletionsAsync("find iterate", [cmd_google], fakeContext,
                      self.makeCallback(dontInterpolateFuncOne));
  function dontInterpolateFuncOne(completions) {
    debugCompletions(completions);
    // JONO:
    // Getting three suggestions:
    // 1. "find iterate" (expected),
    // 2. "find flab" (unexpected)
    // 3. "find find iterate" (weird) <-- NOT WEIRD. see below
    // mitcho:
    // Fixed so it passes and only (1) and (3) parse are given. Note that
    // (3) was not weird given the free nountype, so I made the nountype
    // more restrictive so anything with "find" in it is not accepted.
    self.assert(completions.length == 1, "Should have 1 completion");
    self.assert(completions[0].args.object[0].text == "iterate",
              "Should not interpolate for the 'it' in 'iterate'.");
    getCompletionsAsync("find it erate", [cmd_google], fakeContext,
                        self.makeCallback(dontInterpolateFuncTwo));

  }
  function dontInterpolateFuncTwo(completions) {
    debugCompletions(completions);
    self.assert(completions.length == 2, "Should have 2 completions.");
    self.assert(completions[0].args.object[0].text == "flab erate",
              "Should interpolate 'flab' for 'it'.");
    self.assert(completions[1].args.object[0].text == "it erate",
              "input without interpolation should also be suggested.");
  }
}

function testDisplayInterpolatedArguments() {
  // a word like "iterate" contains "it", but the selection should not
  // be interpolated in place of that "it".
  var cmd_steal = makeCommand({
    names: ["steal"],
    arguments: {object: /^((?!steal).)*$/,
                source: /^((?!steal).)*$/}, // anything but "steal"
    execute: function(args) {}
    });

  var self = this;
  var fakeContext = { textSelection: "the bank", htmlSelection: "the bank" };
  getCompletionsAsync("steal money", [cmd_steal], fakeContext,
                      self.makeCallback(displayInterpolatedFunc));
  function displayInterpolatedFunc(completions) {
    debugCompletions(completions);
    self.assert(completions.length == 2, "Should have 2 completions");
    self.assert(completions[0].displayHtml.indexOf('the bank'),
              "The input should be in every parse.");
    self.assert(completions[1].displayHtml.indexOf('the bank')
                && completions[1].displayHtml.indexOf('the bank'),
    "Both the input argument and the interpolated argument should be displayed.");

  }
}


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
  var noSelection = {textSelection: null, htmlSelection: null};
  var self = this;
  function onCM(cmdMan) {
    cmdMan.updateInput(
      "tree",
      noSelection,
      self.makeCallback(function () {
        self.assert(cmdMan.hasSuggestions);
        cmdMan.execute(noSelection);
        self.assert(oneWasCalled === "tree",
                    "Should have called cmdOne with text selection tree.");
      }));
    // TODO I want to put a second test using input "mud", but if they
    // run at the same time the second one will cancel the first one.
  }
}

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
  // These tests failing because we're getting back too many suggestions.
  // Should be filtered down to only the one that matches the selection,
  // but it's not.
  var self = this;
  function onCM(cmdMan) {
    cmdMan.getSuggestionListNoInput(
      {textSelection:"tree"},
      self.makeCallback(
        function( suggestionList ) {
          self.assert( suggestionList[0]._verb.name == "one",
                      "cmd one should be it" );
          suggestionList[0].execute();
          self.assert( oneWasCalled == "tree",
                       "Should have been called with text selection tree.");
        }
      ), true );
    cmdMan.getSuggestionListNoInput(
      {textSelection:"mud"},
      self.makeCallback(
        function( suggestionList ) {
          self.assert( suggestionList[0]._verb.name == "two",
                      "cmd two should be it" );
          suggestionList[0].execute();
          self.assert( twoWasCalled == "mud",
                       "Should have been called with text selection mud.");
        }
      ), true );
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

// TODO: Failing, but I think it's failing for the same reason as
// testNounsWithDefaults is failing.  Disabled because Plugin
// feature has been bumped to ubiquity 0.5.5.
function DONOTtestPluginRegistry() {
  var twitterGotShared = null;
  var diggGotShared = null;
  var deliciousGotShared = null;
  var executedPlugin = null;

  var cmdSharify = makeCommand({
    names: ["sharify"],
    arguments: [ {role: "object",
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
                             executedPlugin = "twitter";
                             twitterGotShared = args.object.text;
                           });
  CmdUtils.registerPlugin( "sharify", "digg",
                           function(args) {
                             executedPlugin = "digg";
                             diggGotShared = args.object.text;
                           });
  CmdUtils.registerPlugin( "sharify", "delicious",
                           function(args) {
                             executedPlugin = "delicious";
                             deliciousGotShared = args.object.text;
                          });

  var self = this;
  var testFunc = function(completions) {
    // What? Getting 10 suggestions here instead of 2.  TODO!
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
    self.assert( diggGotShared == "stuff");
    completions[1].execute();
    self.assert( executedPlugin == "delicious");
    self.assert( deliciousGotShared == "stuff");
  };

  getCompletionsAsync( "sharify stuff with d", [cmdSharify], null,
                       this.makeCallback(testFunc));

}

function testNounsWithDefaults() {
  var nounValues = ["home", "work", "school"];
  var nounWithDefaults = {
    suggest: function(text, html, callback, selectionIndices) {
      return CmdUtils.grepSuggs(text, [CmdUtils.makeSugg(x) for each (x in nounValues)]);
    },
    default: function() {
      return [CmdUtils.makeSugg("home")];
    }
  };
  var cmdDrive = makeCommand({
    names: ["drive"],
    arguments: [ {role: "goal",
                  nountype: nounWithDefaults,
                  label: "location"}],
    preview: function(pblock, args) {
    },
    execute: function(args) {
    }
  });

  var self = this;
  var testFunc = function(completions) {
    self.assert( completions.length == 1, "Should be 1 completion" );
    self.assert( completions[0]._verb.name == "drive", "Should be named drive");
    self.assert( completions[0].args["goal"][0].text == "home",
                "goal should be home.");
  };

  getCompletionsAsync( "drive", [cmdDrive], null,
                       this.makeCallback(testFunc));

}

function testSortSpecificNounsBeforeArbTextParser2() {
  var dog = new NounUtils.NounType("dog", ["poodle", "golden retreiver",
                                            "beagle", "bulldog", "husky"]);
  var self = this;
  var fakeSource = new BetterFakeCommandSource({
    mumble: {names: ["mumble"],
          arguments: [{role:"object", nountype: noun_arb_text, label: "stuff"}],
          execute: function(){}},
    wash: {names: ["wash"],
          arguments: [{role: "object", nountype: dog, label: "dog"}],
          execute: function(){}}
    });

  var parser = makeTestParser2(LANG, fakeSource.getAllCommands());
  var beagleContext = {textSelection:"beagle", htmlSelection:"beagle"};

  function testFunc(suggs) {
    self.assert(suggs.length == 4, "Should be four suggestions.");
    self.assert(suggs[0]._verb.name == "wash", "First suggestion should be wash");
    self.assert(suggs[1]._verb.name == "mumble", "Second suggestion should be mumble");
  }
  getCompletionsAsyncFromParser("", parser, beagleContext, self.makeCallback(testFunc));
}

function testVerbUsesDefaultIfNoArgProvidedParser2() {
  var dog = new NounUtils.NounType("dog", ["poodle", "golden retreiver",
                                           "beagle", "bulldog", "husky"]);
  dog.default = function() {return NounUtils.makeSugg("husky");};
  var self = this;
  var fakeSource = new BetterFakeCommandSource({
    wash: {
      names: ["wash"],
      arguments: [{role:"object", nountype: dog, label: "dog"}],
    },
    playFetch: {
      names: ["play fetch"],
      arguments: [{
        role: "object", nountype: dog, label: "dog",
        default: NounUtils.makeSugg("beagle")}],
    }
  });
  var parser = makeTestParser2(LANG, fakeSource.getAllCommands());
  getCompletionsAsyncFromParser("wash", parser, null, self.makeCallback(testFunc1));

  function testFunc1(suggs) {
    self.assert(suggs.length === 1, "Should be 1 suggestion (A).");
    self.assert(suggs[0]._verb.name === "wash",
                "Suggestion should be wash");
    self.assert(suggs[0].args.object[0].text === "husky",
                "Argument should be husky.");
    getCompletionsAsyncFromParser("play", parser, null, self.makeCallback(testFunc2));
  }

  function testFunc2(suggs) {
    self.assert(suggs.length === 1, "Should be 1 suggestion (B).");
    self.assert(/^play[ -]fetch$/.test(suggs[0]._verb.name),
                "Suggestion should be 'play fetch'");
    self.assert(suggs[0].args.object[0].text === "beagle",
                "Argument should be beagle.");
    getCompletionsAsyncFromParser("play retr", parser, null,
                                  self.makeCallback(testFunc3));
  }

  function testFunc3(suggs) {
    self.assert(suggs.length === 1, "Should be 1 suggestion (C).");
    self.assert(/^play[ -]fetch$/.test(suggs[0]._verb.name),
                "Suggestion should be play fetch");
    self.assert(suggs[0].args.object[0].text === "golden retreiver",
                "Argument should be golden retreiver");
  }
}

function testNounsWithMultipleDefaults() {
  var nounValues = ["home", "work", "school"];
  var nounWithMultiDefaults = {
    suggest: function(text, html, callback, selectionIndices) {
      return CmdUtils.grepSuggs(text, [CmdUtils.makeSugg(x) for each (x in nounValues)]);
    },
    default: function() {
      return  [CmdUtils.makeSugg(x) for each (x in nounValues)];
    }
  };
  var cmdDrive = makeCommand({
    names: ["drive"],
    arguments: [ {role: "goal",
                  nountype: nounWithMultiDefaults,
                  label: "location"}],
    preview: function(pblock, args) {
    },
    execute: function(args) {
    }
  });

  var self = this;
  var testFunc = function(completions) {
    self.assert( completions.length == 3, "Should be 3 completion" );
    self.assert( completions[0]._verb.name == "drive", "Should be named drive");
    self.assert( completions[0].args["goal"][0].text == "home",
                "goal should be home.");
    self.assert( completions[1]._verb.name == "drive", "Should be named drive");
    self.assert( completions[1].args["goal"][0].text == "work",
                "goal should be work.");
    self.assert( completions[2]._verb.name == "drive", "Should be named drive");
    self.assert( completions[2].args["goal"][0].text == "school",
                "goal should be school.");
  };

  getCompletionsAsync( "drive", [cmdDrive], null,
                       this.makeCallback(testFunc));
}

function testVariableNounWeights() {
  var weakNoun = {
    noExternalCalls: true,
    suggest: function(text, html, cb, selectionIndices) {
      if (text.indexOf("de") != -1) {
        return [CmdUtils.makeSugg("dentist", null, null, 0.5)];
      } else {
        return [];
      }
    }
  };

  var mediumNoun = {
    noExternalCalls: true,
    suggest: function(text, html, cb, selectionIndices) {
      if (text.indexOf("de") != -1) {
        return [CmdUtils.makeSugg("deloused", null, null, 1.0)];
      } else {
        return [];
      }
    }
  };

  var strongNoun = {
    noExternalCalls: true,
    suggest: function(text, html, cb, selectionIndices) {
      if (text.indexOf("de") != -1) {
        return [CmdUtils.makeSugg("decapitation", null, null, 2.0)];
      } else {
        return [];
      }
    }
  };

  var verbs = makeCommands([
    { names: ["weak verb"],
      arguments: {object: weakNoun},
      execute: function(args) {} },
    { names: ["medium verb"],
      arguments: {object: mediumNoun},
      execute: function(args) {} },
    { names: ["strong verb"],
      arguments: {object: strongNoun},
      execute: function(args) {} }
  ]);

  var self = this;
  var testFunc = function(completions) {
    // NOTE: verbs here will contain hyphens in between words if
    // UbiquitySetup.parserVersion is 1, because when the commands are
    // made the parserVersion is checked to see if hyphens need to be entered
    // in between words, since parser 1 doesn't support spaces in verbs
    self.assert( completions.length == 3, "Should be 3 completions" );
    self.assert( completions[0]._verb.name == "strong verb"
                 || completions[0]._verb.name == "strong-verb",
                 "Should be named strong verb");
    self.assert( completions[1]._verb.name == "medium verb"
                 || completions[1]._verb.name == "medium-verb",
                 "Should be named medium verb");
    self.assert( completions[2]._verb.name == "weak verb"
                 || completions[2]._verb.name == "weak-verb",
                 "Should be named weak verb");
  };

  getCompletionsAsync( "de", verbs, null,
                       this.makeCallback(testFunc));

}

function testSortedBySuggestionMemoryParser2Version() {
  var fakeSource = new BetterFakeCommandSource({
    clock: {names: ["clock"],
      arguments: {object: noun_arb_text}, execute: function(){}},
    calendar: {names: ["calendar"],
      arguments: {object: noun_arb_text}, execute: function(){}},
    couch: {names: ["couch"],
      arguments: {object: noun_arb_text}, execute: function(){}},
    conch: {names: ["conch"],
      arguments: {object: noun_arb_text}, execute: function(){}},
    crouch: {names: ["crouch"],
      arguments: {object: noun_arb_text}, execute: function(){}},
    coelecanth: {names: ["coelecanth"],
      arguments: {object: noun_arb_text}, execute: function(){}},
    crab: {names: ["crab"],
      arguments: {object: noun_arb_text}, execute: function(){}}
    });

  var parser = makeTestParser2(LANG, fakeSource.getAllCommands());

  var self = this;

  getCompletionsAsyncFromParser("c", parser, null,
                                self.makeCallback(suggMemoryTestFunc1));

  function suggMemoryTestFunc1(completions) {
    debugCompletions(completions);
    self.assert( completions[0].displayHtml.indexOf("clock") > -1,
                "0th suggestion should be clock" );
    self.assert( completions[6].displayHtml.indexOf("coelecanth") > -1,
                "6th suggestion should be coelecanth" );

    // Now strengthen suggestion memory on "c" -> coelecanth...
    parser.strengthenMemory(completions[6]);
    // Now try a new completion...
    getCompletionsAsyncFromParser("c", parser, null,
                                  self.makeCallback(suggMemoryTestFunc2));
  }

  function suggMemoryTestFunc2(completions) {
    // This time around, coelecanth should be top hit because
    // of suggestion memory.  Clock should be #2.
    self.assert( completions[0].displayHtml.indexOf("coelecanth") > -1,
                "0th suggestion should be coelecanth" );
    self.assert( completions[1].displayHtml.indexOf("crab") > -1,
                "1st suggestion should be clock" );
  }

  // TODO strength one of the other suggestions twice, see that it ranks above
  // coelecanth.

}

// TODO could also do the above test through command manager and
// BetterFakeCommandSource, using cmdMan.execute and ensuring that
// the memory is strengthenend.


function testSortedBySuggestionMemoryNounFirstParser2() {
  // Three commands that take arbitrary text argument...
  var fakeSource = new BetterFakeCommandSource({
    throttle: {names: ["throttle"],
               arguments: {object: noun_arb_text}, execute: function(){}},
    frozzle: {names: ["frozzle"],
              arguments: {object: noun_arb_text}, execute: function(){}},
    wiggle: {names: ["wiggle"],
             arguments: {object: noun_arb_text}, execute: function(){}}
    });

  var parser = makeTestParser2(LANG, fakeSource.getAllCommands());
  var self = this;
  var fakeContext = {textSelection: "blarrrgh", htmlSelection: "blarrrgh"};

  // Now pretend we have a text selection and empty input...
  getCompletionsAsyncFromParser("", parser, fakeContext,
                                self.makeCallback(suggMemoryTestPart1));

  function suggMemoryTestPart1(completions) {
    self.assert( completions[0].displayHtml.indexOf("throttle") > -1,
                "0th suggestion should be throttle" );
    self.assert( completions[1].displayHtml.indexOf("frozzle") > -1,
                "1st suggestion should be frozzle" );
    self.assert( completions[2].displayHtml.indexOf("wiggle") > -1,
                "2nd suggestion should be wiggle" );

    // Now strengthen suggestion memory on wiggle twice, throttle once...
    parser.strengthenMemory(completions[2]);
    parser.strengthenMemory(completions[2]);
    parser.strengthenMemory(completions[0]);
    // Now try a new completion...
    getCompletionsAsyncFromParser("", parser, fakeContext,
                                  self.makeCallback(suggMemoryTestPart2));
  }

  function suggMemoryTestPart2(completions) {
    //Now should be wiggle on top, then throttle.
    self.assert( completions[0].displayHtml.indexOf("wiggle") > -1,
                "0th suggestion should be wiggle" );
    self.assert( completions[1].displayHtml.indexOf("throttle") > -1,
                "1st suggestion should be throttle" );
    self.assert( completions[2].displayHtml.indexOf("wiggle") > -1,
                "2nd suggestion should be wiggle" );
  }
}

function testTagCommand() {
  if (UbiquitySetup.parserVersion < 2) throw new this.SkipTestError();

  var self = this;
  this.skipIfXPCShell();

  var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
              .getService(Ci.nsINavBookmarksService);

  var tagsvc = Cc["@mozilla.org/browser/tagging-service;1"]
               .getService(Ci.nsITaggingService);


  var testURI = Utils.currentTab.uri;

  // for cleanup
  var isBookmarked = bmsvc.isBookmarked(testURI);

  var services = UbiquitySetup.createServices();
  var cmdSource = services.commandSource;

  var cmd = cmdSource.getCommand(UbiquitySetup.STANDARD_FEEDS_URI +
                                 "firefox.html#tag");

  if (!cmd || cmd.disabled) throw new this.SkipTestError();

  var context = {focusedElement: null, focusedWindow: null};

  var cmdMan = makeCommandManager.call(this, cmdSource,
                                       services.messageService,
                                       makeTestParser2(),
                                       onCM);

  function onCM(cmdManager) {
    function uriHasTags(aTags) {
      let {uri} = Utils.currentTab;
      let tags = tagsvc.getTagsForURI(uri, {});
      let result = aTags.every(function(aTag) {
          return tags.indexOf(aTag) > -1;
      });
      return result;
    }

    // test add tag
    getCompletionsAsync("tag foo", [cmd], context,
      self.makeCallback(
        function(completions) {
          completions[0].execute();
          self.assert(uriHasTags(["foo"]));
        }
      )
    );
    // test tag appended to existing tags
    getCompletionsAsync("tag bar", [cmd], context,
      self.makeCallback(
        function(completions) {
          completions[0].execute();
          self.assert(uriHasTags(["foo", "bar"]));
        }
      )
    );
    // test tag appended again to existing tags
    getCompletionsAsync("tag bar", [cmd], context,
      self.makeCallback(
        function(completions) {
          completions[0].execute();
          self.assert(uriHasTags(["foo", "bar"]));
        }
      )
    );
    // test add tags separated by commas
   getCompletionsAsync("tag bom, la bamba", [cmd], context,
      self.makeCallback(
        function(completions) {
          completions[0].execute();
          self.assert(uriHasTags(["foo", "bar", "bom", "la bamba"]));
          cleanup();
        }
      )
    );

    var cleanup = function() {
      // cleanup
      tagsvc.untagURI(testURI, null);
      if (!isBookmarked) {
        if (bmsvc.getBookmarkIdsForURI(testURI, {}).length)
          bmsvc.removeItem(bmsvc.getBookmarkIdsForURI(testURI, {})[0]);
      }
    };
  }
}


/* More tests that should be written:
 *   -- For the context menu bug (use cmdmanager.makeCommandSuggester())
 *   -- Coexistence of two verbs with the same name (modulo parens)
 *   -- For internationalization
 *   -- Bring over all the unit tests from parser 1 and modify them to work!
 *   -- For makeSearchCommand
 *   -- For async noun suggestion
 *   -- Test that basic nountype from array uses whole array as defaults
 *  -- single noun, multiple suggestions with different weights
 *  -- Two queries going through parser, make sure no interference
 *  -- Query through cmd manager, different query through cmd maanger,
 *     make sure 1st query is canceled.
 *
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
