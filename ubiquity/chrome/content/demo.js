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

Components.utils.import("resource://ubiquity/modules/utils.js");

function runContinuous(generator, cb) {
  try {
    var result = generator.next();
    var nextStep = function nextStep() { runContinuous(generator, cb); };
    switch (typeof(result)) {
    case "function":
      var callbackFactory = result;
      callbackFactory(nextStep);
      break;
    default:
      var nestedGenerator = result;
      runContinuous(nestedGenerator, nextStep);
    }
  } catch (e if e instanceof StopIteration) {
    if (cb)
      cb();
  }
}

function wait(timeout) {
  yield function(cb) { window.setTimeout(cb, timeout); };
}

function fadeIn(selector) {
  yield function(cb) { $(selector).fadeIn("slow", cb); };
}

function fadeOut(selector) {
  yield function(cb) { $(selector).fadeOut("slow", cb); };
}

function UbiquityAutomator(ubiquity, anchor) {
  this.open = function open() {
    ubiquity.openWindow(anchor);
    yield wait(50);
  };

  this.close = function close() {
    ubiquity.closeWindow();
    yield wait(50);
  };

  this.typeKey = function typeKey(character) {
    var textBox = ubiquity.textBox;
    var doc = textBox.ownerDocument;

    var keyCode = character.toUpperCase().charCodeAt(0);
    var charCode = character.charCodeAt(0);

    var event = doc.createEvent("KeyboardEvent");
    event.initKeyEvent("keydown",
                       true,
                       true,
                       null,
                       false,
                       false,
                       false,
                       false,
                       keyCode,
                       0);
    textBox.dispatchEvent(event);

    yield wait(25);

    event = doc.createEvent("KeyboardEvent");
    event.initKeyEvent("keypress",
                       true,
                       true,
                       null,
                       false,
                       false,
                       false,
                       false,
                       0,
                       charCode);
    textBox.dispatchEvent(event);

    yield wait(25);

    event = doc.createEvent("KeyboardEvent");
    event.initKeyEvent("keyup",
                       true,
                       true,
                       null,
                       false,
                       false,
                       false,
                       false,
                       keyCode,
                       0);
    textBox.dispatchEvent(event);

    yield wait(25);
  };

  this.typeKeys = function typeKeys(characters) {
    for (var i = 0; i < characters.length; i++) {
      yield this.typeKey(characters[i]);
      yield wait(100);
    }
  };
}

var ubiq;

function demo(options) {
  if (typeof(options.wait) == "undefined")
    options.wait = 2;

  yield fadeIn(options.commentary);
  yield ubiq.open();
  yield ubiq.typeKeys(options.input);
  yield wait(options.wait * 1000);
  yield ubiq.close();
  yield fadeOut(options.commentary);
}

function testUbiq() {
  yield demo({input: "google pants", commentary: "#google"});
  yield demo({input: "video salad", commentary: "#video", wait: 4});
  yield demo({input: "help tab", commentary: "#help"});
  yield demo({input: "twitter #ubiquity is neat", commentary: "#twitter"});
  yield demo({input: "wiki obama", commentary: "#wikipedia", wait: 10});
  yield fadeIn("#learn-more");
}

$(window).ready(
  function() {
    var win = Utils.currentChromeWindow;
    if (win.gUbiquity) {
      ubiq = new UbiquityAutomator(win.gUbiquity,
                                   $("#anchor").get(0));
      runContinuous(testUbiq());
    }
  });
