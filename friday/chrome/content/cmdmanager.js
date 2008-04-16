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

function testCmdManagerDisplaysNoCmdError()
{
    var fakeSource = { getCommand : function() { return false; } };
    var mockMsgService = {
    displayMessage : function(msg) { this.lastMsg = msg }
    };
    var cmdMan = new CommandManager( fakeSource, mockMsgService );

    cmdMan.execute("nonexistentcommand");
    this.assertIsDefined(mockMsgService.lastMsg);
}

function CommandSource()
{
    this.getCommand = function(name) {
        return {
        execute : function() { dump("Executing " + name + "."); }
        };
    }
}
