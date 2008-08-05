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
  }
};

function getTextSelection(context) {
  return "";
}

function getHtmlSelection(context) {
  return "";
}

function getNounList() {
  return [];
}

function testCmdManagerExecutesTwoCmds() {
  var oneWasCalled = false;
  var twoWasCalled = false;
  var pblock = {};

  var fakeSource = new FakeCommandSource(
    {
      cmd_one: {execute:function() {oneWasCalled = true;}},
      cmd_two: {execute:function() {twoWasCalled = true;}}
    });

  var cmdMan = new CommandManager(fakeSource, null);

  cmdMan.updateInput("cmd_one");
  cmdMan.execute();
  cmdMan.updateInput("cmd_two");
  cmdMan.execute();
  this.assert(oneWasCalled, "cmd_one must be called.");
  this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd() {
  var wasCalled = false;

  var fakeSource = new FakeCommandSource (
    {
      existentcommand:{execute:function() {wasCalled = true;}}
    }
  );

  var cmdMan = new CommandManager(fakeSource, null);
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

  var cmdMan = new CommandManager(fakeSource, mockMsgService);

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
  var cmdMan = new CommandManager(fakeSource, mockMsgService);

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
  var dog = new NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);
  var cmd_pet = {
    execute: function(context, directObject, modifiers) {
      dogGotPetted = directObject;
    },
    name: "pet",
    DOLabel: "kind of dog",
    DOType: dog,
    modifiers: {}
  };
  var verb = new Verb(cmd_pet);
  var inputWords = ["b"];

  var fakeContext = null;
  var completions = verb.getCompletions( inputWords, fakeContext );
  this.assert( completions.length == 2 );
  this.assert( completions[0]._verb._name == "pet");
  this.assert( completions[0]._DO == "beagle");
  this.assert( completions[1]._verb._name == "pet");
  this.assert( completions[1]._DO == "bulldog");
  completions[0].execute(fakeContext);
  this.assert( dogGotPetted == "beagle");
  completions[1].execute(fakeContext);
  this.assert( dogGotPetted == "bulldog" );
}

function testParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new NounType( "dog", ["poodle", "golden retreiver",
				"beagle", "bulldog", "husky"]);
  var washingObj = new NounType( "washing object", ["sponge", "hose", "spork",
						    "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, directObject, modifiers) {
      dogGotWashed = directObject;
      dogGotWashedWith = modifiers["with"];
    },
    name:"wash",
    DOLabel:"kind of dog",
    DOType: dog,
    modifiers: {"with": washingObj}
  };

  var verb = new Verb(cmd_wash);
  var inputWords = ["pood", "with", "sp"];
  var fakeContext = null;
  var completions = verb.getCompletions( inputWords, fakeContext );
  this.assert( completions.length == 2 );
  this.assert( completions[0]._verb._name == "wash");
  this.assert( completions[0]._DO == "poodle");
  this.assert( completions[0]._modifiers["with"] == "sponge");
  this.assert( completions[1]._verb._name == "wash");
  this.assert( completions[1]._DO == "poodle");
  this.assert( completions[1]._modifiers["with"] == "spork");
  completions[0].execute(fakeContext);
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "sponge");
  completions[1].execute(fakeContext);
  this.assert( dogGotWashed == "poodle");
  this.assert( dogGotWashedWith == "spork");
}
