Components.utils.import("resource://friday-modules/cmdregistry.js");

function CommandManager(cmdSource, msgService)
{
    this.__cmdSource = cmdSource;
    this.__msgService = msgService;
}

CommandManager.prototype = {

execute : function(cmdName)
{
    var cmd = this.__cmdSource.getCommand(cmdName);
    if (!cmd)
        this.__msgService.displayMessage(
            "No command called " + cmdName + "."
        );
    else {
        try {
            cmd.execute();
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

function CommandSource(codeSource)
{
    this._codeSource = codeSource;
}

CommandSource.prototype = {
    CMD_PREFIX : "cmd_",

    getCommand : function(name)
    {
        var code = this._codeSource.getCode();

        var sandbox = Components.utils.Sandbox(window);
        var commands = {};

        url = function(spec) {
            var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            return ios.newURI(spec, null, null);
        };

        sandbox.Application = Application;
        sandbox.url = url;

        Components.utils.evalInSandbox(code, sandbox);

        var self = this;

        var makeCmdForObj = function(objName) {
            var cmdName = objName.substr(self.CMD_PREFIX.length);
            cmdName = cmdName.replace(/_/g, " ");
            var cmdFunc = sandbox[objName];

            return {
                name : cmdName,
                execute : function() {
                    return cmdFunc();
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
                    icon = "";

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
