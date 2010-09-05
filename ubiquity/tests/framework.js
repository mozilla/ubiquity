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

var EXPORTED_SYMBOLS = ["exportTests",
                        "AssertionError",
                        "TestCase",
                        "HtmlTestResponder",
                        "DumpTestResponder",
                        "TestSuite"];

Components.utils.import("resource://ubiquity/modules/utils.js");

function exportTests(obj) {
  var exportedSymbols = [];

  for (var name in obj) {
    if (name.indexOf("test") == 0)
      exportedSymbols.push(name);
  }

  if (obj.EXPORTED_SYMBOLS)
    exportedSymbols = obj.EXPORTED_SYMBOLS.concat(exportedSymbols);

  obj.EXPORTED_SYMBOLS = exportedSymbols;
}

let AssertionError = Error;

function TestCase(func) {
  this.name = func.name;
  this.pendingCallbacks = [];
  this.__func = func;
  this.__teardownFunctions = [];
}

TestCase.prototype = {
  run : function(callbackRunner) {
    var self = this;

    self.makeCallback = function makeCallback(func) {
      function wrapper() {
        let index = self.pendingCallbacks.indexOf(func);
        self.pendingCallbacks.splice(index, 1);
        callbackRunner(func, this, arguments);
      }
      self.pendingCallbacks.push(func);
      return wrapper;
    };

    self.__func();
  },

  assertIsDefined : function(condition, msg) {
    if (condition == undefined)
      throw new AssertionError(msg,
                               Components.stack.caller.filename,
                               Components.stack.caller.lineNumber);
  },

  assert : function(condition, msg) {
    if (!condition)
      throw new AssertionError(msg,
                               Components.stack.caller.filename,
                               Components.stack.caller.lineNumber);
  },

  assertEquals : function(a, b, msg) {
    if (a !== b) {
      throw new AssertionError(
        msg || "'" + a + "' is not equal to '" + b + "'",
        Components.stack.caller.filename,
        Components.stack.caller.lineNumber);
    }
  },

  assertRaisesMessage : function(callback, message) {
    let wasExceptionThrown = false;

    try {
      callback();
    } catch (e) {
      wasExceptionThrown = true;
      if (e.message != message) {
        throw new AssertionError(("Exception thrown but message '" +
                                  e.message + "' is not equal to '" +
                                  message + "'"),
                                 Components.stack.caller.filename,
                                 Components.stack.caller.lineNumber);
      }
    }
    if (!wasExceptionThrown)
      throw new AssertionError("No exception was thrown",
                               Components.stack.caller.filename,
                               Components.stack.caller.lineNumber);
  },

  teardown : function() {
    for (var i = 0; i < this.__teardownFunctions.length; i++)
      this.__teardownFunctions[i]();
  },

  addToTeardown : function(func) {
    this.__teardownFunctions.push(func);
  },

  // If we're running in xpcshell, skip this test.
  skipIfXPCShell : function() {
    var Cc = Components.classes;
    var Ci = Components.interfaces;

    try {
      var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
                  .getService(Ci.nsINavBookmarksService);
    } catch (e) {
      throw new this.SkipTestError();
    }
  },

  // Exception to throw when we want to skip a test.
  SkipTestError : function() {
  }
};

var DumpTestResponder = {
  onStartTest : function(test) {
    dump("Running test: "+test.name+"\n");
  },

  onSuccess : function(test) { },

  onSkipTest : function(test, e) {
    dump("Test skipped: " + test.name + "\n");
  },

  onException : function(test, e) {
    var text = ("Error in test " +
                test.name + ": " + e.message);
    if (e.fileName)
      text += (" (in " + e.fileName +
               ", line " + e.lineNumber + ")");
    text += "\n";
    dump(text);
  },

  onFinished : function(successes, failures, skips) {
    var total = successes + failures;
    var text = (successes + " out of " +
                total + " tests successful (" + failures +
                " failed).\n");
    if (skips)
      text += "Additionally, " + skips + " test(s) were skipped.\n";

    dump(text);

    if (failures)
      throw new Error("Some tests were unsuccessful.");
  }
};

function HtmlTestResponder(outputElement) {
  this._output = outputElement;
}

HtmlTestResponder.prototype = {
  onStartTest : function(test) {
  },

  onSuccess : function(test) {
    var html = "<p class=\"successful\">Passed test " + test.name + ".</p>";
    this._output.innerHTML += html;
  },

  onSkipTest : function(test, e) {
    var html = "<p class=\"skipped\">Skipping test " + test.name + ".</p>";
    this._output.innerHTML += html;
  },

  onException : function(test, e) {
    var html = "<p class=\"failed\">";
    var message = "Error in test " + test.name + ": " + e.message;
    if (e.fileName)
      message += " (in " + e.fileName + ", line " + e.lineNumber + ")";
    html += message.replace("<", "&lt;").replace(">", "&gt;");
    html += "</p>";
    this._output.innerHTML += html;
  },

  onFinished : function(successes, failures, skips) {
    var total = successes + failures;
    var html = "<p class=\"summary\">" + successes + " out of " +
                total + " tests successful (" + failures +
                " failed).</p>";

    if (skips) {
      html += "<p class=\"summary\">Additionally, " + skips + " test";
      if (skips != 1)
        html += "s were";
      else
        html += " was";
      html += " skipped.</p>";
    }

    this._output.innerHTML += html;
  }
};

function TestSuite(responder, parent) {
  this._responder = responder;
  this._parent = parent;
}

TestSuite.prototype = {
  // Maximum execution time of a single test, in ms.
  MAX_TEST_RUNTIME : 5000,

  // Pointer to the currently-running test.
  currentTest : null,

  getTests : function(parent) {
    var tests = [];

    for (var prop in parent)
      if (prop.indexOf("test") == 0 && typeof parent[prop] == "function")
        tests.push(new TestCase(parent[prop]));

    return tests;
  },

  start : function() {
    var successes = 0;
    var failures = 0;
    var skips = 0;

    var tests = this.getTests(this._parent);

    var threadMgr = Components.classes["@mozilla.org/thread-manager;1"]
                    .getService().currentThread;

    for each (var test in tests) {
      TestSuite.currentTest = test;
      try {
        this._responder.onStartTest(test);

        let pendingException = null;

        let maxTime = this.MAX_TEST_RUNTIME;

        Utils.setTimeout(
          function() {
            pendingException = new Error("Maximum test execution time " +
                                         "(" + maxTime + " ms) exceeded.");
          },
          maxTime
        );

        function callbackRunner(callback, thisObj, argsObj) {
          try {
            callback.apply(thisObj, argsObj);
          } catch (e) {
            pendingException = e;
          }
        }

        test.run(callbackRunner);

        while (test.pendingCallbacks.length) {
          threadMgr.processNextEvent(true);
          if (pendingException)
            throw pendingException;
        }

        this._responder.onSuccess(test);
        successes += 1;
      } catch(e if e instanceof TestCase.prototype.SkipTestError) {
        this._responder.onSkipTest(test, e);
        skips += 1;
      } catch (e) {
        this._responder.onException(test, e);
        failures += 1;
      }
      test.teardown();
    }
    this._responder.onFinished(successes, failures, skips);
  }
};
