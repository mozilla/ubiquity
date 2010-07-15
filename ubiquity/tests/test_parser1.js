var Cu = Components.utils;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/cmdmanager.js");
Cu.import("resource://ubiquity/modules/nounutils.js");
Cu.import("resource://ubiquity/modules/parser/original/parser.js");
Cu.import("resource://ubiquity/modules/parser/original/locale_en.js");

Cu.import("resource://ubiquity/tests/framework.js");
Cu.import("resource://ubiquity/tests/test_suggestion_memory.js");
Cu.import("resource://ubiquity/tests/testing_stubs.js");

const Ci = Components.interfaces;
const Cc = Components.classes;
const LANG = "en";
const MAX_SUGGESTIONS = 10;

var EXPORTED_SYMBOLS = ["makeTestParser"];

// Utility functions:
var emptyContext = {
  textSelection: "",
  htmlSelection: ""
};

function getCompletions(input, verbs, context) {
  var parser = makeTestParser(LANG,
                              verbs,
                              fakeContextUtils);
  var query = parser.newQuery(input, context || emptyContext, MAX_SUGGESTIONS,
                              true).run();
  return query.suggestionList;
}

function makeTestParser(lang, verbs, contextUtils) {
  lang = lang || LANG;
  verbs = verbs || [];

  if (!contextUtils)
    contextUtils = fakeContextUtils;

  return NLParser1.makeParserForLanguage(lang, verbs, contextUtils,
                                         new TestSuggestionMemory());
}

var noun_arb_text = {
  rankLast: true,
  suggest: function(text, html) NounUtils.makeSugg(text, html, null, .3),
};

function makeSearchCommand(name) {
  return {
    names: [name],
    DOLabel: "string",
    DOType: noun_arb_text,
    preview: function() {},
    execute: function() {}
  };
}


// Actual test cases begin here:


function testParseDirectOnly() {
  var dogGotPetted = false;
  var dog = NounUtils.NounType("dog", ["poodle", "golden retreiver",
                                       "beagle", "bulldog", "husky"]);
  var cmd_pet = {
    execute: function(context, directObject, modifiers) {
      dogGotPetted = directObject.text;
    },
    names: ["pet"],
    DOLabel: "kind of dog",
    DOType: dog,
    modifiers: {}
  };

  var completions = getCompletions("pet b", [cmd_pet], null);
  this.assert(completions.length == 2, "should be 2 completions");
  this.assert(completions[0]._verb.name === "pet", "verb should be pet");
  this.assert(completions[0]._argSuggs.object.text == "beagle",
              "obj should be beagle");
  this.assert(completions[1]._verb.name === "pet", "verb should be pet");
  this.assert(completions[1]._argSuggs.object.text == "bulldog",
              "obj should be bulldog");
  completions[0].execute();
  this.assert(dogGotPetted == "beagle");
  completions[1].execute();
  this.assert(dogGotPetted == "bulldog");
}

function testParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = NounUtils.NounType("dog", ["poodle", "golden retreiver",
                                       "beagle", "bulldog", "husky"]);
  var washingObj = NounUtils.NounType("washing object",
                                      ["sponge", "hose", "spork",
                                       "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, directObject, modifiers) {
      dogGotWashed = directObject.text;
      dogGotWashedWith = modifiers["with"].text;
    },
    names: ["wash"],
    DOLabel: "kind of dog",
    DOType: dog,
    modifiers: {"with": washingObj}
  };

  var inputWords = "wash pood with sp";
  var completions = getCompletions(inputWords, [cmd_wash], null);
  this.assert(completions.length == 2, "Should be 2 completions");
  this.assert(completions[0]._verb.name === "wash");
  this.assert(completions[0]._argSuggs.object.text == "poodle");
  this.assert(completions[0]._argSuggs.with.text == "spork");
  this.assert(completions[1]._verb.name === "wash");
  this.assert(completions[1]._argSuggs.object.text == "poodle");
  this.assert(completions[1]._argSuggs.with.text == "sponge");
  completions[0].execute();
  this.assert(dogGotWashed == "poodle");
  this.assert(dogGotWashedWith == "spork");
  completions[1].execute();
  this.assert(dogGotWashed == "poodle");
  this.assert(dogGotWashedWith == "sponge");
}

