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

NounUtils.NounType = function(name, expectedWords, defaultWord) {
  this._init(name, expectedWords, defaultWord);
};

NounUtils.NounType.prototype = {
  /* A NounType that accepts a finite list of specific words as the only valid
   * values.  Instantiate it with an array giving all allowed words.
   */
  _init: function(name, expectedWords, defaultWord) {
    this._name = name;
    this._wordList = expectedWords; // an array
    if(typeof defaultWord == "string") {
      this.default = function() {
        return NounUtils.makeSugg(defaultWord);
      };
    }
  },
  suggest: function(text) {
    // returns array of suggestions where each suggestion is object
    // with .text and .html properties.
    if (typeof text != "string") {
      // Input undefined or not a string
      return [];
    }

    text = text.toLowerCase();

    var possibleWords = [];
    if(typeof this._wordList == "function") {
      possibleWords = this._wordList();
    } else {
      possibleWords = this._wordList;
    }

    var suggestions = [];
    possibleWords.forEach(function(word) {
      // Do the match in a non-case sensitive way
      if ( word.toLowerCase().indexOf(text) > -1 ) {
      	suggestions.push( NounUtils.makeSugg(word) );//xxx
      	// TODO if text input is multiple words, search for each of them
      	// separately within the expected word.
      }
    });
    return suggestions;
  }
};

NounUtils.makeSugg = function( text, html, data, score, selectionIndices ) {
  if (typeof text != "string" && typeof html != "string" && !data) {
    // all inputs empty!  There is no suggestion to be made.
    return null;
  }
  
  // make the basic object:
  var suggestion = {text: text, html: html, data:data, score: (score || 1) };
  // Fill in missing fields however we can:
  if (suggestion.data && !suggestion.text)
    suggestion.text = suggestion.data.toString();
  if (suggestion.text && !suggestion.html)
    suggestion.html = Utils.escapeHtml(suggestion.text);
  if (suggestion.html && !suggestion.text)
    // TODO: Any easy way to strip the text out of the HTML here? We
    // don't have immediate access to any HTML DOM objects...
    suggestion.text = suggestion.html;

  // Create a summary of the text:

  var snippetLength = 35;
  var summary;
  if( text && text.length > snippetLength )
    summary = text.substring(0, snippetLength-1) + "\u2026";
  else
    summary = suggestion.text;

  /* If the input comes all or in part from a text selection,
   * we'll stick some html tags into the summary so that the part
   * that comes from the text selection can be visually marked in
   * the suggestion list.
   */
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

  suggestion.summary = summary;

  return suggestion;
};

// ** {{{ NounUtils.nounTypeFromRegExp() }}} **
//
// Creates a noun type from the given regular expression object
// and returns it. The {{{data}}} attribute of the noun type is
// the {{{match}}} object resulting from the regular expression
// match.

NounUtils.nounTypeFromRegExp = function nounTypeFromRegExp(regexp) {
  var rankLast = false;
  if (regexp.source == ".*")
    rankLast = true;
  var newNounType = {
    // This will show up if the noun type is the target of a modifier.
    _name: "text",
    _regexp: regexp,
    rankLast: rankLast,
    suggest: function(text, html, callback, selectionIndices) {
      var match = text.match(this._regexp);
      if (match) {
        var suggestion = NounUtils.makeSugg(text, html, match,
                                            (rankLast ? 0.7 : 1),
                                            selectionIndices);
        return [suggestion];
      } else
        return [];
    }
  };

  return newNounType;
};
