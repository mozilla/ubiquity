Components.utils.import("resource://ubiquity-modules/globals.js");

function CommandManager(cmdSource, msgService) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  if ( UbiquityGlobals.japaneseMode ) {
    this.__nlParser = new JapaneseNLParser( cmdSource.getAllCommands(),
					    jpGetNounList());
  } else
    this.__nlParser = new NLParser( cmdSource.getAllCommands(),
                                    getNounList());
}

CommandManager.prototype = {
  refresh : function() {
    this.__cmdSource.refresh();
    this.__nlParser.setCommandList( this.__cmdSource.getAllCommands());
  },

  moveIndicationUp : function(context, previewBlock) {
    this.__nlParser.indicationUp(context, previewBlock);
  },

  moveIndicationDown : function(context, previewBlock) {
    this.__nlParser.indicationDown(context, previewBlock);
  },

  preview : function(cmdName, context, previewBlock) {
    var wasPreviewShown = false;
    this.__nlParser.updateSuggestionList(cmdName, context);

    try {
      wasPreviewShown = this.__nlParser.setPreviewAndSuggestions(context,
								 previewBlock);
      //dump( "Preview block has been set to: " + $("#cmd-preview").html() + "\n");
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                cmdName + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  execute : function(cmdName, context) {
    this.__nlParser.updateSuggestionList(cmdName, context);
    var parsedSentence = this.__nlParser.getHilitedSentence();
    if (!parsedSentence)
      this.__msgService.displayMessage("No command called " + cmdName + ".");
    else
      try {
        parsedSentence.execute(context);
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while running the command '" +
                  cmdName + "'."),
           exception: e}
        );
      }
  },

  getSuggestionListNoInput: function( context ) {
    this.__nlParser.updateSuggestionList("", context);
    return this.__nlParser.getSuggestionList();
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
      cmdName = cmdName.replace(/_/g, "-");
      var cmdFunc = sandbox[objName];

      var cmd = {
        name : cmdName,
        execute : function(context, directObject, modifiers) {
          sandbox.context = context;
          return cmdFunc(directObject, modifiers);
        }
      };
      // Attatch optional metadata to command object if it exists
      if (cmdFunc.preview)
        cmd.preview = function(context, directObject, modifiers, previewBlock) {
          sandbox.context = context;
          return cmdFunc.preview(previewBlock, directObject, modifiers);
        };

      if (cmdFunc.DOLabel)
	cmd.DOLabel = cmdFunc.DOLabel;
      else
	cmd.DOLabel = null;
      if (cmdFunc.DOType)
	cmd.DOType = cmdFunc.DOType;
      else
	cmd.DOType = null;
      if (cmdFunc.modifiers)
	cmd.modifiers = cmdFunc.modifiers;
      else
	cmd.modifiers = {};

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

  getAllCommands: function() {
    return this._commands;
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

function makeDefaultCommandSuggester(commandManager) {
  dump( "makeDefaultCommandSuggester called!\n" );

  function getAvailableCommands(context) {
    dump( "getAvailableCommands called!  Selection is " + getTextSelection(context) + "\n");
    var suggestions = commandManager.getSuggestionListNoInput( context );
    var retVal = {};
    dump( "Length of suggestions is " + suggestions.length );
    for (var x in suggestions) {
      var parsedSentence = suggestions[x];
      dump( "Suggestion: " + parsedSentence._verb._name + "\n" );
      retVal[parsedSentence._verb._name] = function() {
	parsedSentence.execute(context);
      };
    }
    return retVal;
  }
  return getAvailableCommands;
}