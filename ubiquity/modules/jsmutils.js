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

function _getUrlBasename(url) {
  var start = url.lastIndexOf("/") + 1;
  var end = url.lastIndexOf(".");

  return url.slice(start, end);
}

function Import(url, jsmodule) {
  var jsmName;
  if (typeof(jsmodule) == "undefined") {
    jsmodule = {};
    jsmName = _getUrlBasename(url);
    if (!jsmName)
      throw new Error("Couldn't generate name for " + url);
  }

  if (this._sandboxContext) {
    var context = this._sandboxContext;
    if (!(url in context.modules))
      _loadIntoContext(url, context);

    var sandbox = context.modules[url];

    for (var i = 0; i < sandbox.EXPORTED_SYMBOLS.length; i++) {
      var name = sandbox.EXPORTED_SYMBOLS[i];
      jsmodule[name] = sandbox[name];
    }
  } else {
    Components.utils.import(url, jsmodule);
  }

  if (jsmName)
    this[jsmName] = jsmodule;
}

function setSandboxContext(sandboxFactory) {
  if (this._sandboxContext)
    throw new Error("Sandbox context is already set.");

  this._sandboxContext = {
    factory: sandboxFactory,
    modules: {}
  };
}

function _loadIntoContext(url, context) {
  var sandbox = context.factory.makeSandbox();
  sandbox._sandboxContext = context;

  var request = Components.
                classes["@mozilla.org/xmlextras/xmlhttprequest;1"].
                createInstance();

  request.open("GET", url, false);
  request.overrideMimeType("text/javascript");
  request.send(null);
  // TODO: What if request failed?
  var code = request.responseText;

  context.modules[url] = sandbox;
  context.factory.evalInSandbox(code, sandbox);
  if (!sandbox.EXPORTED_SYMBOLS)
    throw new Error("JSModule does not define EXPORTED_SYMBOLS: " + url);
}

function exportPublicSymbols() {
  var exportedSymbols = [];

  for (name in this)
    if (name.charAt(0) != "_")
      exportedSymbols.push(name);

  this["EXPORTED_SYMBOLS"] = exportedSymbols;
}

var Utils = {
  _Application : null,
  get Application() {
    if (!this._Application)
      this._Application = Components.classes["@mozilla.org/fuel/application;1"]
                          .createInstance();
    return this._Application;
  }
};

exportPublicSymbols();
