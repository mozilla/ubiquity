fridaySetup = {
startup : function()
{
    friday = new Friday(
        document.getElementById("transparent-msg-panel"),
        document.getElementById("cmd-entry")
        );
},

shutdown : function()
{
}
}

window.addEventListener("load", fridaySetup.startup, false);
window.addEventListener("unload", fridaySetup.shutdown, false);
