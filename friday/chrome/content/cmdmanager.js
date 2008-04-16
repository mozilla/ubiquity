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
},

};

function testCmdManagerExecutesCmd()
{
    var wasCalled = false;

    var fakeSource = {
    getCommand : function() {
            return {execute:function() {wasCalled = true;}}
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

        //var context = {blah:"foo"};
        //eval(code, context);
        var sandbox = Components.utils.Sandbox("http://www.example.com");
        var commands = {};

        Components.utils.evalInSandbox(code, sandbox);
        for (objName in sandbox)
        {
            if (objName.indexOf(this.CMD_PREFIX) == 0)
            {
                var cmdName = objName.substr(this.CMD_PREFIX.length);
                cmdName = cmdName.replace(/_/g, " ");
                var cmdFunc = sandbox[objName];

                commands[cmdName] = {
                    execute : function() { return cmdFunc(); }
                };
            }
        }
        return commands[name];
    }
};

function testCommandSource()
{
    var testCode = "function cmd_foo_thing() { return 5; }";
    var testCodeSource = {
        getCode : function() { return testCode; }
    };

    var cmdSrc = new CommandSource(testCodeSource);
    this.assert(!cmdSrc.getCommand("nonexistent"),
                "Nonexistent commands shouldn't exist.");

    cmd = cmdSrc.getCommand("foo thing");
    this.assert(cmd, "Sample command should exist.");
    this.assert(cmd.execute() == 5,
                "Sample command should execute properly.");
}
