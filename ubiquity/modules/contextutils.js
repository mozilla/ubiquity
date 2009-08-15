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

// = {{{ ContextUtils }}} =

var EXPORTED_SYMBOLS = ["ContextUtils"];

var ContextUtils = {};

for each (let f in this) if (typeof f === "function") ContextUtils[f.name] = f;

// === {{{ ContextUtils.getHtmlSelection(context) }}} ===

function getHtmlSelection(context) {
  var range = getFirstRange(context);
  if (range) {
    var newNode = context.focusedWindow.document.createElement("div");
    newNode.appendChild(range.cloneContents());
    absolutifyUrlsInNode(newNode);
    return newNode.innerHTML;
  }
  return "";
}

// === {{{ ContextUtils.getSelection(context) }}} ===

function getSelection(context) {
  var {focusedElement} = context;
  if (focusedElement && focusedElement.value) {
    try {
      var {selectionStart, selectionEnd} = focusedElement;
    } catch (e) {
      // It's bizarrely possible for this to occur; see #156.
    }
    if (selectionStart !== selectionEnd)
      return focusedElement.value.slice(selectionStart, selectionEnd);
  }

  var range = getFirstRange(context);
  if (range) return range.toString();

  return "";
}

// === {{{ ContextUtils.setSelection(context, content, options) }}} ===
//
// {{{content}}} can be text or html.
//
// {{{options}}} is a dictionary; if it has a {{{text}}} property then
// that value will be used in place of the html if we're in
// a plain-text only editable field.

function setSelection(context, content, options) {
  var doc = context.focusedWindow.document;
  var focused = context.focusedElement;

  if (doc.designMode == "on") {
    doc.execCommand("insertHTML", false, content);
  }

  else if( focused ) {
    var plainText = null;

    if (options && options.text){
      plainText = options.text;
    }

    if (plainText == null) {
      // Rollin' in tha hack-illac: 1.9.0 wants html elements
      // namespaced, whereas 1.9.1+ doesn't.
      // 3.1.*
      var el = doc.createElement( "html" );
      el.innerHTML = "<div>" + content + "</div>";
      plainText = el.textContent;
      if (!plainText.length) {
        // 3.0.*
        el = doc.createElementNS("http://www.w3.org/1999/xhtml", "html" );
        el.innerHTML = "<div>" + content + "</div>";
        plainText = el.textContent;
      }
    }

    var selectionEnd = focused.selectionStart + plainText.length;
    var currentValue = focused.value;

    var beforeText = currentValue.substring(0, focused.selectionStart);
    var afterText = currentValue.substring(focused.selectionEnd,
                                           currentValue.length);

    var scrollTop = focused.scrollTop;
    var scrollLeft = focused.scrollLeft;

    focused.value = beforeText + plainText + afterText;
    focused.focus();

    //put the cursor after the inserted text
    focused.setSelectionRange(selectionEnd, selectionEnd);

    focused.scrollTop = scrollTop;
    focused.scrollLeft = scrollLeft;
  }
  else {
    var sel = context.focusedWindow.getSelection();

    if (sel.rangeCount >= 1) {
      var range = sel.getRangeAt(0);
      var newNode = doc.createElement("span");
      range.surroundContents(newNode);
      newNode.innerHTML = content;
    }
  }
}

// === {{{ ContextUtils.getSelectionObject(context) }}} ===
//
// Returns an object that bundles up both the plain-text and HTML
// selections.  If there is no html selection, the plain-text selection
// is used for both.

function getSelectionObject(context) {
  var selection = getSelection(context);
  var htmlSelection = getHtmlSelection(context);
  return {text: selection, html: htmlSelection || selection};
}

// === {{{ ContextUtils.absolutifyUrlsInNode(context) }}} ===
//
// Takes all the relative URLs specified as attributes in the given DOM
// node (and its descendants) and convert them to absolute URLs. This
// is a fix for [[http://ubiquity.mozilla.com/trac/ticket/551|#551]].

function absolutifyUrlsInNode(node) {
  if (!node) return;
  for each (let attr in ["href", "src", "action"])
    if (node[attr]) node.setAttribute(attr, node[attr]);
  absolutifyUrlsInNode(node.nextSibling);
  absolutifyUrlsInNode(node.firstChild);
}

// === {{{ ContextUtils.getFirstRange(context) }}} ===

function getFirstRange(context) {
  var win = context.focusedWindow;
  var sel = win && win.getSelection();
  return sel && sel.rangeCount ? sel.getRangeAt(0) : null;
}
