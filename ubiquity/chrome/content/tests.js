const LANG = "en";

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

function getTextSelection(context) {
  if (context)
    if (context.textSelection)
      return context.textSelection;
  return "";
}

function getHtmlSelection(context) {
  if (context)
    if (context.htmlSelection)
      return context.htmlSelection;
  return "";
}

function getNounList() {
  return [];
}

function testCmdManagerExecutesTwoCmds() {
  var mockMsgService = {
    displayMessage: function(msg) { dump(msg); }
  };
  var oneWasCalled = false;
  var twoWasCalled = false;
  var pblock = {};

  var fakeSource = new FakeCommandSource(
    {
      cmd_one: {execute:function() {oneWasCalled = true;}},
      cmd_two: {execute:function() {twoWasCalled = true;}}
    });

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("cmd_one");
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute();
  cmdMan.updateInput("cmd_two");
  this.assert(cmdMan.__nlParser.getNumSuggestions() == 1, "should have 1");
  cmdMan.execute();
  this.assert(oneWasCalled, "cmd_one must be called.");
  this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd() {
  var mockMsgService = {
    displayMessage: function(msg) { dump(msg); }
  };
  var wasCalled = false;

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {wasCalled = true;}}
    }
  );

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);
  cmdMan.updateInput("existentcommand");
  cmdMan.execute();
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

  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("existentcommand");
  cmdMan.execute();
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
  var cmdMan = new CommandManager(fakeSource, mockMsgService, LANG);

  cmdMan.updateInput("nonexistentcommand");
  cmdMan.execute();
  this.assertIsDefined(mockMsgService.lastMsg,
                       "Command manager must display a message.");
}

function testCommandSourceOneCmdWorks() {
  var testCode = "function cmd_foo_thing() { return 5; }";
  var testCodeSource = {
    getCode : function() { return testCode; }
  };

  var cmdSrc = new CommandSource(testCodeSource);
  this.assert(!cmdSrc.getCommand("nonexistent"),
              "Nonexistent commands shouldn't exist.");

  var cmd = cmdSrc.getCommand("foo-thing");
  this.assert(cmd, "Sample command should exist.");
  this.assert(cmd.execute() == 5,
              "Sample command should execute properly.");
}

function testCommandSourceTwoCodeSourcesWork() {
  var testCode1 = "function cmd_foo() { return 5; }\n";
  var testCode2 = "function cmd_bar() { return 6; }\n";

  var testCodeSource1 = {
    getCode : function() { return testCode1; }
  };

  var testCodeSource2 = {
    getCode : function() { return testCode2; }
  };

  var cmdSrc = new CommandSource([testCodeSource1,
                                  testCodeSource2]);
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
    getCode : function() { return "awegaewg"; }
  };

  var cmdSrc = new CommandSource(testCodeSource, mockMsgService);
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
    getCode : function() { return testCode; }
  };

  var cmdSrc = new CommandSource(testCodeSource);
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
    getCode : function() { return testCode; }
  };

  var cmdSrc = new CommandSource(testCodeSource);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on second call.");
}

function testCommandGlobalsWork() {
  var testCode = ( "function cmd_foo() { " +
                   "  if (globals.x) " +
                   "    return ++globals.x; " +
                   "  globals.x = 1; " +
                   "  return globals.x; " +
                   "}" );

  var testCodeSource = {
    getCode : function() { return testCode; }
  };

  var sandboxFactory = new SandboxFactory({globals: {}});

  var cmdSrc = new CommandSource(testCodeSource, undefined, sandboxFactory);

  var cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 1,
              "Command 'foo' should return 1 on first call.");

  cmdSrc.refresh();

  cmd = cmdSrc.getCommand("foo");
  this.assert(cmd.execute() == 2,
              "Command 'foo' should return 2 on second call.");
}

function testSandboxSupportsJs17() {
  var sbf = new SandboxFactory({});
  var s = sbf.makeSandbox();
  sbf.evalInSandbox("let k = 1;", s);
}

function _testImport(test, jsmu) {
  test.assert(!("jsmutils" in jsmu));
  jsmu.Import("resource://ubiquity-modules/jsmutils.js");
  test.assert(jsmu.jsmutils);
  test.assert("Import" in jsmu.jsmutils);
}

function testImportWorksWithSandboxContext() {
  var url = "resource://ubiquity-modules/jsmutils.js";
  var jsmu = {};
  Components.utils.import(url, jsmu);

  this.assert(!("_sandboxContext" in jsmu));
  jsmu.setSandboxContext(new SandboxFactory({}));
  this.assert("_sandboxContext" in jsmu);
  this.assert(!("_sandboxContext" in this));

  this.assert(!(url in jsmu._sandboxContext.modules));
  _testImport(this, jsmu);
  this.assert(url in jsmu._sandboxContext.modules);
}

function testImportWorksWithoutSandboxContext() {
  var jsmu = {};
  Components.utils.import("resource://ubiquity-modules/jsmutils.js", jsmu);

  _testImport(this, jsmu);
  this.assert(!("_sandboxContext" in jsmu));
}

function testParseDirectOnly() {
  var dogGotPetted = false;
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
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
  var verb = new NLParser.EnVerb(cmd_pet);
  var inputWords = ["b"];

  var selObject = {
    text:"",
    html:""
  };
  var completions = verb.getCompletions( inputWords, selObject );
  this.assert( completions.length == 2, "should be 2 completions" );
  this.assert( completions[0]._verb._name == "pet", "verb should be pet");
  this.assert( completions[0]._DO.text == "beagle", "obj should be beagle");
  this.assert( completions[1]._verb._name == "pet", "verb should be pet");
  this.assert( completions[1]._DO.text == "bulldog", "obj should be bulldog");
  completions[0].execute();
  this.assert( dogGotPetted == "beagle");
  completions[1].execute();
  this.assert( dogGotPetted == "bulldog" );
}

function testParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new CmdUtils.NounType( "dog", ["poodle", "golden retreiver",
				"beagle", "bulldog", "husky"]);
  var washingObj = new CmdUtils.NounType( "washing object",
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

  var verb = new NLParser.EnVerb(cmd_wash);
  var inputWords = ["pood", "with", "sp"];
  var selObject = {
    text:"",
    html:""
  };
  var completions = verb.getCompletions( inputWords, selObject);
  this.assert( completions.length == 2 );
  this.assert( completions[0]._verb._name == "wash");
  this.assert( completions[0]._DO.text == "poodle");
  this.assert( completions[0]._modifiers["with"].text == "sponge");
  this.assert( completions[1]._verb._name == "wash");
  this.assert( completions[1]._DO.text == "poodle");
  this.assert( completions[1]._modifiers["with"].text == "spork");
  completions[0].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "sponge");
  completions[1].execute();
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "spork");
}

function testCmdManagerSuggestsForEmptyInput() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var nounTypeOne = new CmdUtils.NounType( "thingType", ["tree"] );
  var nounTypeTwo = new CmdUtils.NounType( "stuffType", ["mud"] );
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
  var getAC = makeDefaultCommandSuggester(cmdMan);
  var suggDict = getAC({textSelection:"tree"});
  this.assert( suggDict["Cmd_one"] );
  this.assert( !suggDict["Cmd_two"] );
  var execute = suggDict["Cmd_one"];
  execute();
  this.assert( oneWasCalled == "tree" );
  suggDict = getAC({textSelection:"mud"});
  this.assert( !suggDict["Cmd_one"] );
  this.assert( suggDict["Cmd_two"] );
  execute = suggDict["Cmd_two"];
  execute();
  this.assert( twoWasCalled == "mud" );
}

function testVerbEatsSelection() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new CmdUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new CmdUtils.NounType( "place", ["grill", "diner", "home"]);
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
  var verb = new NLParser.EnVerb(cmd_eat);
  var selObject = { text: "lunch", html:"lunch" };
  var completions = verb.getCompletions(["this"], selObject);
  this.assert( completions.length == 1, "Should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "obj should be lunch");
  this.assert(foodGotEatenAt == null, "should be no modifier");

  selObject.text = "grill";
  selObject.html = "grill";
  completions = verb.getCompletions(["breakfast", "at", "it"], selObject);
  dump( "WTF dude there are " + completions.length + " completions.\n");
  this.assert( completions.length == 1, "should be one completion" );
  completions[0].execute();
  this.assert(foodGotEaten == "breakfast", "food should be breakfast");
  this.assert(foodGotEatenAt == "grill", "place should be grill");

  selObject.text = "din";
  completions = verb.getCompletions(["at", "home", "this"], selObject);
  this.assert( completions.length == 1 );
  completions[0].execute();
  this.assert(foodGotEaten == "dinner", "food should be dinner");
  this.assert(foodGotEatenAt == "home", "place should be grill");
}

function testImplicitPronoun() {
  var foodGotEaten = null;
  var foodGotEatenAt = null;
  var food = new CmdUtils.NounType( "food", ["breakfast", "lunch", "dinner"]);
  var place = new CmdUtils.NounType( "place", ["grill", "diner", "home"]);
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
  var verb = new NLParser.EnVerb(cmd_eat);
  var selObject = { text: "lunch", html:"lunch" };

  var completions = verb.getCompletions([], selObject);
  this.assert( (completions.length == 2), "Should have 2 completions.");
  completions[0].execute();
  this.assert((foodGotEaten == "lunch"), "DirectObj should have been lunch.");
  this.assert((foodGotEatenAt == null), "Indirectobj should not be set.");
  this.assert((!completions[1]._DO.text), "second completion should have no DO.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions([], selObject);

  this.assert( completions.length == 3, "Should have 3 completions.");
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
  // third completion should have all arguments blank.
  this.assert((!completions[2]._DO.text), "second completion should have no DO.");
  this.assert((!completions[2]._modifiers["at"].text), "and no at mod either." );

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["lunch", "at", "selection"], selObject);
  this.assert( completions.length == 1, "Sould have 1 completion");
  completions[0].execute();
  this.assert(foodGotEaten == "lunch", "Should have eaten lunch");
  this.assert(foodGotEatenAt == "diner", "Should have eaten it at diner");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "din";
  completions = verb.getCompletions(["at", "grill"], selObject);
  this.assert( completions.length == 1, "Should have 1 completion");
  completions[0].execute();
  this.assert((foodGotEaten == null), "DO should not be set.");
  this.assert((foodGotEatenAt == "grill"), "ate at grill.");

  foodGotEaten = null;
  foodGotEatenAt = null;
  selObject.text = "pants";
  completions = verb.getCompletions([], selObject);
  this.assert( completions.length == 1);
  completions[0].execute();
  this.assert((foodGotEaten == null), "Should have no valid args.");
  this.assert((foodGotEatenAt == null), "Should have no valid args.");

  selObject.text = null;
  selObject.html = null;
  completions = verb.getCompletions(["this"], selObject);
  this.assert( completions.length == 0, "should have no completions");
}

