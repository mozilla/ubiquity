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

function AssertionError(message) {
  this.message = message;
}

function TestCase(func) {
  this.name = func.name;
  this.__func = func;
}

TestCase.prototype = {
  run : function() {
    this.__func();
  },

  assertIsDefined : function(condition, msg) {
    if (condition == undefined)
      throw new AssertionError(msg);
  },

  assert : function(condition, msg) {
    if (!condition)
      throw new AssertionError(msg);
  }
};

function HtmlTestResponder(outputElement) {
  this._output = outputElement;
}

HtmlTestResponder.prototype = {
  onStartTest : function(test) {
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

  onFinished : function(successes, failures) {
    var total = successes + failures;

    var html = ("<p>" + successes + " out of " +
                total + " tests successful (" + failures +
                " failed).</p>");

    this._output.innerHTML += html;
  }
};

function TestSuite(responder, parent) {
  this._responder = responder;
  this._parent = parent;
}

TestSuite.prototype = {
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

    var tests = this.getTests(this._parent);

    for each (test in tests) {
      try {
        this._responder.onStartTest(test);
        test.run();
        successes += 1;
      } catch (e) {
        this._responder.onException(test, e);
        failures += 1;
      }
    }
    this._responder.onFinished(successes, failures);
  }
};
