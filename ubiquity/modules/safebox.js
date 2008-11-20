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

EXPORTED_SYMBOLS = ['SafeBox'];

// This object provides a safe interface to communicate with a
// Components.utils.Sandbox running untrusted code using either
// xpcshell or running within a XULRunner application (such as Firefox
// or Thunderbird).  All data going into and out of the sandbox is
// marshalled using JSON, and all communication happens synchronously.
//
// The SafeBox is created by passing it a sandbox instance and a
// function to evaluate code in a sandbox.  The sandbox instance
// should be safe to use--i.e., no untrusted code should have yet been
// executed in it.
//
// Once called, untrusted code can be executed in the sandbox that
// should define a public function called receiveFromOutside().  The
// function takes a JS object and can do whatever it wants with it.
//
// Sending an object into the sandbox can be done by calling the
// SafeBox.sendInside() method.  If untrusted code in the sandbox wants to
// send a safe object out of the sandbox, it can call the sendOutside()
// global function; at this point, any responders attached to the
// SafeBox instance via SafeBox.addResponder() are notified via a call
// to their receiveFromInside() function, which is passed the 'safe'
// version of the object as its only parameter.

function SafeBox(sandbox, evalInSandbox) {
  let responders = [];
  let json = Components.classes['@mozilla.org/dom/json;1']
                       .createInstance(Components.interfaces.nsIJSON);

  this.addResponder = function addResponder(responder) {
    responders.push(responder);
  };

  this.sendInside = function sendInside(object) {
    let jsonStr = json.encode(object);
    evalInSandbox('receiveFromOutside(' + jsonStr + ');', sandbox);
  };

  function sendOutside(object) {
    // TODO: This assumes that it's safe to call json.encode() on an
    // untrusted object.  If this isn't secure, we can always do the
    // encoding in the sandbox's JS context by evaluating and using a
    // JSON encoder from json.org.

    let safeObject = json.decode(json.encode(object));
    for (let i = 0; i < responders.length; i++)
      responders[i].receiveFromInside(safeObject);
  }

  sandbox.importFunction(sendOutside);
}
