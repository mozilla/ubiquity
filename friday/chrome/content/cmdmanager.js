function CommandManager(cmdSource, msgService)
{
    this.__cmdSource = cmdSource;
    this.__msgService = msgService;
}

CommandManager.prototype = {

execute : function(cmdName)
{
    cmd = this.__cmdSource.getCommand(cmdName);
    if (!cmd)
        this.__msgService.displayMessage(
            "No command called " + cmdName + "."
            );
    else
        cmd.execute();
},

};

function CommandSource()
{
    this.getCommand = function(name) {
        return {
        execute : function() { dump("Executing " + name + "."); }
        };
    }
}
