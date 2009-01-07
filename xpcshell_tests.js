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


var Ci = Components.interfaces;
var Cc = Components.classes;

function getPath(path) {
  var file = Cc["@mozilla.org/file/local;1"].
             createInstance(Ci.nsILocalFile);

  file.initWithPath(path);
  return file;
}

function bindDirToResource(path, alias) {
  var ioService = Cc["@mozilla.org/network/io-service;1"].
                  getService(Ci.nsIIOService);

  var resProt = ioService.getProtocolHandler("resource")
                         .QueryInterface(Ci.nsIResProtocolHandler);

  var aliasURI = ioService.newFileURI(path);
  resProt.setSubstitution(alias, aliasURI);
}

function registerComponent(path) {
  var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

  registrar.autoRegister(path);
}

if (arguments.length === 0) {
  throw new Error("Please provide the path to the root of the extension.");
}

var basePath = arguments[0];

(
  function() {
    var rootDir = getPath(basePath);
    bindDirToResource(rootDir, "ubiquity");

    var componentPath = getPath(basePath);
    componentPath.appendRelativePath("components");
    componentPath.appendRelativePath("about.js");
    registerComponent(componentPath);
  }
)();

Components.utils.import("resource://ubiquity/tests/framework.js");
Components.utils.import("resource://ubiquity/tests/test_all.js");

var suite = new TestSuite(DumpTestResponder, this);

suite.start();
