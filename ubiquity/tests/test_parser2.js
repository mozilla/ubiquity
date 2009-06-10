Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/cmdmanager.js");
Components.utils.import("resource://ubiquity/modules/cmdutils.js");
Components.utils.import("resource://ubiquity/modules/nounutils.js");
Components.utils.import("resource://ubiquity/modules/default_feed_plugin.js");
Components.utils.import("resource://ubiquity/modules/parser/new/namespace.js");
Components.utils.import("resource://ubiquity/tests/test_suggestion_memory.js");
Components.utils.import("resource://ubiquity/tests/framework.js");

const VER = 2;
const LANG = "en";
const MAX_SUGGESTIONS = 10;

// Code duplicated with test_parser1... should be merged into
// testing_stubs.js maybe?
var fakeContextUtils = {
  getHtmlSelection: function(context) { return context.htmlSelection; },
  getSelection: function(context) { return context.textSelection; },
  getSelectionObject: function(context) {return { text: context.textSelection,
                                                  html: context.htmlSelection
                                                };}
};

function makeTestParser(lang, verbs, nouns, contextUtils) {
  return NLParser2.makeParserForLanguage(
    lang || LANG,
    verbs || [],
    nouns || [],
    contextUtils || fakeContextUtils,
    new TestSuggestionMemory());
}

// End duplicated code

// Infrastructure for asynchronous tests:
function getCompletionsAsync( input, verbs, nountypes, context, callback) {

  if (!context)
    context = { textSelection: "", htmlSelection: "" };
  var parser = makeTestParser(LANG,
                              verbs,
                              nountypes,
                              fakeContextUtils,
                              new TestSuggestionMemory());

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

function testSmokeTestParserTwo() {
  // Instantiate a ubiquity with Parser 2 and all the built-in feeds and
  // nountypes; ensure that it doesn't break.

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
    // Do a query here and make sure one of the builtin commands is
    // suggested...
    var fakeContext = { textSelection: "", htmlSelection: "" };
    nlParser.newQuery("help", fakeContext, MAX_SUGGESTIONS);
    // OK, this test is *passing* even though gUbiquity is null when I try
    // to actually run parser 2.  How can that be??
  } catch (e) {
    this.assert(false, "Error caught in smoke test: " + e );
  }
}

/* TODO: test to make context menu work with parser 2 */

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

  getCompletionsAsync( "pet b", [cmd_pet], [dog], null,
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

  getCompletionsAsync( inputWords, [cmd_wash], [dog, washingObj], null,
                       self.makeCallback(testFunc));
}

function testSimplifiedParserTwoApi() {
  /* TODO this works from command line, but exceeds maximum test
   * execution time when run in page... why?
   */
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

  getCompletionsAsync( inputWords, [cmd_wash], [dog, washingObj], null,
                       this.makeCallback(testFunc));
}

/*function testParserTwoInternationalization() {

}*/

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