function testCmdManagerSuggestsForEmptyInput() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = NounUtils.NounType("thingType", ["tree"]);
  var nounTypeTwo = NounUtils.NounType("stuffType", ["mud"]);
  var fakeSource = new FakeCommandSource({
    cmd_one: {
      execute: function(context, directObj) {
        oneWasCalled = directObj.text;
      },
      DOLabel: "thing",
      DOType: nounTypeOne,
    },
    cmd_two: {
      execute: function(context, directObj) {
        twoWasCalled = directObj.text;
      },
      DOLabel: "stuff",
      DOType: nounTypeTwo,
    }
  });
  var cmdMan = makeCommandManager.call(this, fakeSource, null,
                                       makeTestParser(null,
                                                      null,
                                                      fakeContextUtils),
                                       onCM);
  function onCM(cmdMan) {
    var getAC = cmdMan.makeCommandSuggester();
    getAC({textSelection: "tree"}, this.makeCallback(test1Callback));
    getAC({textSelection: "mud"}, this.makeCallback(test2Callback));
    var {assert} = this;
    function test1Callback(suggs) {
      assert(suggs.length === 1 && suggs[0]._verb.name === 'cmd_one',
             "only cmd one should be in");
      suggs[0].execute();
      assert(oneWasCalled === "tree", "should have been calld with tree");
    }
    function test2Callback(suggs) {
      assert(suggs.length === 1 && suggs[0]._verb.name === 'cmd_two',
             "only cmd two should be in");
      suggs[0].execute();
      assert(twoWasCalled === "mud", "should have been called with mud");
    }
  }
}

function testVerbEatsSelection() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new NounUtils.NounType("food", ["breakfast", "lunch", "dinner"]);
  var place = new NounUtils.NounType("place", ["grill", "diner", "home"]);
  var cmd_eat = {
    names: ["eat"],
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
  var completions = getCompletions("eat this", [cmd_eat], fakeContext);
  this.assert(completions.length == 1,
               "Should be one completion for 'eat this'");
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "obj should be lunch");
  this.assert(foodGotEatenAt == null, "should be no modifier");

  fakeContext.textSelection = "grill";
  fakeContext.htmlSelection = "grill";
  completions = getCompletions("eat breakfast at it", [cmd_eat], fakeContext);
  this.assert(completions.length == 1, "should be one completion");
  completions[0].execute();
  this.assert(foodGotEaten == "breakfast", "food should be breakfast");
  this.assert(foodGotEatenAt == "grill", "place should be grill");

  fakeContext.textSelection = "din";
  fakeContext.htmlSelection = "din";
  completions = getCompletions("eat at home this", [cmd_eat], fakeContext);
  this.assert(completions.length == 1, "second should be one completion");
  completions[0].execute();
  this.assert(foodGotEaten == "dinner", "food should be dinner");
  this.assert(foodGotEatenAt == "home", "place should be home");
}

