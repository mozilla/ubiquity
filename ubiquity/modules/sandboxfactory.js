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

EXPORTED_SYMBOLS = ["SandboxFactory"];

Components.utils.import("resource://ubiquity/modules/utils.js");

const Cc = Components.classes;
const Ci = Components.interfaces;

var defaultTarget = this;

function SandboxFactory(globals, target, ignoreForcedProtection) {
  maybeInitialize();
  this._ignoreForcedProtection = ignoreForcedProtection;
  if (typeof(target) == "undefined")
    target = defaultTarget;
  this._target = target;

  if (globals == undefined)
    globals = {};

  if (typeof(globals) == "function")
    this._makeGlobals = globals;
  else
    this._makeGlobals = function defaultMakeGlobals(id) {
      return globals;
    };
}

SandboxFactory.protectedFileUriPrefix = "";
SandboxFactory.fileUri = "";
SandboxFactory.isFilenameReported = false;
SandboxFactory.isInitialized = false;

SandboxFactory.unmungeUrl = function unmungeUrl(url) {
  if (this.isInitialized &&
      this.isFilenameReported &&
      url.indexOf(this.protectedFileUriPrefix) == 0)
    return url.slice(this.protectedFileUriPrefix.length);
  return url;
};

function maybeInitialize() {
  if (!SandboxFactory.isInitialized) {
    var ioService = Cc["@mozilla.org/network/io-service;1"].
                    getService(Ci.nsIIOService);

    var resProt = ioService.getProtocolHandler("resource")
                  .QueryInterface(Ci.nsIResProtocolHandler);

    SandboxFactory.fileUri = resProt.resolveURI(
      Utils.url("resource://ubiquity/modules/sandboxfactory.js")
    );

    // We need to prefix any source code URI's with a known
    // "protected" file URI so that XPConnect wrappers are implicitly
    // made for them.
    SandboxFactory.protectedFileUriPrefix = SandboxFactory.fileUri + "#";

    // Now figure out if we're in a version of the platform that allows
    // us to specify the filename of code that runs in the sandbox, and
    // accurately reports it in tracebacks.
    var sandbox = Components.utils.Sandbox("http://www.mozilla.com");
    try {
      Components.utils.evalInSandbox("throw new Error()",
                                     sandbox,
                                     "1.8",
                                     "somefilename",
                                     1);
    } catch (e) {
      SandboxFactory.isFilenameReported = ((e.fileName) == "somefilename");
    }

    SandboxFactory.isInitialized = true;
  }
}

SandboxFactory.prototype = {
  makeSandbox: function makeSandbox(codeSource) {
    var sandbox = Components.utils.Sandbox(this._target);
    var globals = this._makeGlobals(codeSource);

    for (var symbolName in globals) {
      sandbox[symbolName] = globals[symbolName];
    }

    return sandbox;
  },

  evalInSandbox: function evalInSandbox(code, sandbox, codeSections) {
    if (!codeSections)
      codeSections = [{filename: "<string>",
                       lineNumber: 0,
                       length: code.length}];

    var retVal;
    let currIndex = 0;
    for (let i = 0; i < codeSections.length; i++) {
      let section = codeSections[i];
      let filename = section.filename;

      if (!this._ignoreForcedProtection)
        filename = SandboxFactory.protectedFileUriPrefix + filename;

      let sourceCode = code.slice(currIndex, currIndex + section.length);

      retVal = Components.utils.evalInSandbox(sourceCode,
                                              sandbox,
                                              "1.8",
                                              filename,
                                              section.lineNumber);

      currIndex += section.length;
    }
    return retVal;
  }
};
