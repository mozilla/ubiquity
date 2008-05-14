var EXPORTED_SYMBOLS = ["CommandRegistry"];

var CommandRegistry = {
    _commands : [],

    set commands(commands) {
        this._commands = commands;
    },

    get commands() {
        return this._commands;
    }
};
