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

// This script is loaded into a Ubiquity sandbox once all other
// code has been injected into it, so that it can perform any
// necessary post-processing and other finalization on the
// contents of the sandbox.

(function() {
  function findFunctionsWithPrefix(prefix) {
    var re = RegExp("^" + prefix);
    return [this[name]
            for (name in this)
            if (re.test(name) && typeof this[name] === "function")];
  }
  // Configure all functions starting with "pageLoad_" to be called
  // whenever a page is loaded.
  for each (let func in findFunctionsWithPrefix("pageLoad_"))
    pageLoadFuncs.push(func);

  for each (let func in findFunctionsWithPrefix("ubiquityLoad_"))
    ubiquityLoadFuncs.push(func);

  function callRunOnceFunctions(scopeObj, prefix) {
    if (!scopeObj.hasRunOnce) {
      scopeObj.hasRunOnce = true;
      var funcs = findFunctionsWithPrefix(prefix);
      for (var i = 0; i < funcs.length; i++)
        funcs[i]();
    }
  }

  // Configure all functions starting with "startup_" to be called on
  // Firefox startup.
  callRunOnceFunctions(globals, "startup_");
})();
