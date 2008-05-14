Components.utils.import("resource://friday-modules/cmdregistry.js");

// Global storage for use between multiple executions of commands.
var commandGlobals = {};

function CommandManager(cmdSource, msgService) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
}

CommandManager.prototype = {
  refresh : function() {
    this.__cmdSource.refresh();
  },

  execute : function(cmdName, context) {
    var cmd = this.__cmdSource.getCommand(cmdName);
    if (!cmd)
      this.__msgService.displayMessage("No command called " + cmdName + ".");
    else {
      try {
        cmd.execute(context);
      } catch (e) {
        this.__msgService.displayMessage("An exception occurred: " + e);
      }
    }
  }
};

function CommandSource(codeSources, messageService) {
  if (codeSources.length == undefined)
    codeSources = [codeSources];

  this._codeSources = codeSources;
  this._messageService = messageService;
  this._sandboxTarget = CommandSource.sandboxTarget;
  this._commands = [];
  this._codeCache = [];
}

CommandSource.sandboxTarget = this;

CommandSource.prototype = {
  CMD_PREFIX : "cmd_",

  DEFAULT_CMD_ICON : "http://www.mozilla.com/favicon.ico",

  SANDBOX_SYMBOLS_TO_IMPORT : ["Application", "Components", "window",
                               "commandGlobals"],

  refresh : function() {
    for (var i = 0; i < this._codeSources.length; i++) {
      var code = this._codeSources[i].getCode();
      this._codeCache[i] = code;
    }
    this._loadCommands();
  },

  _loadCommands : function() {
    var sandbox = Components.utils.Sandbox(this._sandboxTarget);
    var messageService = this._messageService;

    for each (symbolName in this.SANDBOX_SYMBOLS_TO_IMPORT) {
      if (this._sandboxTarget[symbolName] &&
          !sandbox[symbolName]) {
        sandbox[symbolName] = this._sandboxTarget[symbolName];
      }
    }

    sandbox.displayMessage = function(msg, title, icon) {
      messageService.displayMessage(msg, title, icon);
    };

    var commands = {};

    for (var i = 0; i < this._codeSources.length; i++) {
      var code = this._codeCache[i];

      try {
        Components.utils.evalInSandbox(code, sandbox);
      } catch (e) {
        messageService.displayMessage(
          "An exception occurred while loading code: "+e
        );
      }
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

    for (objName in sandbox) {
      if (objName.indexOf(this.CMD_PREFIX) == 0) {
        var cmd = makeCmdForObj(objName);
        var icon = sandbox[objName].icon;

        if (!icon)
          icon = this.DEFAULT_CMD_ICON;

        commands[cmd.name] = cmd;
        commandNames.push({name : cmd.name,
                           icon : icon});
      }
    }

    this._commands = commands;
    CommandRegistry.commands = commandNames;
  },

  getCommand : function(name) {
    if (this._codeCache.length == 0)
      this.refresh();
    else
      this._loadCommands();

    if (this._commands[name])
      return this._commands[name];
    else
      return null;
  }
};

function getCommandsAutoCompleter() {
  var Ci = Components.interfaces;
  var contractId = "@mozilla.org/autocomplete/search;1?name=commands";
  var classObj = Components.classes[contractId];
  return classObj.createInstance(Ci.nsIAutoCompleteSearch);
}

function UriCodeSource(uri) {
  this.uri = uri;
}

UriCodeSource.prototype = {
  getCode : function() {
    var req = new XMLHttpRequest();
    req.open('GET', this.uri, false);
    req.send(null);
    if (req.status == 0)
      return req.responseText;
    else
      // TODO: Throw an exception instead.
      return "";
  }
};
