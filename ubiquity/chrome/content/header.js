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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
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

// The common header for all the about:ubiquity child pages.

var {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://ubiquity/modules/utils.js");
Cu.import("resource://ubiquity/modules/setup.js");
Cu.import("resource://ubiquity/modules/localization_utils.js");

var L = LocalizationUtils.propertySelector(
  "chrome://ubiquity/locale/aboutubiquity.properties");
var H = Utils.escapeHtml;

var gPrefs = Utils.prefs;

function createNavLinks() {
  var containerElem = document.getElementById("nav-container");
  if (!containerElem) return;

  var U = document.createElement("span");
  U.textContent = "Ubiquity: ";
  U.className = "large";
  var [head] = document.getElementsByClassName("head");
  head.insertBefore(U, head.firstChild);

  var listElem = document.createElement("ul");
  listElem.id = "nav";
  containerElem.appendChild(listElem);

  var navUrls = [
    [L("ubiquity.nav.main"),
     "about:ubiquity"],
    [L("ubiquity.nav.settings"),
     "about:ubiquity?settings"],
    [L("ubiquity.nav.commands"),
     "about:ubiquity?cmdlist"],
    [L("ubiquity.nav.getnewcommands"),
     "https://wiki.mozilla.org/Labs/Ubiquity/Commands_In_The_Wild"],
    [L("ubiquity.nav.support"),
     "about:ubiquity?support"],
    [L("ubiquity.nav.hackubiquity"),
     "about:ubiquity?editor"]];

  var [currentUrl] = /^[^#]+/.exec(location.href);
  for each (let [name, url] in navUrls) {
    let listItem = document.createElement("li");
    if (currentUrl == url) listItem.className = "selected";
    listElem.appendChild(listItem);
    let link = document.createElement("a");
    link.href = url;
    link.innerHTML = name;
    listItem.appendChild(link);
  }
}

function setupHelp(clickee, help) {
  var [toggler] = $(clickee).click(function toggleHelp() {
    $(help)[(this.off ^= 1) ? "slideUp" : "slideDown"]();
    [this.textContent, this.bin] = [this.bin, this.textContent];
  });
  toggler.textContent = L("ubiquity.showhidehelp.show");
  toggler.bin = L("ubiquity.showhidehelp.hide");
  toggler.off = true;
}

// Jumps to the specified hash (re-jump if omitted),
// without using location.hash which doesn't work for about: URIs.
function jump(hash) {
  var {href} = location;
  if (hash)
    location = href.replace(/#.*|$/, "#" + hash);
  else if (~href.indexOf("#"))
    location = href;
}

function pasteToGist(name, code, ext) {
  //ToLocalize
  name = prompt(L("ubiquity.nav.githubpastename"), name);
  if (!name) return;
  var file = {};
  file[name + "." + ext] = code;
  Utils.gist.paste(file);
}

$(function onReady() {
  $(".version").text(UbiquitySetup.version);
  createNavLinks();
  jump();
});
