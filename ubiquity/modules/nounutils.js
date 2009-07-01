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
 *   Aza Raskin <aza@mozilla.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Blair McBride <unfocused@gmail.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Michael Yoshitaka Erlewine <mitcho@mitcho.com>
 *   Satoshi Murakami <murky.satyr@gmail.com>
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

var EXPORTED_SYMBOLS = ["NounUtils"];

/* Make a namespace object called NounUtils, to export,
 * which contains each function in this file.*/
var NounUtils = ([f for each (f in this) if (typeof f === "function")]
                 .reduce(function(o, f)(o[f.name] = f, o), {}));

Components.utils.import("resource://ubiquity/modules/utils.js");

const SCORE_SUBTRACTOR = 0.3;

var classOf = function classOf(x) {
  //http://bit.ly/CkhjS#instanceof-considered-harmful
  return Object.prototype.toString.call(x).slice(8, -1);
};

// ** {{{ NounUtils.NounType() }}} **
//
// Constructor of a noun type that accepts a specific set of inputs.
// See {{{NounType._from*}}} methods for details
// (but do not use them directly).
//
// {{{label}}} is an optional string specifying default label of the nountype.
//
// {{{expected}}} is an instance of {{{Array}}} {{{RegExp}}}, or {{{Object}}}.
// The array can optionally be a space-separeted string.
//
// {{{defaults}}} is an optional array or space-separated string
// of default inputs.

function NounType(label, expected, defaults) {
  if (!(this instanceof NounType))
    return new NounType(label, expected, defaults);

  if (typeof label !== "string")
    [label, expected, defaults] = ["?", label, expected];

  if (typeof expected.suggest === "function") return expected;

  function maybe_qw(o) typeof o === "string" ? o.match(/\S+/g) || [] : o;
  expected = maybe_qw(expected);
  defaults = maybe_qw(defaults);

  var maker = NounType["_from" + classOf(expected)];
  for (let [k, v] in Iterator(maker(expected))) this[k] = v;
  this.suggest = maker.suggest;
  this.label = label;
  this.noExternalCalls = true;
  if (this.id) this.id += Utils.computeCryptoHash("MD5", (uneval(expected) +
                                                          uneval(defaults)));
  if (defaults) {
    // [[a], [b, c], ...] => [a].concat([b, c], ...) => [a, b, c, ...]
    this._defaults =
      Array.concat.apply(0, [this.suggest(d) for each (d in defaults)]);
    this.default = NounType.default;
  }
}
NounType.default = function default() this._defaults;

// ** {{{ NounUtils.NounType._fromArray() }}} **
//
// Creates a noun type that accepts a finite list of specific words
// as the only valid inputs. Those words will be suggested as {{{text}}}s.
//
// {{{words}}} is the array of words.

NounType._fromArray = function NT_Array(words)({
  id: "#na_",
  name: words.slice(0, 2) + (words.length > 2 ? ",..." : ""),
  _list: [NounUtils.makeSugg(w) for each (w in words)],
});

// ** {{{ NounUtils.NounType._fromRegExp() }}} **
//
// Creates a noun type from the given regular expression object
// and returns it. The {{{data}}} attribute of the noun type is
// the {{{match}}} object resulting from the regular expression
// match.
//
// {{{regexp}}} is the RegExp object that checks inputs.

NounType._fromRegExp = function NT_RegExp(regexp)({
  id: "#nr_",
  name: regexp.source,
  rankLast: regexp.test(""),
  suggest: arguments.callee.suggest,
  _regexp: regexp,
});
NounType._fromRegExp.suggest = (
  function NT_RE_suggest(text, html, cb, selectionIndices) (
    let (match = text.match(this._regexp)) (
      match
      ? [NounUtils.makeSugg(text, html, match,
                            1 - (match.index / text.length) * SCORE_SUBTRACTOR,
                            selectionIndices)]
      : [])));

// ** {{{ NounUtils.NounType._fromObject() }}} **
//
// Creates a noun type from the given key:value pairs, the key being
// the {{{text}}} attribute of its suggest and the value {{{data}}}.
//
// {{{dict}}} is an object of text:data pairs.

NounType._fromObject = function NT_Object(dict)({
  name: ([key for (key in dict)].slice(0, 2) +
         (dict.__count__ > 2 ? ",..." : "")),
  _list: [NounUtils.makeSugg(key, null, val)
          for ([key, val] in Iterator(dict))],
});

NounType._fromArray.suggest = NounType._fromObject.suggest = (
  function NT_suggest(text) NounUtils.grepSuggs(text, this._list));

// ** {{{ NounUtils.makeSugg() }}} **
//
// A helper function to create a suggestion object.
//
// {{{text}}}
// {{{html}}}
// {{{data}}}
// {{{score = 1}}}
// {{{selectionIndices}}}

function makeSugg(text, html, data, score, selectionIndices) {
  if (text == null && html == null && arguments.length < 3)
    // all inputs empty!  There is no suggestion to be made.
    return null;

  // Shift the argument if appropriate:
  if (typeof score === "object") {
    selectionIndices = score;
    score = null;
  }

  // Fill in missing fields however we can:
  if (text != null) text += "";
  if (html != null) html += "";
  if (!text && data != null)
    text = data.toString();
  if (!html && text >= "")
    html = Utils.escapeHtml(text);
  if (!text && html >= "")
    text = html.replace(/<[^>]*>/g, "");

  // Create a summary of the text:
  var snippetLength = 35;
  var summary = (text.length > snippetLength
                 ? text.slice(0, snippetLength-1) + "\u2026"
                 : text);

  // If the input comes all or in part from a text selection,
  // we'll stick some html tags into the summary so that the part
  // that comes from the text selection can be visually marked in
  // the suggestion list.
  if (selectionIndices) {
    var pre = summary.slice(0, selectionIndices[0]);
    var middle = summary.slice(selectionIndices[0],
                               selectionIndices[1]);
    var post = summary.slice(selectionIndices[1]);
    summary = (Utils.escapeHtml(pre) +
               "<span class='selection'>" +
               Utils.escapeHtml(middle) +
               "</span>" +
               Utils.escapeHtml(post));
  } else
    summary = Utils.escapeHtml(summary);

  return {
    text: text, html: html, data: data,
    summary: summary, score: score || 1};
}

// ** {{{ NounUtils.grepSuggs() }}} **
//
// A helper function to grep a list of suggestion objects by user input.
// Returns an array of filtered suggetions sorted/scored by matched indices.
//
// {{{input}}} is a string that filters the list.
//
// {{{suggs}}} is an array or dictionary of suggestion objects.
//
// {{{key = "text"}}} is an optional string to specify the target property
// to match with.

function grepSuggs(input, suggs, key) {
  if (!input) return [];
  if (key == null) key = "text";
  try { var re = RegExp(input, "i") }
  catch (e if e instanceof SyntaxError) {
    re = RegExp(input.replace(/\W/g, "\\$&"), "i");
  }
  var results = [], count = suggs.__count__, i = -1;
  for each (let sugg in suggs) {
    let target = sugg[key];
    let index = target.search(re);
    if (index < 0) continue;
    let found = target.match(re);
    sugg.score = 0.2 + 0.8 * Math.sqrt(found.length / target.length)
                 - (index / target.length) * SCORE_SUBTRACTOR;
    results[++i + index * count] = sugg;
  }
  return results.filter(Boolean);
}
