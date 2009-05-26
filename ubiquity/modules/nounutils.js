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

Components.utils.import("resource://ubiquity/modules/utils.js");

var NounUtils = {};

const DEFAULT_SCORE = 0.9;

// ** {{{ NounUtils.NounType() }}} **
//
// Constructor of a noun type that accepts a finite list of specific words
// as the only valid values.
//
// {{{name}}} is the name of the new nountype.
//
// {{{expectedWords}}} is an array or space-separated string of expected words.
//
// {{{defaultWords}}} is an optional array or space-separated string
// of default words.

NounUtils.NounType = function NounType(name, expectedWords, defaultWords) {
  if (!(this instanceof NounType))
    return new NounType(name, expectedWords, defaultWords);
  this._name = name;
  if (typeof expectedWords === "string")
    expectedWords = expectedWords.match(/\S+/g);
  this._words = [NounUtils.makeSugg(w) for each (w in expectedWords)];
  if (typeof defaultWords === "string")
    defaultWords = defaultWords.match(/\S+/g);
  if (defaultWords) {
    this._defaults = [NounUtils.makeSugg(w, null, null, DEFAULT_SCORE)
                      for each (w in defaultWords)];
    this.default = function() this._defaults;
  }
};

NounUtils.NounType.prototype = {
  suggest: function(text) NounUtils.grepSuggs(text, this._words),
};

// ** {{{ NounUtils.nounTypeFromRegExp() }}} **
//
// Creates a noun type from the given regular expression object
// and returns it. The {{{data}}} attribute of the noun type is
// the {{{match}}} object resulting from the regular expression
// match.
//
// {{{regexp}}} is the RegExp object that checks inputs.
//
// {{{name}}} is an optional string specifying {{{_name}}} of the nountype.

NounUtils.nounTypeFromRegExp = function nounTypeFromRegExp(regexp, name) {
  return {
    _name: name || "?",
    _regexp: regexp,
    rankLast: regexp.test(""),
    suggest: function(text, html, callback, selectionIndices) {
      var match = text.match(this._regexp);
      return (match
              ? NounUtils.makeSugg(text, html, match,
                                   this.rankLast ? 0.7 : 1,
                                   // rankLast is obsolete in parser2
                                   selectionIndices)
              : []);
    },
  };
};

// ** {{{ NounUtils.nounTypeFromDictionary() }}} **
//
// Creates a noun type from the given key:value pairs, the key being
// the {{{text}}} attribute of its suggest and the value {{{data}}}.
//
// {{{dict}}} is an object of text:data pairs.
//
// {{{name}}} is an optional string specifying {{{_name}}} of the nountype.
//
// {{{defaults}}} is an optional array or space-separated string
// of default keys.

NounUtils.nounTypeFromDictionary = function nounTypeFromDictionary(dict,
                                                                   name,
                                                                   defaults) {
  var noun = {
    _name: name || "?",
    _list: [NounUtils.makeSugg(key, null, val)
            for ([key, val] in Iterator(dict))],
    suggest: function(text, html, cb, selected) {
      return selected ? [] : NounUtils.grepSuggs(text, this._list);
    },
  };
  if (typeof defaults === "string")
    defaults = defaults.match(/\S+/g);
  if (defaults) {
    noun._defaults = [NounUtils.makeSugg(k, null, dict[k], DEFAULT_SCORE)
                      for each (k in defaults)];
    noun.default = function() this._defaults;
  }
  return noun;
};

// ** {{{ NounUtils.makeSugg() }}} **
//
// A helper function to create a suggestion object.
//
// {{{text}}}
// {{{html}}}
// {{{data}}}
// {{{score = 1}}}
// {{{selectionIndices}}}

NounUtils.makeSugg = function makeSugg(text, html, data, score,
                                       selectionIndices) {
  if (typeof text !== "string" &&
      typeof html !== "string" &&
      arguments.length < 3)
    // all inputs empty!  There is no suggestion to be made.
    return null;

  // Shift the argument if appropriate:
  if (typeof score === "object") {
    selectionIndices = score;
    score = null;
  }

  // Fill in missing fields however we can:
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
};

// ** {{{ NounUtils.grepSuggs() }}} **
//
// A helper function to grep a list of suggestion objects by user input.
// Returns an array of filtered suggetions sorted by matched indices.
//
// {{{input}}} is a string that filters the list.
//
// {{{suggs}}} is an array or dictionary of suggestion objects.
//
// {{{key = "text"}}} is an optional string to specify the target property
// to match with.

NounUtils.grepSuggs = function grepSuggs(input, suggs, key) {
  if (!input) return [];
  if (key == null) key = "text";
  try { var re = RegExp(input, "i") }
  catch (e if e instanceof SyntaxError) {
    re = RegExp(input.replace(/\W/g, "\\$&"), "i");
  }
  var results = [], count = suggs.__count__, i = -1;
  for each (let sugg in suggs) {
    let index = sugg[key].search(re);
    if (~index) results[++i + index * count] = sugg;
  }
  return results.filter(Boolean);
};
