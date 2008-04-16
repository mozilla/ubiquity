PrefCommands = {
    COMMANDS_PREF : "extensions.friday.commands",

    setCode : function(code)
    {
        Application.prefs.setValue(
            this.COMMANDS_PREF,
            code
        );
    },

    getCode : function()
    {
        return Application.prefs.getValue(
            this.COMMANDS_PREF,
            ""
        );
    }
};
