/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["CommandManager",
                        "IterableCollection",
                        "CompositeCollection",
                        "CommandSource",
                        "makeDefaultCommandSuggester"];

Components.utils.import("resource://ubiquity-modules/utils.js");

function CommandManager(cmdSource, msgService, parser) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  this.__nlParser = parser;
  this.__nlParser.setCommandList(cmdSource.getAllCommands());
  this.__nlParser.setNounList(cmdSource.getAllNounTypes());
  this.__cmdSource.parser = this.__nlParser;
  this.__queuedPreview = null;
}

CommandManager.prototype = {
  refresh : function CM_refresh() {
    this.__cmdSource.refresh();
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp : function CM_moveIndicationUp(context, previewBlock) {
    this.__hilitedSuggestion -= 1;
    if (this.__hilitedSuggestion < 0) {
      this.__hilitedSuggestion = this.__nlParser.getNumSuggestions() - 1;
    }
    this._previewAndSuggest(context, previewBlock);
  },

  moveIndicationDown : function CM_moveIndicationDown(context, previewBlock) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__nlParser.getNumSuggestions() - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._previewAndSuggest(context, previewBlock);
  },

  _renderSuggestions : function CMD__renderSuggestions(elem) {
    var content = "";
    var suggList = this.__nlParser.getSuggestionList();
    var suggNumber = this.__nlParser.getNumSuggestions();


    for (var x = 0; x < suggNumber; x++) {
      var suggText = suggList[x].getDisplayText();
      var suggIconUrl = suggList[x].getIcon();
      var suggIcon = "";
      if(suggIconUrl) {
        suggIcon = "<img src=\"" + suggIconUrl + "\"/>";
      }
      suggText = "<div class=\"cmdicon\">" + suggIcon + "</div>&nbsp;" +
	suggText;
      if ( x == this.__hilitedSuggestion ) {
        content += "<div class=\"hilited\"><div class=\"hilited-text\">" +
	  suggText + "</div>";
        content += "</div>";
      } else {
        content += "<div class=\"suggested\">" + suggText + "</div>";
      }
    }
    elem.innerHTML = content;
  },

  _renderPreview : function CM__renderPreview(context, previewBlock) {
    var doc = previewBlock.ownerDocument;
    var wasPreviewShown = false;

    try {
      var activeSugg = this.__nlParser.getSentence(this.__hilitedSuggestion);
      if ( activeSugg ) {
        var self = this;
        function queuedPreview() {
          // Set the preview contents.
          if (self.__queuedPreview == queuedPreview)
            activeSugg.preview(context, doc.getElementById("preview-pane"));
        };
        this.__queuedPreview = queuedPreview;
        Utils.setTimeout(this.__queuedPreview, activeSugg.previewDelay);
      }

      var evt = doc.createEvent("HTMLEvents");
      evt.initEvent("preview-change", false, false);
      doc.getElementById("preview-pane").dispatchEvent(evt);

      wasPreviewShown = true;
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                this.__lastInput + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  _previewAndSuggest : function CM__previewAndSuggest(context, previewBlock) {
    var doc = previewBlock.ownerDocument;
    if (!doc.getElementById("suggestions")) {
      // Set the initial contents of the preview block.
      previewBlock.innerHTML = ('<div id="suggestions"></div>' +
                                '<div id="preview-pane"></div>');
    }

    this._renderSuggestions(doc.getElementById("suggestions"));
    return this._renderPreview(context, previewBlock);
  },

  updateInput : function CM_updateInput(input, context, previewBlock) {
    /* Return true if we created any suggestions, false if we didn't
     * or if we had nowhere to put them.
     */
    this.__lastInput = input;
    this.__nlParser.updateSuggestionList(input, context);
    this.__hilitedSuggestion = 0;
    if ( this.__nlParser.getNumSuggestions() == 0 )
      return false;
    if (previewBlock)
      return this._previewAndSuggest(context, previewBlock);
    else
      return false;
  },

  onSuggestionsUpdated : function CM_onSuggestionsUpdated(input,
                                                          context,
                                                          previewBlock) {
    // Called when we're notified of a newly incoming suggestion
    this.__nlParser.refreshSuggestionList(input);
    if (previewBlock)
      this._previewAndSuggest(context, previewBlock);
  },

  execute : function CM_execute(context) {
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

  hasSuggestions: function CM_hasSuggestions() {
    return (this.__nlParser.getNumSuggestions() > 0);
  },

  getSuggestionListNoInput: function CM_getSuggestionListNoInput( context ) {
    this.__nlParser.updateSuggestionList("", context);
    return this.__nlParser.getSuggestionList();
  },

  copySuggestionToInput : function CM_copySuggestionToInput(context,
                                                            previewBlock,
                                                            textbox) {
    if(this.hasSuggestions()) {

      var selObj = this.__nlParser.getSelectionObject(context);
      var suggText = this.__nlParser.getSentence(this.__hilitedSuggestion)
                                    .getCompletionText(selObj);
      this.updateInput(suggText,
                       context,
                       previewBlock);

      //Update the textbox value. This may be better done by returning the
      //suggestion value so not to expose the text box.
      textbox.value = suggText;
    }
  },

  setDisabledStatus : function CM_setDisabledStatus(){
    return this.__cmdSource.setDisabledStatus();
  }
};

function IterableCollection(itemList) {
  this.__iterator__ = function iterator() {
    for (var i = 0; i < itemList.length; i++)
      yield itemList[i];
  };
}

function CompositeCollection(collectionList) {
  this.__iterator__ = function iterator() {
    for (var i = 0; i < collectionList.length; i++) {
      let collection = collectionList[i];

      for (var item in collection)
        yield item;
    }
  };
}

function CommandSource(codeSources, messageService, sandboxFactory) {
  if (!codeSources.__iterator__) {
    if (codeSources.constructor.name == "Array")
      codeSources = new IterableCollection(codeSources);
    else
      codeSources = new IterableCollection([codeSources]);
  }

  this._sandboxFactory = sandboxFactory;
  this._codeSources = codeSources;
  this._messageService = messageService;
  this._commands = [];
  this._codeCache = null;
  this._nounTypes = [];
  this.parser = null;
}

CommandSource.prototype = {
  CMD_PREFIX : "cmd_",
  NOUN_PREFIX : "noun_",

  refresh : function CS_refresh() {
    var shouldLoadCommands = false;
    var prevCodeCache = this._codeCache ? this._codeCache : {};

    this._codeCache = {};
    for (var codeSource in this._codeSources) {
      var code = codeSource.getCode();

      if (typeof(codeSource.id) == "undefined")
        throw new Error("Code source ID is undefined for code: " + code);
      this._codeCache[codeSource.id] = {code: code,
                                        codeSections: codeSource.codeSections};

      if (!(codeSource.id in prevCodeCache) ||
          prevCodeCache[codeSource.id].code != code)
        shouldLoadCommands = true;
    }

    if (!shouldLoadCommands)
      for (var id in prevCodeCache)
        if (!(id in this._codeCache))
          shouldLoadCommands = true;

    if (shouldLoadCommands)
      this._loadCommands();
  },

  _loadCommands : function CS__loadCommands() {
    var commands = {};
    var sandboxes = {};

    for (var codeSource in this._codeSources) {
      var id = codeSource.id;
      var code = this._codeCache[id].code;
      var codeSections = this._codeCache[id].codeSections;
      sandboxes[id] = this._sandboxFactory.makeSandbox(codeSource);

      try {
        if (!codeSections)
          codeSections = [{length: code.length,
                           filename: id}];
        this._sandboxFactory.evalInSandbox(code,
                                           sandboxes[id],
                                           codeSections);
      } catch (e) {
        this._messageService.displayMessage(
          {text: "An exception occurred while loading code.",
           exception: e}
        );
      }
    }

    var self = this;

    var makeCmdForObj = function CS_makeCmdForObj(sandbox, objName) {
      var cmdName = objName.substr(self.CMD_PREFIX.length);
      cmdName = cmdName.replace(/_/g, "-");
      var cmdFunc = sandbox[objName];

      var cmd = {
        name : cmdName,
        icon : cmdFunc.icon,
        execute : function CS_execute(context, directObject, modifiers) {
          sandbox.context = context;
          return cmdFunc(directObject, modifiers);
        },
        disabled:false
      };
      // Attach optional metadata to command object if it exists
      if (cmdFunc.preview)
        cmd.preview = function CS_preview(context, directObject, modifiers,
                                          previewBlock) {
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
        "help",
	"synonyms",
        "previewDelay"
      ];

      propsToCopy.forEach(function CS_copyProp(prop) {
        if (cmdFunc[prop])
          cmd[prop] = cmdFunc[prop];
        else
          cmd[prop] = null;
      });

      if (cmd.previewDelay === null)
        // Default delay to wait before calling a preview function, in ms.
        cmd.previewDelay = 250;

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

    for each (sandbox in sandboxes) {
      for (objName in sandbox) {
        if (objName.indexOf(this.CMD_PREFIX) == 0) {
          var cmd = makeCmdForObj(sandbox, objName);
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
    }
    this._commands = commands;
    this.commandNames = commandNames;
    this._nounTypes = nounTypes;

    if (this.parser) {
      this.parser.setCommandList(this._commands);
      this.parser.setNounList(this._nounTypes);
    }
    this.setDisabledStatus();
  },

  getAllCommands: function CS_getAllCommands() {
    return this._commands;
  },

  getAllNounTypes: function CS_getAllNounTypes() {
    return this._nounTypes;
  },

  getCommand : function CS_getCommand(name) {
    if (this._codeCache === null)
      this.refresh();

    if (this._commands[name])
      return this._commands[name];
    else
      return null;
  },

  setDisabledStatus: function CS_setDisabledStatus() {
    try {
      var Application = Components.classes["@mozilla.org/fuel/application;1"]
                        .getService(Components.interfaces.fuelIApplication);
    } catch (e) {
      // We're in xpcshell, just assume we have no disabled commands
      // for now.

      // TODO: This should be cleaner; ideally, the specific place that
      // we get out list of decoupled commands from should be decoupled
      // from the code that actually disables the commands, so that
      // we can easily unit test.
      return;
    }

    var name,
        suppressthese=Application.prefs.getValue("extensions.ubiquity.suppresscommands", '/');
    if (suppressthese.substr(-1)!=='/')
      suppressthese=suppressthese+'/';
    for (name in this._commands)
      this._commands[name].disabled=suppressthese.search('/'+name+'/')!==-1;
    if (this.parser) this.parser.setCommandList(this._commands);
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
      retVal[titleCasedName] = function execute() {
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