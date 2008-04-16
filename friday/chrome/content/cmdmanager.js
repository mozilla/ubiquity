function CommandManager()
{
}

CommandManager.prototype = {

hasCommand : function( name )
{
    return true;
},

executeCommand : function( name )
{
    dump( "running command " + name );
},

}
