function CommandManager(cmdSource, msgService) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
}

CommandManager.prototype = {
  refresh : function() {
    this.__cmdSource.refresh();
  },

  __getSuggestionContent : function(cmdName) {
    var content = "Suggestions: ";

    var suggestions = [];
    var cmds = this.__cmdSource.commandNames;

    for (var i = 0; i < cmds.length; i++) {
      if (cmds[i].name.indexOf(cmdName) != -1)
        suggestions.push(cmds[i].name);
    }
    if (suggestions.length == 0)
      return null;

    for (i = 0; i < suggestions.length - 1; i++) {
      content += "<b>" + suggestions[i] + "</b>, ";
    }
    content += "<b>" + suggestions[suggestions.length - 1] + "</b>";

    return content;
  },

  preview : function(cmdName, context, previewBlock) {
    var wasPreviewShown = false;

    var cmd = this.__cmdSource.getCommand(cmdName);
    if (cmd && cmd.preview) {
      try {
        cmd.preview(context, previewBlock);
        wasPreviewShown = true;
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while previewing the command '" +
                  cmd.name + "'."),
           exception: e}
          );
      }
    } else {
      var content;

      if (cmd)
        // Command exists, but has no preview; provide a default one.
        content = "Executes the <b>" + cmd.name + "</b> command.";
      else
        content = this.__getSuggestionContent(cmdName);

      if (content) {
        previewBlock.innerHTML = content;
        wasPreviewShown = true;
      }
    }
    return wasPreviewShown;
  },

  execute : function(cmdName, context) {
    var cmd = this.__cmdSource.getCommand(cmdName);
    if (!cmd)
      this.__msgService.displayMessage("No command called " + cmdName + ".");
    else
      try {
        cmd.execute(context);
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while running the command '" +
                  cmd.name + "'."),
           exception: e}
        );
      }
  }
};

function CommandSource(codeSources, messageService, sandboxFactory) {
  if (codeSources.length == undefined)
    codeSources = [codeSources];

  if (sandboxFactory == undefined)
    sandboxFactory = new SandboxFactory();
  this._sandboxFactory = sandboxFactory;
  this._codeSources = codeSources;
  this._messageService = messageService;
  this._commands = [];
  this._codeCache = [];
}

CommandSource.prototype = {
  CMD_PREFIX : "cmd_",

  refresh : function() {
    for (var i = 0; i < this._codeSources.length; i++) {
      var code = this._codeSources[i].getCode();
      this._codeCache[i] = code;
    }
    this._loadCommands();
  },

  _loadCommands : function() {
    var sandbox = this._sandboxFactory.makeSandbox();

    var commands = {};

    for (var i = 0; i < this._codeSources.length; i++) {
      var code = this._codeCache[i];

      try {
        this._sandboxFactory.evalInSandbox(code, sandbox);
      } catch (e) {
        this._messageService.displayMessage(
          {text: "An exception occurred while loading code.",
           exception: e}
        );
      }
    }

    var self = this;

    var makeCmdForObj = function(objName) {
      var cmdName = objName.substr(self.CMD_PREFIX.length);
      cmdName = cmdName.replace(/_/g, " ");
      var cmdFunc = sandbox[objName];

      var cmd = {
        name : cmdName,
        execute : function(context) {
          sandbox.context = context;
          return cmdFunc();
        }
      };

      if (cmdFunc.preview)
        cmd.preview = function(context, previewBlock) {
          sandbox.context = context;
          return cmdFunc.preview(previewBlock);
        };

      return cmd;
    };

    var commandNames = [];

    for (objName in sandbox)
      if (objName.indexOf(this.CMD_PREFIX) == 0) {
        var cmd = makeCmdForObj(objName);
        var icon = sandbox[objName].icon;

        commands[cmd.name] = cmd;
        commandNames.push({name : cmd.name,
                           icon : icon});
      }

    this._commands = commands;
    this.commandNames = commandNames;
  },

  getCommand : function(name) {
    if (this._codeCache.length == 0)
      this.refresh();

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

function RemoteUriCodeSource(uri) {
  this.uri = uri;
  this._code = "";

  var self = this;

  // TODO: Retrieve the code on a timer.

  var req = new XMLHttpRequest();
  req.open('GET', this.uri, true);
  req.overrideMimeType("text/javascript");
  req.onreadystatechange =   function RemoteUriCodeSource_onXhrChange() {
    if (req.readyState == 4)
      if (req.status == 200)
        self._code = req.responseText;
      else {
        // TODO: What should we do? Display a message?
      }
  };

  req.send(null);
};

RemoteUriCodeSource.prototype = {
  getCode : function() {
    return this._code;
  }
};

function UriCodeSource(uri) {
  this.uri = uri;
}

UriCodeSource.prototype = {
  getCode : function() {
    var req = new XMLHttpRequest();
    req.open('GET', this.uri, false);
    req.overrideMimeType("text/javascript");
    req.send(null);
    if (req.status == 0)
      return req.responseText;
    else
      // TODO: Throw an exception instead.
      return "";
  }
};
