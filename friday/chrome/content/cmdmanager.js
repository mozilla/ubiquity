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
    else
        cmd.execute();
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

function CommandSource()
{
    this.getCommand = function(name) {
        return {
        execute : function() { dump("Executing " + name + "."); }
        };
    }
}
