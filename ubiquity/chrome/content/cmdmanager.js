function CommandManager(cmdSource, msgService, languageCode) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  this.__nlParser = NLParser.makeParserForLanguage( languageCode,
						    cmdSource.getAllCommands(),
						    cmdSource.getAllNounTypes() );
}

CommandManager.prototype = {
  refresh : function() {
    this.__cmdSource.refresh();
    this.__nlParser.setCommandList( this.__cmdSource.getAllCommands());
    this.__nlParser.setNounList( this.__cmdSource.getAllNounTypes());
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp : function(context, previewBlock) {
    this.__hilitedSuggestion -= 1;
    if (this.__hilitedSuggestion < 0) {
      this.__hilitedSuggestion = this.__nlParser.getNumSuggestions() - 1;
    }
    this._preview(context, previewBlock);
  },

  moveIndicationDown : function(context, previewBlock) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__nlParser.getNumSuggestions() - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._preview(context, previewBlock);
  },

  _preview : function(context, previewBlock) {
    var wasPreviewShown = false;
    try {
      wasPreviewShown = this.__nlParser.setPreviewAndSuggestions(context,
								 previewBlock,
								 this.__hilitedSuggestion);
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                this.__lastInput + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  updateInput : function(input, context, previewBlock) {
    /* Return true if we created any suggestions, false if we didn't
     * or if we had nowhere to put them.
     */
    this.__lastInput = input;
    this.__nlParser.updateSuggestionList(input, context);
    this.__hilitedSuggestion = 0;
    if ( this.__nlParser.getNumSuggestions() == 0 )
      return false;
    if (previewBlock)
      return this._preview(context, previewBlock);
    else
      return false;
  },

  execute : function(context) {
    var parsedSentence = this.__nlParser.getSentence(this.__hilitedSuggestion);
    if (!parsedSentence)
      this.__msgService.displayMessage("No command called " + this.__lastInput + ".");
    else
      try {
	this.__nlParser.strengthenMemory(this.__lastInput, parsedSentence);
        parsedSentence.execute(context);
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while running the command '" +
                  this.__lastInput + "'."),
           exception: e}
        );
      }
  },

  hasSuggestions: function() {
    return (this.__nlParser.getNumSuggestions() > 0);
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
  this._nounTypes = [];
}

CommandSource.prototype = {
  CMD_PREFIX : "cmd_",
  NOUN_PREFIX : "noun_",

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
        icon : cmdFunc.icon,
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

      var propsToCopy = [
        "DOLabel",
        "DOType",
	"DODefault",
        "author",
        "homepage",
        "contributors",
        "license",
        "description",
        "help"
      ];

      propsToCopy.forEach(function(prop) {
        if (cmdFunc[prop])
          cmd[prop] = cmdFunc[prop];
        else
          cmd[prop] = null;
      });

      if (cmdFunc.modifiers) {
	cmd.modifiers = cmdFunc.modifiers;
      } else {
	cmd.modifiers = {};
      }
      if (cmdFunc.modifierDefaults) {
	cmd.modifierDefaults = cmdFunc.modifierDefaults;
      } else {
	cmd.modifierDefaults = {};
      }
      return cmd;
    };

    var commandNames = [];
    var nounTypes = [];

    for (objName in sandbox) {
      if (objName.indexOf(this.CMD_PREFIX) == 0) {
        var cmd = makeCmdForObj(objName);
        var icon = sandbox[objName].icon;

        commands[cmd.name] = cmd;
        commandNames.push({id: objName,
                           name : cmd.name,
                           icon : icon});
      }
      if (objName.indexOf(this.NOUN_PREFIX) == 0) {
	nounTypes.push( sandbox[objName] );
      }
    }
    this._commands = commands;
    this.commandNames = commandNames;
    this._nounTypes = nounTypes;
  },

  getAllCommands: function() {
    return this._commands;
  },

  getAllNounTypes: function() {
    return this._nounTypes;
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

  function getAvailableCommands(context) {
    commandManager.refresh();
    var suggestions = commandManager.getSuggestionListNoInput( context );
    var retVal = {};
    for each (let parsedSentence in suggestions) {
      let sentenceClosure = parsedSentence;
      let titleCasedName = parsedSentence._verb._name;
      titleCasedName = titleCasedName[0].toUpperCase() + titleCasedName.slice(1);
      retVal[titleCasedName] = function() {
	sentenceClosure.execute(context);
      };

	  let suggestedCommand = commandManager.__cmdSource.getCommand(parsedSentence._verb._name);
	  if(suggestedCommand.icon)
		retVal[titleCasedName].icon = suggestedCommand.icon;

    }
    return retVal;
  }
  return getAvailableCommands;
}