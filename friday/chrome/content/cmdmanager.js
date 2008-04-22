Components.utils.import("resource://friday-modules/cmdregistry.js");

function CommandManager(cmdSource, msgService)
{
    this.__cmdSource = cmdSource;
    this.__msgService = msgService;
}

CommandManager.prototype = {

execute : function(cmdName, context)
{
    var cmd = this.__cmdSource.getCommand(cmdName);
    if (!cmd)
        this.__msgService.displayMessage(
            "No command called " + cmdName + "."
        );
    else {
        try {
            cmd.execute(context);
        } catch (e) {
            this.__msgService.displayMessage(
                "An exception occurred: " + e
            );
        }
    }
}

};

function testCmdManagerExecutesTwoCmds()
{
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

function testCmdManagerExecutesCmd()
{
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

function testCmdManagerCatchesExceptions()
{
    var mockMsgService = {
        displayMessage : function(msg) { this.lastMsg = msg }
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

function testCmdManagerDisplaysNoCmdError()
{
    var fakeSource = { getCommand : function() { return false; } };
    var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg }
    };
    var cmdMan = new CommandManager( fakeSource, mockMsgService );

    cmdMan.execute("nonexistentcommand");
    this.assertIsDefined(mockMsgService.lastMsg,
                         "Command manager must display a message.");
}

function CommandSource(codeSources, messageService)
{
    if (codeSources.length == undefined)
        codeSources = [codeSources];

    this._codeSources = codeSources;
    this._messageService = messageService;
}

CommandSource.prototype = {
    CMD_PREFIX : "cmd_",

    DEFAULT_CMD_ICON : "http://www.mozilla.com/favicon.ico",

    getCommand : function(name)
    {
        var sandbox = Components.utils.Sandbox(window);
        var messageService = this._messageService;

        sandbox.Application = Application;
        sandbox.Components = Components;

        sandbox.displayMessage = function(msg, title) {
            messageService.displayMessage(msg, title);
        };

        var commands = {};

        for (var i = 0; i < this._codeSources.length; i++)
        {
            var code = this._codeSources[i].getCode();

            Components.utils.evalInSandbox(code, sandbox);
        }

        var self = this;

        var makeCmdForObj = function(objName) {
            var cmdName = objName.substr(self.CMD_PREFIX.length);
            cmdName = cmdName.replace(/_/g, " ");
            var cmdFunc = sandbox[objName];

            return {
                name : cmdName,
                execute : function(context) {
                    return cmdFunc(context);
                }
            };
        };

        var commandNames = [];

        for (objName in sandbox)
        {
            if (objName.indexOf(this.CMD_PREFIX) == 0)
            {
                var cmd = makeCmdForObj(objName);
                var icon = sandbox[objName].icon;

                if (!icon)
                    icon = this.DEFAULT_CMD_ICON;

                commands[cmd.name] = cmd;
                commandNames.push(
                    {name : cmd.name,
                     icon : icon}
                );
            }
        }
        CommandRegistry.commands = commandNames;
        return commands[name];
    }
};

function testCommandSourceOneCmdWorks()
{
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

function testCommandSourceTwoCodeSourcesWork()
{
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

function testCommandSourceTwoCmdsWork()
{
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

function getCommandsAutoCompleter()
{
    var Ci = Components.interfaces;
    var contractId = '@mozilla.org/autocomplete/search;1?name=commands';
    var classObj = Components.classes[contractId];
    return classObj.createInstance(Ci.nsIAutoCompleteSearch);
}

function testCommandsAutoCompleter()
{
    var ac = getCommandsAutoCompleter();

    ac = ac.QueryInterface(Components.interfaces.nsIAutoCompleteSearch);

    this.assert(ac,
                "AutoCompleter must present an " +
                "nsIAutoCompleteSearch interface");
}

function UriCodeSource(uri)
{
    this.uri = uri;
}

UriCodeSource.prototype = {
    getCode : function()
    {
        var req = new XMLHttpRequest();
        req.open('GET', this.uri, false);
        req.send(null);
        if (req.status == 0)
            return req.responseText;
        else
            /* TODO: Throw an exception instead. */
            return "";
    }
}
