function testCmdManagerExecutesTwoCmds() {
    var oneWasCalled = false;
    var twoWasCalled = false;

    var fakeSource = {
        getCommand : function(name) {
            if ( name == "cmd_one" )
                return {execute:function() {oneWasCalled = true;}};
            else
                return {execute:function() {twoWasCalled = true;}};
        }
    };

    var cmdMan = new CommandManager( fakeSource, null );

    cmdMan.execute("cmd_one");
    cmdMan.execute("cmd_two");

    this.assert(oneWasCalled, "cmd_one must be called.");
    this.assert(twoWasCalled, "cmd_two must be called.");
}

function testCmdManagerExecutesCmd() {
    var wasCalled = false;

    var fakeSource = {
        getCommand : function() {
            return {execute:function() {wasCalled = true;}};
        }
    };

    var cmdMan = new CommandManager( fakeSource, null );

    cmdMan.execute("existentcommand");
    this.assert(wasCalled, "command.execute() must be called.");
}

function testCmdManagerCatchesExceptionsInCmds() {
    var mockMsgService = {
        displayMessage : function(msg) { this.lastMsg = msg; }
    };

    var fakeSource = {
        getCommand : function() {
            return {execute:function() {throw 1;}};
        }
    };

    var cmdMan = new CommandManager(fakeSource, mockMsgService);

    cmdMan.execute("existentcommand");
    this.assert(
        mockMsgService.lastMsg.indexOf("exception occurred") >= 0,
        "Command manager must log exception."
    );
}

function testCmdManagerDisplaysNoCmdError() {
    var fakeSource = { getCommand : function() { return false; } };
    var mockMsgService = {
        displayMessage : function(msg) { this.lastMsg = msg; }
    };
    var cmdMan = new CommandManager( fakeSource, mockMsgService );

    cmdMan.execute("nonexistentcommand");
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

    var cmd = cmdSrc.getCommand("foo thing");
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
        mockMsgService.lastMsg.indexOf("exception occurred") >= 0,
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

function testCommandsAutoCompleterObeysQueryInterface() {
    var ac = getCommandsAutoCompleter();

    ac = ac.QueryInterface(Components.interfaces.nsIAutoCompleteSearch);

    this.assert(ac,
                "AutoCompleter must present an " +
                "nsIAutoCompleteSearch interface");
}

function testCommandsAutoCompleterAutocompletes() {
    CommandRegistry.commands = [
        { name : "blargy",
          icon : "narg" },
        { name : "superfoous",
          icon : "superfoous_icon" },
        { name : "foobar",
          icon : "foobar_icon" },
        { name : "foo",
          icon : "foo_icon" }
    ];

    var ac = getCommandsAutoCompleter();

    var acResult = null;

    var fakeListener = {
        onSearchResult : function(ac, result) {
            acResult = result;
        }
    };

    ac.startSearch("foo", null, null, fakeListener);

    this.assert(acResult,
                "AutoCompleter must provide a result.");

    this.assert(acResult.matchCount == 3,
                "AutoCompleter must have three results.");
    this.assert(acResult.getValueAt(0) == "foo",
                "AutoCompleter must have first result 'foo'");
    this.assert(acResult.getValueAt(1) == "foobar",
                "AutoCompleter must have second result 'foobar'");
    this.assert(acResult.getValueAt(2) == "superfoous",
                "AutoCompleter must have third result 'superfoous'");
    this.assert(acResult.getImageAt(0) == "foo_icon",
                "AutoCompleter must have first img result 'foo_icon'");
    this.assert(acResult.getImageAt(1) == "foobar_icon",
                "AutoCompleter must have second img result 'foobar_icon'");
    this.assert(acResult.getImageAt(2) == "superfoous_icon",
                "AutoCompleter must have third img result 'superfoous_icon'");
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

    var cmd = cmdSrc.getCommand("foo");
    this.assert(cmd.execute() == 1,
                "Command 'foo' should return 1 on second call.");
}

function testCommandGlobalsWork() {
    var testCode = ( "function cmd_foo() { " +
                     "  if (commandGlobals.x) " +
                     "    return ++commandGlobals.x; " +
                     "  commandGlobals.x = 1; " +
                     "  return commandGlobals.x; " +
                     "}" );

    var testCodeSource = {
        getCode : function() { return testCode; }
    };

    var cmdSrc = new CommandSource(testCodeSource);

    var cmd = cmdSrc.getCommand("foo");
    this.assert(cmd.execute() == 1,
                "Command 'foo' should return 1 on first call.");

    cmd = cmdSrc.getCommand("foo");
    this.assert(cmd.execute() == 2,
                "Command 'foo' should return 2 on second call.");
}