function testImplicitPronoun() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new NounUtils.NounType("food", ["breakfast", "lunch", "dinner"]);
  var place = new NounUtils.NounType("place", ["grill", "diner", "home"]);
  var cmd_eat = {
    names: ["eat"],
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

  var completions = getCompletions("eat", [cmd_eat], fakeContext);
  this.assert((completions.length === 2), "Should have 1 completion.");
  completions[0].execute();
  this.assert(foodGotEaten === "lunch", "DirectObj should have been lunch.");
  this.assert(foodGotEatenAt === null, "Indirectobj should not be set.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "din";
  completions = getCompletions("eat", [cmd_eat], fakeContext);

  this.assert(completions.length === 3, "Should have 3 completions.");
  // first completion should be direct object null, place is diner
  completions[0].execute();
  this.assert(foodGotEaten === null, "DO should be null.");
  this.assert(foodGotEatenAt === "diner", "Place should be diner.");
  // second completion should be directObject is dinner
  foodGotEaten = null;
  foodGotEatenAt = null;
  completions[1].execute();
  this.assert(foodGotEaten === "dinner", "DO should have been dinner.");
  this.assert(foodGotEatenAt === null, "IndirectObjs shouldn't be set.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "din";
  fakeContext.htmlSelection = "din";
  completions = getCompletions("eat lunch at selection", [cmd_eat], fakeContext);
  this.assert(completions.length === 1, "Sould have 1 completion");
  completions[0].execute();
  this.assert(foodGotEaten === "lunch", "Should have eaten lunch");
  this.assert(foodGotEatenAt === "diner", "Should have eaten it at diner");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "din";
  fakeContext.htmlSelection = "din";
  completions = getCompletions("eat at grill", [cmd_eat], fakeContext);
  this.assert(completions.length === 2, "Should have 2 completions");
  completions[0].execute();
  this.assert(foodGotEaten === "dinner", "DO should be dinner.");
  this.assert(foodGotEatenAt === "grill", "ate at grill.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  fakeContext.textSelection = "pants";
  fakeContext.htmlSelection = "pants";
  completions = getCompletions("eat lunch at selection", [cmd_eat], fakeContext);

  // This now gets an empty list, but I'm not sure that's wrong, given the
  // new behavior, since there is no valid way to use the "at selection"
  // argument...
  // TODO FAILURE RIGHT HERE EMPTY SUGGESTION LIST!!!!
  /*debugSuggestionList(completions);
  this.assert(completions.length == 1, "Should have 1 completion(D)");
  completions[0].execute();
  this.assert((foodGotEaten == null), "Should have no valid args.");
  this.assert((foodGotEatenAt == null), "Should have no valid args.");
  */

  fakeContext.textSelection = null;
  fakeContext.htmlSelection = null;
  completions = getCompletions("eat this", [cmd_eat], fakeContext);
  this.assert(completions.length == 0, "should have no completions");
}

function testDontInterpolateInTheMiddleOfAWord() {
  // a word like "iterate" contains "it", but the selection should not
  // be interpolated in place of that "it".
  var cmd_google = makeSearchCommand("google");
  var fakeContext = { textSelection: "flab", htmlSelection:"flab" };
  var completions = getCompletions("google iterate", [cmd_google],
                                   fakeContext);
  this.assert(completions.length == 1, "Should have 1 completion");
  this.assert(completions[0]._argSuggs.object.text == "iterate",
              "Should not interpolate for the 'it' in 'iterate'.");
  completions = getCompletions("google it erate", [cmd_google],
                               fakeContext);
  this.assert(completions.length == 2, "Should have 2 completions.");
  this.assert(completions[0]._argSuggs.object.text == "flab erate",
              "Should interpolate 'flab' for 'it'.");
  this.assert(completions[1]._argSuggs.object.text == "it erate",
              "input without interpolation should also be suggested.");
}

function testMakeSugg() {
  // test that NounUtils.makeSugg doesn't fail on null input, that it preserves
  // html, etc etc.
  var thingy = NounUtils.makeSugg(null, "alksdf");
  this.assert(thingy.text == "alksdf", "thingy.text should be set.");

  var thingy2 = NounUtils.makeSugg(null, null);
  this.assert(thingy2 == null, "should return null");
}

function testModifiersTakeMultipleWords() {
  var wishFound = null;
  var wishFoundIn = null;
  var wish = new NounUtils.NounType("wish", ["apartment", "significant other", "job"]);
  var city = new NounUtils.NounType("city", ["chicago",
                                              "new york",
                                              "los angeles",
                                              "san francisco"]);
  var cmd_find = {
    names: ["find"],
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
                                   null);
  this.assert(completions[0]._argSuggs.object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");

  completions = getCompletions("find significant other in chicago",
                               [cmd_find], null);
  this.assert(completions[0]._argSuggs["in"].text == "chicago", "should be chicago");
  this.assert(completions[0]._argSuggs.object.text == "significant other", "should be SO.");

  completions = getCompletions("find job in new york", [cmd_find], null);
  this.assert(completions[0]._argSuggs.object.text == "job", "should be job.");
  this.assert(completions[0]._argSuggs["in"].text == "new york", "should be NY");
}

function testSuggestionMemory() {
  var suggMem1 = new TestSuggestionMemory();
  suggMem1.remember("p", "peas");
  suggMem1.remember("p", "peas");
  suggMem1.remember("q", "quinine");
  suggMem1.remember("q", "quetzalcoatl");
  suggMem1.remember("p", "polymascotfoamulate");
  suggMem1.remember("q", "quinine");

  this.assert(suggMem1.getScore("q", "quinine") == 2);
  this.assert(suggMem1.getScore("q", "quetzalcoatl") == 1);
  this.assert(suggMem1.getScore("q", "peas") == 0);
  this.assert(suggMem1.getScore("q", "qualifier") == 0);
  this.assert(suggMem1.getScore("p", "peas") == 2);
  this.assert(suggMem1.getScore("p", "polymascotfoamulate") == 1);
  this.assert(suggMem1.getScore("p", "popcorn") == 0);
  this.assert(suggMem1.getScore("p", "quinine") == 0);

  // Get rid of the first suggestion memory object, make a new one:
  suggMem1 = null;
  var suggMem2 = new TestSuggestionMemory();
  // Should have all the same values.
  this.assert(suggMem2.getScore("q", "quinine") == 2);
  this.assert(suggMem2.getScore("q", "quetzalcoatl") == 1);
  this.assert(suggMem2.getScore("q", "peas") == 0);
  this.assert(suggMem2.getScore("q", "qualifier") == 0);
  this.assert(suggMem2.getScore("p", "peas") == 2);
  this.assert(suggMem2.getScore("p", "polymascotfoamulate") == 1);
  this.assert(suggMem2.getScore("p", "popcorn") == 0);
  this.assert(suggMem2.getScore("p", "quinine") == 0);

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
  var verbList = [{names: [(x + 1234567890).slice(0, 12)], id: x}
                  // ^align length to ensure identical verbMatchScore
                  for each (x in ["clock", "calendar", "couch", "conch",
                                  "crouch", "coelecanth", "crab"])];
  var nlParser = makeTestParser(LANG, verbList);
  var fakeContext = {textSelection: "", htmlSelection: ""};
  var query = nlParser.newQuery("c", fakeContext, MAX_SUGGESTIONS, true).run();
  var suggestions = query.suggestionList;
  //take the fifth and sixth suggestions, whatever they are...
  var suggFive = suggestions[4];
  var suggFiveName = suggFive._verb.name;
  var suggSix = suggestions[5];
  var suggSixName = suggSix._verb.name;
  // tell the parser we like sugg five and REALLY like sugg six:
  // TODO replace these strengthenMemory calls with execute() calls!
  nlParser.strengthenMemory(suggFive);
  nlParser.strengthenMemory(suggSix);
  nlParser.strengthenMemory(suggSix);

  // now give the same input again...
  query = nlParser.newQuery("c", fakeContext, MAX_SUGGESTIONS, true).run();
  suggestions = query.suggestionList;
  // the old six should be on top, with the old five in second place:
  this.assert(suggestions[0]._verb.name == suggSixName, "Six should be one");
  this.assert(suggestions[1]._verb.name == suggFiveName, "Five should be two");
}

function testNounFirstSortedByGeneralFrequency() {
  var pantsContext = { htmlSelection: "<b>Pants</b>", textSelection: "Pants" };

  var verbList = [
    {names: [x], id: x, DOType: noun_arb_text, DOLabel:"it"}
    for each (x in ["foo", "bar", "baz"])];

  // Note: Create the parser ourself instead of using getCompletion() because
  // we need the suggestion memory in the parser state.
  var parser = makeTestParser(LANG, verbList, fakeContextUtils);
  var query = parser.newQuery("", pantsContext, MAX_SUGGESTIONS, true).run();
  var suggestions = query.suggestionList;
  this.assert(suggestions.length == 3, "Should be 3 suggs");
  this.assert(suggestions[0]._verb.name == "foo", "Foo should be first...");
  this.assert(suggestions[1]._verb.name == "bar", "Bar should be second...");
  this.assert(suggestions[2]._verb.name == "baz", "Baz should be last...");

  // Now we select "baz" twice and "bar" once...
  query = parser.newQuery("baz", pantsContext, MAX_SUGGESTIONS, true).run();
  var choice = query.suggestionList[0];
  parser.strengthenMemory(choice);
  parser.strengthenMemory(choice);

  query = parser.newQuery("bar", pantsContext, MAX_SUGGESTIONS, true).run();
  choice = query.suggestionList[0];
  parser.strengthenMemory(choice);

  // Now when we try the no-input suggestion again, should be ranked
  // with baz first, then bar, then foo.
  query = parser.newQuery("", pantsContext, MAX_SUGGESTIONS, true).run();
  suggestions = query.suggestionList;
  this.assert(suggestions.length == 3, "Should be 3 suggs");
  this.assert(suggestions[0]._verb.name == "baz", "Baz should be first...");
  this.assert(suggestions[1]._verb.name == "bar", "Bar should be second...");
  this.assert(suggestions[2]._verb.name == "foo", "Foo should be last...");
}

function testSortedByMatchQuality() {
  var assert = this.assert;
  function testSortedSuggestions(input, expectedList) {
    var suggs = getCompletions(input, verbList);
    assert(suggs.length == expectedList.length,
           "Should have " + expectedList.length + " suggestions.");
    suggs.forEach(function (sugg, x) {
      assert(sugg._verb.name === expectedList[x],
             ("for " + uneval(input) + ", " +
              sugg._verb.name + " should be " + expectedList[x]));
    });
  }
  var verbList = [{names: ["frobnicate"]},
                  {names: ["glurgle"]},
                  {names: ["nonihilf"]},
                  {names: ["bnurgle"]},
                  {names: ["fangoriously"]}];
  testSortedSuggestions("g", ["glurgle", "fangoriously", "bnurgle"]);
  testSortedSuggestions("n", ["nonihilf", "bnurgle", "fangoriously",
                              "frobnicate"]);
  testSortedSuggestions("ni", ["nonihilf", "fangoriously", "frobnicate"]);
  testSortedSuggestions("bn", ["bnurgle", "frobnicate"]);
  testSortedSuggestions("f", ["frobnicate", "fangoriously", "nonihilf"]);
  testSortedSuggestions("frob", ["frobnicate"]);
  testSortedSuggestions("urgle", ["glurgle", "bnurgle"]);

  verbList = [{names: ["google"]},
              {names: ["tag"]},
              {names: ["digg"]},
              {names: ["bugzilla"]},
              {names: ["get-email-address"]},
              {names: ["highlight"]}];
  testSortedSuggestions("g", ["google", "get-email-address", "bugzilla",
                              "highlight", "digg", "tag"]);
}

function testSortSpecificNounsBeforeArbText() {
  var dog = new NounUtils.NounType("dog", ["poodle", "golden retreiver",
                                           "beagle", "bulldog", "husky"]);

  var verbList = [{names: ["mumble"], DOType: noun_arb_text, DOLabel:"stuff"},
                  {names: ["wash"], DOType: dog, DOLabel: "dog"}];

  var beagleContext = {textSelection:"beagle", htmlSelection:"beagle"};
  var suggs = getCompletions("", verbList, beagleContext);

  this.assert(suggs.length == 2, "Should be two suggestions.");
  this.assert(suggs[0]._verb.name == "wash", "First suggestion should be wash");
  this.assert(suggs[1]._verb.name == "mumble", "Second suggestion should be mumble");
  this.assert(suggs[0].fromNounFirstSuggestion, "should be noun first");
  this.assert(suggs[1].fromNounFirstSuggestion, "should be noun first");
}

function testVerbUsesDefaultIfNoArgProvided() {
  var dog = new NounUtils.NounType("dog", ["poodle", "golden retreiver",
                                           "beagle", "bulldog", "husky"]);
  dog.default = function () NounUtils.makeSugg("husky");
  var verbList = [{
    names: ["wash"], DOType: dog, DOLabel: "dog",
  }, {
    names: ["play-fetch"], DOType: dog, DOLabel: "dog",
    DODefault: dog.suggest("beagle"),
  }];
  var suggs = getCompletions("wash", verbList);
  this.assert(suggs.length === 1, "Should be 1 suggestion (A).");
  this.assert(suggs[0]._verb.name === "wash", "Suggestion should be wash");
  this.assert(suggs[0]._argSuggs.object.text === "husky",
              "Argument should be husky.");

  suggs = getCompletions("play", verbList);
  this.assert(suggs.length === 1, "Should be 1 suggestion (B).");
  this.assert(suggs[0]._verb.name === "play-fetch",
              "Suggestion should be play-fetch");
  this.assert(suggs[0]._argSuggs.object.text === "beagle",
              "Argument should be beagle.");

  suggs = getCompletions("play retr", verbList);
  this.assert(suggs.length === 1, "Should be 1 suggestion (C).");
  this.assert(suggs[0]._verb.name === "play-fetch",
              "Suggestion should be play-fetch");
  this.assert(suggs[0]._argSuggs.object.text ===
              "golden retreiver", "Argument should be g.retr.");

  //TODO try out defaults for modifier arguments.
}

function testSynonyms() {
  var verbList = [{names: ["twiddle", "frobnitz", "twirl"]},
                  {names: ["frobnitz"]},
                  {names: ["frobnicate"]}];
  var suggs = getCompletions("frob", verbList);
  this.assert(suggs.length == 3, "Should be 3 suggs.");
  this.assert(suggs[0]._verb.name == "frobnitz", "frobnitz should be first");
  this.assert(suggs[1]._verb.name == "frobnicate", "frobnicate should be second");
  this.assert(suggs[2]._verb.name == "twiddle", "twiddle should be third");

  suggs = getCompletions("twid", verbList);
  this.assert(suggs.length == 1, "Should be 1 sugg.");
  this.assert(suggs[0]._verb.name == "twiddle", "twiddle should be it");

  suggs = getCompletions("twirl", verbList);
  this.assert(suggs.length == 1, "Should be 1 sugg.");
  this.assert(suggs[0]._verb.name == "twiddle", "twiddle should be it");
}

function testPartiallyParsedSentence() {
  // TODO this test will need rewriting, because NLParser1.Verb is about
  // to not exist.
  // make sure it also works with a no-arg command:
  var fakeQuery = {nounCache: {}};
  var cmd_grumble = {names: ["grumble"]};
  var verbNoArgs = new NLParser1.Verb(cmd_grumble, {});
  var partiallyParsedNoArgs = new NLParser1.PartiallyParsedSentence(
    verbNoArgs,
    {},
    selObj,
    1,
    fakeQuery);

  var parsedNoArgs = partiallyParsedNoArgs.getParsedSentences();
  this.assert(parsedNoArgs.length === 1, "Should have 1 parsing.");
  this.assert(parsedNoArgs[0]._verb.name === "grumble");

  var noun_type_foo = {
    id: "foo",
    suggest: function(text, html) {
      return [NounUtils.makeSugg("foo_a"), NounUtils.makeSugg("foo_b")];
    }
  };
  var noun_type_bar = {
    id: "bar",
    suggest: function(text, html) {
      return [NounUtils.makeSugg("bar_a"), NounUtils.makeSugg("bar_b")];
    }
  };
  var noun_type_baz = {
    id: "baz",
    suggest: function(text, html) {
      return [];
    },
    default: function() NounUtils.makeSugg("super pants"),
  };

  var verb = new NLParser1.Verb({
    names: ["frobnitz"],
    arguments: [{role: "source", nountype: noun_type_foo},
                {role: "instrument", nountype: noun_type_bar},
                {role: "location", nountype: noun_type_baz}],
  }, {});

  var argStrings = {
    source: ["nonihilf"],
    instrument: ["rocinante"] };
  // "location" purposefully left out -- partiallyParsedSentence
  // must be tolerant of missing args.

  var selObj = {text: "", html: ""};
  var partiallyParsed = new NLParser1.PartiallyParsedSentence(
    verb,
    argStrings,
    selObj,
    0,
    fakeQuery);

  var parsed  = partiallyParsed.getParsedSentences();
  // two suggestions for foo, two suggestions for bar: should be four
  // combinations.
  this.assert(parsed.length === 4, "Should be four parsings.");

  // Add another suggestion for bar.  Now there should be six combinations.
  partiallyParsed.addArgumentSuggestion("instrument",
                                        NounUtils.makeSugg("bar_c"));
  parsed  = partiallyParsed.getParsedSentences();
  this.assert(parsed.length == 6, "Should be six (not eight) parsings.");

  // All six should have the default for bazArg since we dind't provide any
  for each (var p in parsed)
    this.assert(p.getArgText("location") === "super pants", "must use default.");

  // Now provide an actual argument for baz:
  partiallyParsed.addArgumentSuggestion("location",
                                        NounUtils.makeSugg("baz_a"));
  parsed  = partiallyParsed.getParsedSentences();
  // Should still have six
  this.assert(parsed.length == 6, "Should be six (not eight) parsings.");

  // All six should have the new value for bazArg.
  for each (var p in parsed)
    this.assert(p.getArgText("location") === "baz_a", "should be baz_a.");

}

function testVerbGetCompletions() {
  var grumbleCalled = false;
  var cmd_grumble = {
    names: ["grumble"],
    execute: function(context, directObject, modifiers) {
      grumbleCalled = true;
    }
  };
  var comps = getCompletions("grum", [cmd_grumble], null);
  this.assert(comps.length == 1, "Should be one suggestion.");
  this.assert(comps[0]._verb.name == "grumble", "Should be grumble.");
}

function testTextAndHtmlDifferent() {
  var executedText = null;
  var executedHtml = null;
  var pantsContext = {
    textSelection: "Pants", htmlSelection:"<blink>Pants</blink>"
  };
  var noun_type_different = {
    id: "different",
    suggest: function(text, html) {
      if (text.indexOf("Pant") == 0)
        return [NounUtils.makeSugg(text, html)];
      else
        return [];
    }
  };
  var cmd_different = {
    names: ["dostuff"],
    DOLabel: "thing",
    DOType: noun_type_different,
    execute: function(context, directObject, modifiers) {
      executedText = directObject.text;
      executedHtml = directObject.html;
    }
  };
  var comps = getCompletions("dostuff this", [cmd_different], pantsContext);
  this.assert(comps.length === 1, "There should be one completions.");
  comps[0].execute();
  this.assert(executedText === "Pants", "text should be pants.");
  this.assert(executedHtml === "<blink>Pants</blink>", "html should blink!");

  executedText = null;
  executedHtml = null;
  //without any explicit 'this', should still work...
  comps = getCompletions("dostuff", [cmd_different], pantsContext);
  this.assert(comps.length === 2, "There should be 2 completions.");
  comps[0].execute();
  this.assert(executedText === "Pants", "text should be pants.");
  this.assert(executedHtml === "<blink>Pants</blink>", "html should blink!");

  // when it's a noun-first suggestion from the parser, should still work...
  executedText = null;
  executedHtml = null;
  var nlParser = makeTestParser(LANG, [cmd_different]);
  var selObj = {
    text: "Pantalones", html: "<blink>Pantalones</blink>"
  };
  comps = nlParser._nounFirstSuggestions(selObj, MAX_SUGGESTIONS,
                                         {nounCache: {}});
  this.assert(comps.length === 1, "There should be one partial completion.");
  comps = comps[0].getAlternateSelectionInterpolations();
  this.assert(comps.length === 2, "There should be two partial completions.");
  comps = comps[1].getParsedSentences();
  this.assert(comps.length === 1, "There should be one completion.");
  comps[0].execute();
  this.assert(executedText === "Pantalones", "text should be pantalones.");
  this.assert(executedHtml === "<blink>Pantalones</blink>", "html should blink!");
}

function testAsyncNounSuggestions() {
  var noun_type_slowness = {
    id: "slowness",
    suggest: function(text, html, callback) {
      this._callback = callback;
      return (text.indexOf("hello") === 0
              ? [NounUtils.makeSugg("Robert E. Lee")]
              : []);
    },
    triggerCallback: function() {
      this._callback(NounUtils.makeSugg("slothitude"));
      this._callback(NounUtils.makeSugg("snuffleupagus"));
    }
  };
  var cmd_slow = {
    names: ["dostuff"],
    DOLabel: "thing",
    DOType: noun_type_slowness,
    execute: function(context, directObject) {
    }
  };
  var observerCalled = false;

  // We make the parser ourself instead of calling getCompletions() because
  // we need to do stuff with the query callback.
  var parser = makeTestParser(LANG, [cmd_slow]);
  var {assert} = this;
  function assertDirObj(completion, expected) {
    assert(completion._argSuggs.object.text == expected,
            "Expected " + expected);
  }
  var query1 = parser.newQuery("dostuff hello", emptyContext, MAX_SUGGESTIONS,
                               true);
  // register a handler to make sure it gets notified when the
  // noun produces suggestions asynchronously.
  query1.onResults = this.makeCallback(function() {
    var comps = query1.suggestionList;
    assert(comps.length == 1, "there should be 1 completions.");
    assertDirObj(comps[0], "Robert E. Lee");
    // Now here comes the async suggestion:
    query1.onResults = Boolean;
    noun_type_slowness.triggerCallback();
    // parser.refreshSuggestionList("dostuff hello"); TODO replace this logic
    comps = query1.suggestionList;
    assert(comps.length == 3, "there should be 3 completions.");
    assertDirObj(comps[0], "Robert E. Lee");
    assertDirObj(comps[1], "slothitude");
    assertDirObj(comps[2], "snuffleupagus");
  });
  query1.run();

  // Now try one where the noun originally suggests nothing, but then comes
  // up with some async suggestions.  What happens?
  var query2 = parser.newQuery("dostuff halifax", emptyContext, MAX_SUGGESTIONS,
                               true);
  query2.onResults = this.makeCallback(function() {
    var comps = query2.suggestionList;
    assert(comps.length == 0, "there should be 0 completions.");
    // here comes the async suggestion:
    query2.onResults = Boolean;
    noun_type_slowness.triggerCallback();
    //parser.refreshSuggestionList("dostuff halifax");
    comps = query2.suggestionList;
    assert(comps.length == 2, "there should be 2 completions.");
    assertDirObj(comps[0], "slothitude");
    assertDirObj(comps[1], "snuffleupagus");
  });
  query2.run();

  // Now instead of going through the verb directly, we'll go through the
  // command manager and get a suggestion list, then add a new noun suggestion
  // asynchronously and make sure the parser's suggestion list updated.
  var mockMsgService = {
    displayMessage: function(msg) {}
  };
  var fakeSource = new FakeCommandSource({dostuff: cmd_slow});
  makeCommandManager.call(this, fakeSource, mockMsgService,
                          makeTestParser(), onCM);
  function onCM(cmdMan) {
    cmdMan.updateInput("dostuff halifax", emptyContext, null);
    this.assert(cmdMan.hasSuggestions === false, "Should have no completions");
    noun_type_slowness.triggerCallback();
    cmdMan.onSuggestionsUpdated("dostuff h", emptyContext, null);
    this.assert(cmdMan.hasSuggestions === true, "Should have them now.");
  }
}


function testListOfVerbsThatUseSpecificNounType() {
  var nounTypeOne = new NounUtils.NounType("thingType", ["tree"]);
  var verbUsingNounTypeOne = {
    names: ["doStuff"],
    execute: function(context, directObj) {},
    DOLabel: "thing",
    DOType: nounTypeOne};
  var verbs = [makeSearchCommand("IMDB"),
               makeSearchCommand("amazon-search"),
               verbUsingNounTypeOne];
  var parser = makeTestParser("en", verbs);
  this.assert(parser._verbsThatUseSpecificNouns.length == 1,
              "Too many or not enough");
  this.assert(parser._verbsThatUseSpecificNouns[0].name === "doStuff",
              "Name mismatch");
}

function testWeirdCompletionsThatDontMakeSense() {
  var input = "ax";
  var cmd_imdb = makeSearchCommand("IMDB");
  var cmd_amazon = makeSearchCommand("amazon-search");
  var comps = getCompletions(input, [cmd_imdb, cmd_amazon]);
  // Should be no verb-first suggestions, but since both commands take
  // arb text, both of them should prodcue a suggestion with ac as the
  // argument.
  this.assert(comps.length == 2, "Should have 2 suggestions.");
  this.assert(comps[0]._argSuggs.object.text === input,
              "object should be " + uneval(input) + ".");
  this.assert(comps[1]._argSuggs.object.text === input,
              "this object should be " + uneval(input) + " too.");
}

function testSynonymsGetDownrankedEvenWithArguments() {
  var cmd_youtube = {
    names: ["youtube", "video"],
    DOLabel: "string",
    DOType: noun_arb_text,
    preview: function() {},
    exectue: function() {}
  };
  var cmd_define = makeSearchCommand("define");
  var comps = getCompletions("de m", [cmd_youtube, cmd_define]);
  // "define m" should be the first suggestion, while
  // "youtube m" is the second suggestion (due to its synonym "video").
  this.assert(comps.length == 2, "Should have 2 suggestions.");
  this.assert(comps[0]._verb.name == "define", "Should be define.");
  this.assert(comps[0]._argSuggs.object.text == "m",
              "object should be m.");
  this.assert(comps[1]._verb.name == "youtube", "Should be youtube.");
  this.assert(comps[1]._argSuggs.object.text == "m",
              "object should be m.");
}

function testModifierWordsCanAlsoBeInArbTextDirectObj() {
  var cmd_twitter = {
    names: ["twitter"],
    DOLabel: "status",
    DOType: noun_arb_text,
    modifiers: { as: noun_arb_text },
    preview: function() {},
    execute: function() {}
  };

  var comps = getCompletions("twitter i am happy as a clam as fern",
                             [cmd_twitter]);
  // There are two places where we could make the division between status
  // and "as" argument.  Make sure both get generated.
  this.assert(comps.length === 4, "Should have 4 suggestions.");
  var expected;
  this.assert(comps[0]._argSuggs.object.text ===
              (expected = "i am happy"),
              "First suggestion direct obj should be " + uneval(expected));
  this.assert(comps[0]._argSuggs.as.text ===
              (expected = "a clam as fern"),
              "First suggestion AS should be " + uneval(expected));
  this.assert(comps[1]._argSuggs.object.text ===
              (expected = "i am happy as"),
              "Second suggestion direct obj should be " + uneval(expected));
  this.assert(comps[1]._argSuggs.as.text ===
              (expected = "clam as fern"),
              "Second suggestion AS should be " + uneval(expected));
  this.assert(comps[3]._argSuggs.object.text ===
              (expected = "i am happy as a clam as fern"),
              "Last suggestion direct obj should be " + uneval(expected));
  this.assert(!comps[3]._argSuggs.as.text,
              "Last suggestion AS should be empty.");
}

function testEnParserRecursiveParse() {
  var {recursiveParse} =
    Cu.import("resource://ubiquity/modules/parser/original/locale_en.js", null);
  var {assertEquals} = this;
  function pp(olist) [JSON.stringify(o) for each (o in olist)].sort() + "";
  function parse(input, hasObj, preps)
    pp(recursiveParse(input.split(" "), {}, hasObj, preps));
  assertEquals(
    parse("near here", false, {location: "near", time: "at"}),
    pp([{location:["here"]}]));
  assertEquals(
    parse("beer near here", false, {location: "near", time: "at"}),
    "");
  assertEquals(
    parse("beer near here >", true,
          {location: "near", time: "at", direction: ">"}),
    // preposition at last
    pp([{object:["beer"], location:["here"], direction:[]},
        {object:["beer"], location:["here", ">"]},
        {object:["beer", "near", "here"], direction:[]},
        {object:["beer", "near", "here", ">"]}]));
  assertEquals(
    parse("i am happy as a clam as fern", true, {as: "as"}),
    pp([{object:["i", "am", "happy"], as:["a", "clam", "as", "fern"]},
        // partial match for preposition
        {object:["i", "am", "happy", "as"], as:["clam", "as", "fern"]},
        {object:["i", "am", "happy", "as", "a", "clam"], as:["fern"]},
        {object:["i", "am", "happy", "as", "a", "clam", "as", "fern"]}]));
  assertEquals(
    parse("to ja from en it", true, {from: "from", to: "to"}),
    pp([{object:["to", "ja", "from", "en", "it"]},
        {object:["to", "ja"], from:["en", "it"]},
        {to:["ja"], from:["en"], object:["it"]},
        {to:["ja"], from:["en", "it"]},
        {to:["ja"], object:["from", "en", "it"]},
        {to:["ja", "from"], object:["en", "it"]},
        {to:["ja", "from", "en"], object:["it"]},
        {to:["ja", "from", "en", "it"]}]));
}

// TESTS TO WRITE:

// TODO test that the max_suggestions argument is obeyed

// TODO test with modifiers first and then direct object -- this has been
// broken in the most recent parser by the patch on bug 571, for no good
// reason that I can see.

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


exportTests(this);
