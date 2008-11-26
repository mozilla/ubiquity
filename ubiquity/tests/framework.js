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
                        "TestSuite"];

function exportTests(obj) {
  var exportedSymbols = [];

  for (name in obj) {
    if (name.indexOf("test") == 0)
      exportedSymbols.push(name);
  }

  obj.EXPORTED_SYMBOLS = exportedSymbols;
}

let AssertionError = Error;

function TestCase(func) {
  this.name = func.name;
  this.__func = func;
  this.__teardownFunctions = [];
}

TestCase.prototype = {
  run : function() {
    this.__func();
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
    if (!(a == b)) {
      if (!msg)
        msg = "'" + a + "' is not equal to '" + b + "'";
      throw new AssertionError(msg,
                               Components.stack.caller.filename,
                               Components.stack.caller.lineNumber);
    }
  },

  teardown : function() {
    for (var i = 0; i < this.__teardownFunctions.length; i++)
      this.__teardownFunctions[i]();
  },

  addToTeardown : function(func) {
    this.__teardownFunctions.push(func);
  },

  // Exception to throw when we want to skip a test.
  SkipTestError : function() {
  }
};

function HtmlTestResponder(outputElement) {
  this._output = outputElement;
}

HtmlTestResponder.prototype = {
  onStartTest : function(test) {
  },

  onSkipTest : function(test, e) {
    var html = "<p>Skipping test " + test.name + ".</p>";
    this._output.innerHTML += html;
  },

  onException : function(test, e) {
    var html = ("<p class=\"error\">Error in test " +
                test.name + ": " + e.message);
    if (e.fileName)
      html += (" (in " + e.fileName +
               ", line " + e.lineNumber + ")");
    html += "</p>";
    this._output.innerHTML += html;
  },

  onFinished : function(successes, failures, skips) {
    var total = successes + failures;

    var html = ("<p>" + successes + " out of " +
                total + " tests successful (" + failures +
                " failed).</p>");

    if (skips)
      html += "<p>Additionally, " + skips + " test(s) were skipped.</p>";

    this._output.innerHTML += html;
  }
};

function TestSuite(responder, parent) {
  this._responder = responder;
  this._parent = parent;
}

TestSuite.prototype = {
  currentTest : null,

  getTests : function(parent) {
    var tests = [];

    for (prop in parent)
      if (prop.indexOf("test") == 0)
        tests.push(new TestCase(parent[prop]));

    return tests;
  },

  start : function() {
    var successes = 0;
    var failures = 0;
    var skips = 0;

    var tests = this.getTests(this._parent);

    for each (test in tests) {
      TestSuite.currentTest = test;
      try {
        this._responder.onStartTest(test);

        test.run();
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
