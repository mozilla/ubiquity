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

// = ContextUtils =
// A small library that deals with selection via {{{context}}}.
//
// {{{context}}} is a dictionary which must contain
// {{{focusedWindow}}} and {{{focusedElement}}} fields.

var EXPORTED_SYMBOLS = ["ContextUtils"];

var ContextUtils = {};

for each (let f in this) if (typeof f === "function") ContextUtils[f.name] = f;

Components.utils.import("resource://ubiquity/modules/utils.js");

// === {{{ ContextUtils.getHtmlSelection(context) }}} ===

function getHtmlSelection(context) {
  var range = cloneFirstRange(context);
  if (!range) return "";

  var div = context.focusedWindow.document.createElement("div");
  div.appendChild(range.cloneContents());
  range.detach();
  // fix for #551
  Array.forEach(div.getElementsByTagName("*"), Utils.absolutifyUrlAttribute);
  return div.innerHTML;
}

// === {{{ ContextUtils.getSelection(context) }}} ===

function getSelection(context) {
  var {focusedElement} = context;
  if (Utils.isTextBox(focusedElement)) {
    let {selectionStart: ss, selectionEnd: se} = focusedElement;
    if (ss !== se) return focusedElement.value.slice(ss, se);
  }

  var range = cloneFirstRange(context);
  if (range) {
    let result = range.toString();
    range.detach();
    return result;
  }

  return "";
}

// === {{{ ContextUtils.setSelection(context, content, options) }}} ===
// Replaces the current selection with {{{content}}}.
// Returns {{{true}}} if succeeds, {{{false}}} if not.
//
// {{{content}}} is the HTML string.
//
// {{{options}}} is a dictionary; if it has a {{{text}}} property then
// that value will be used in place of the HTML if we're in
// a plain-text only editable field.

function setSelection(context, content, options) {
  var {focusedWindow, focusedElement} = context;

  if (focusedWindow && focusedWindow.document.designMode === "on") {
    focusedWindow.document.execCommand("insertHTML", false, content);
    return true;
  }

  if (Utils.isTextBox(focusedElement)) {
    let plainText = options && options.text;
    if (!plainText) {
      let html = (focusedElement.ownerDocument
                  .createElementNS("http://www.w3.org/1999/xhtml", "html"));
      html.innerHTML = "<div>" + content + "</div>";
      plainText = html.textContent;
    }
    let {value, scrollTop, scrollLeft, selectionStart} = focusedElement;
    focusedElement.value = (
      value.slice(0, selectionStart) + plainText +
      value.slice(focusedElement.selectionEnd));
    focusedElement.selectionStart = selectionStart;
    focusedElement.selectionEnd = selectionStart + plainText.length;
    focusedElement.scrollTop = scrollTop;
    focusedElement.scrollLeft = scrollLeft;
    return true;
  }

  if (!focusedWindow) return false;

  var sel = focusedWindow.getSelection();
  if (!sel.rangeCount) return false;

  var range = sel.getRangeAt(0);
  var fragment = range.createContextualFragment(content);
  sel.removeRange(range);
  range.deleteContents();
  var {lastChild} = fragment;
  if (lastChild) {
    range.insertNode(fragment);
    range.setEndAfter(lastChild);
  }
  sel.addRange(range);
  return true;
}

// === {{{ ContextUtils.getSelectionObject(context) }}} ===
// Returns an object that bundles up both the plain-text and HTML
// selections.  If there is no html selection, the plain-text selection
// is used for both.

function getSelectionObject(context) {
  var selection = getSelection(context);
  return {
    text: selection,
    html: getHtmlSelection(context) || Utils.escapeHtml(selection),
  };
}

// === {{{ ContextUtils.getSelectedNodes(context, selector) }}} ===
// Returns all nodes in all selections.
//
// {{{selector}}} is an optional CSS selector string or a function
// that filters each node.

function getSelectedNodes(context, selector) {
  var nodes = [], win = context.focusedWindow, sel = win && win.getSelection();
  if (!sel) return nodes;
  const ELEMENT = 1, TEXT = 3;
  var aua = Utils.absolutifyUrlAttribute, ok = selector;
  if (typeof ok !== "function")
    ok = !selector ? Boolean : function gsn_ok(node) {
      return node.nodeType === ELEMENT && node.mozMatchesSelector(selector);
    };
  for (let i = 0, l = sel.rangeCount; i < l; ++i) {
    let range = sel.getRangeAt(i), node = range.startContainer;
    if (node.nodeType === TEXT &&
        /\S/.test(node.nodeValue.slice(range.startOffset))) {
      let pn = node.parentNode;
      if (ok(pn)) nodes.push(aua(pn));
    }
    WALK: do {
      if (ok(node)) nodes.push(aua(node));
      if (node.hasChildNodes()) node = node.firstChild;
      else {
        while (!node.nextSibling) if (!(node = node.parentNode)) break WALK;
        node = node.nextSibling;
      }
    } while (range.isPointInRange(node, 0));
  }
  return nodes;
}

// === {{{ ContextUtils.getIsSelected(context) }}} ===
// Returns whether or not the {{{context}}} has a non-collapsed selection.

function getIsSelected(context) (
  let (flm = context.focusedElement) (
    Utils.isTextBox(flm)
    ? flm.selectionStart < flm.selectionEnd
    : !context.focusedWindow.getSelection().isCollapsed));

// ==== {{{ ContextUtils.cloneFirstRange(context) }}} ====
// Returns a copy of the first range in selection.

function cloneFirstRange(context) {
  var win = context.focusedWindow, sel = win && win.getSelection();
  return sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
}
