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

var EXPORTED_SYMBOLS = ["CommandSource"];

Components.utils.import("resource://ubiquity-modules/collection.js");
Components.utils.import("resource://ubiquity-modules/eventhub.js");

function CommandSource(codeSources, messageService, sandboxFactory,
                       disabledCommands) {
  if (!codeSources.__iterator__) {
    if (codeSources.constructor.name == "Array")
      codeSources = new IterableCollection(codeSources);
    else
      codeSources = new IterableCollection([codeSources]);
  }

  if (!disabledCommands)
    disabledCommands = {};

  this._hub = new EventHub();
  this._hub.attachMethods(this);
  this._sandboxFactory = sandboxFactory;
  this._codeSources = codeSources;
  this._sbInfos = {};
  this._messageService = messageService;
  this._commands = [];
  this._codeCache = null;
  this._nounTypes = [];
  this._pageLoadFuncLists = [];
  this._disabledCommands = disabledCommands;
  this.parser = null;
}

CommandSource.prototype = {
  CMD_PREFIX : "cmd_",
  NOUN_PREFIX : "noun_",

  onPageLoad : function CS_onPageLoad(window) {
    if (this._codeCache === null)
      this.refresh();

    for (var i = 0; i < this._pageLoadFuncLists.length; i++)
      for (var j = 0; j < this._pageLoadFuncLists[i].length; j++) {
        var pageLoadFunc = this._pageLoadFuncLists[i][j];
        try {
          pageLoadFunc(window);
        } catch (e) {
          this._messageService.displayMessage(
            {text: "An exception occurred while running page-load code.",
             exception: e}
          );
        }
      }
  },

  refresh : function CS_refresh() {
    var shouldLoadCommands = false;
    var prevCodeCache = this._codeCache ? this._codeCache : {};
    var ops = {load: [],
               remove: [],
               get isEmpty() {
                 return (this.load.length || this.remove.length);
               }};

    this._codeCache = {};
    for (var codeSource in this._codeSources) {
      var code = codeSource.getCode();

      if (typeof(codeSource.id) == "undefined")
        throw new Error("Code source ID is undefined for code: " + code);
      this._codeCache[codeSource.id] = {code: code,
                                        codeSections: codeSource.codeSections};

      if (!(codeSource.id in prevCodeCache) ||
          prevCodeCache[codeSource.id].code != code)
        ops.load.push(codeSource);
    }

    for (var id in prevCodeCache)
      if (!(id in this._codeCache))
        ops.remove.push(id);

    if (ops.isEmpty)
      this._loadCommands(ops);
  },

  _isCmdDisabled : function CS__isCmdDisabled(name) {
    return this._disabledCommands[name];
  },

  _setCmdDisabled : function CS__setCmdDisabled(name, value) {
    if (this._disabledCommands[name] != value) {
      this._disabledCommands[name] = value;
      this._hub.notifyListeners("disabled-command-change",
                                {name: name,
                                 value: value});
    }
  },

  _makeCmdForObj : function CS__makeCmdForObj(sandbox, objName) {
    var cmdName = objName.substr(this.CMD_PREFIX.length);
    cmdName = cmdName.replace(/_/g, "-");
    var cmdFunc = sandbox[objName];
    var self = this;

    var cmd = {
      name : cmdName,
      icon : cmdFunc.icon,
      execute : function CS_execute(context, directObject, modifiers) {
        sandbox.context = context;
        return cmdFunc(directObject, modifiers);
      },
      get disabled() { return self._isCmdDisabled(cmdName); },
      set disabled(value) { return self._setCmdDisabled(cmdName, value); }
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
  },

  _executeOps : function CS__executeOps(ops) {
    for (var i = 0; i < ops.remove.length; i++)
      delete this._sbInfos[ops.remove[i]];

    for (i = 0; i < ops.load.length; i++) {
      var codeSource = ops.load[i];
      var id = codeSource.id;
      var code = this._codeCache[id].code;
      var codeSections = this._codeCache[id].codeSections;
      var sbInfo = {
        sandbox: this._sandboxFactory.makeSandbox(codeSource),
        commands: {},
        commandNames: [],
        nounTypes: [],
        pageLoadFuncs: []
      };

      try {
        if (!codeSections)
          codeSections = [{length: code.length,
                           filename: id}];
        this._sandboxFactory.evalInSandbox(code,
                                           sbInfo.sandbox,
                                           codeSections);
      } catch (e) {
        this._messageService.displayMessage(
          {text: "An exception occurred while loading code.",
           exception: e}
        );
      }

      for (objName in sbInfo.sandbox) {
        if (objName.indexOf(this.CMD_PREFIX) == 0) {
          var cmd = this._makeCmdForObj(sbInfo.sandbox, objName);
          var icon = sbInfo.sandbox[objName].icon;

          sbInfo.commands[cmd.name] = cmd;
          sbInfo.commandNames.push({id: objName,
                                    name: cmd.name,
                                    icon: icon});
        }
        if (objName.indexOf(this.NOUN_PREFIX) == 0)
          sbInfo.nounTypes.push( sbInfo.sandbox[objName] );
      }

      if (sbInfo.sandbox.pageLoadFuncs)
        sbInfo.pageLoadFuncs = sbInfo.sandbox.pageLoadFuncs;

      this._sbInfos[id] = sbInfo;
    }
  },

  _loadCommands : function CS__loadCommands(ops) {
    var commandNames = [];
    var nounTypes = [];
    var pageLoadFuncLists = [];
    var commands = {};

    this._executeOps(ops);

    for (id in this._sbInfos) {
      var sbInfo = this._sbInfos[id];
      commandNames = commandNames.concat(sbInfo.commandNames);
      nounTypes = nounTypes.concat(sbInfo.nounTypes);
      for (name in sbInfo.commands)
        commands[name] = sbInfo.commands[name];
      if (sbInfo.pageLoadFuncs.length > 0)
        pageLoadFuncLists.push(sbInfo.pageLoadFuncs);
    }

    this._commands = commands;
    this.commandNames = commandNames;
    this._nounTypes = nounTypes;
    this._pageLoadFuncLists = pageLoadFuncLists;

    if (this.parser) {
      this.parser.setCommandList(this._commands);
      this.parser.setNounList(this._nounTypes);
    }
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
  }
};
