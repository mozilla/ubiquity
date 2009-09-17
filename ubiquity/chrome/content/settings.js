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

Cu.import("resource://ubiquity/modules/cmdmanager.js");

var {skinService, messageService} = UbiquitySetup.createServices();
var {escapeHtml} = Utils;

$(onDocumentLoad);

function onDocumentLoad() {
  loadSkinList();

  // add the language options
  var {parserRegistry} =
    Cu.import("resource://ubiquity/modules/parser/new/namespace.js", null);
  /* Don't display every code in parserRegistry; only the ones that have
   * had command localization done.  For now this is a hardcoded list.
   * TODO kep this list updated when new localizations are done; eventually
   * replace with something that detects command localizations automatically.
   */
  var $langSelect = $("#language-select");
  var langCode = UbiquitySetup.languageCode || "en";
  var isNewParser = UbiquitySetup.parserVersion === 2;
  $("#use-new-parser-checkbox")[0].checked = isNewParser;
  if (isNewParser) $(".parser2").show();
  for each (let code in ["ca", "da", "de", "en", "es",
                         "ja", "nl", "pt", "$"]) {
    $langSelect.append(
      "<option value='" + code + "' " +
      (code === langCode ? " selected='selected'" : "") + ">" +
      parserRegistry[code] +
      "</option>");
  }
  changeLanguageSettings();

  // set the external calls control to the correct value:
  $("#external-calls-on-all-queries")[0].checked =
    UbiquitySetup.doNounFirstExternals;

  $("#max-suggestions").change(function changeMaxSuggestions() {
    CommandManager.maxSuggestions = this.value;
    this.value = CommandManager.maxSuggestions;
  }).val(CommandManager.maxSuggestions);
}

function changeLanguageSettings() {
  var changed = false;
  var prefs = (Cc["@mozilla.org/preferences-service;1"]
               .getService(Ci.nsIPrefService)
               .getBranch("extensions.ubiquity."));
  var useParserVersion = $("#use-new-parser-checkbox")[0].checked ? 2 : 1;
  if (useParserVersion !== prefs.getIntPref("parserVersion")) {
    changed = true;
    prefs.setIntPref("parserVersion", useParserVersion);
  }
  var [langSelect] = $("#language-select");
  Array.forEach(langSelect.options, function eachOpt(opt) {
    opt.disabled = useParserVersion < 2 && ["en", "$"].indexOf(opt.value) < 0;
  });
  if (langSelect.options[langSelect.selectedIndex].disabled)
    langSelect.value = "en";

  var useLanguage = langSelect.value;
  if (useLanguage !== prefs.getCharPref("language")) {
    changed = true;
    prefs.setCharPref("language", useLanguage);
  }

  if (changed) {
    $(".parser2")[useParserVersion < 2 ? "slideUp": "slideDown"]();
  }
}

function changeExternalCallSettings() {
  const PREF_NFE = "extensions.ubiquity.doNounFirstExternals";
  var {prefs} = Application;
  var externalCallsOnAllQueries =
    +$("#external-calls-on-all-queries")[0].checked;
  if (externalCallsOnAllQueries !== prefs.getValue(PREF_NFE, 0)) {
    prefs.setValue(PREF_NFE, externalCallsOnAllQueries);
    $("#external-calls-settings-changed-info").html(
      "<em>" + L("ubiquity.settings.opennewwindows") + "</em>");
  }
}

function loadSkinList() {
  var {CUSTOM_SKIN, currentSkin, skinList} = skinService;
  var $list = $("#skin-list").empty();
  var i = 0;
  for each (let skin in skinList)
    if (skin.localUrl === CUSTOM_SKIN)
      var customSkin = skin;
    else
      $list.append(createSkinElement(skin, i++));
  $list.append(createSkinElement(customSkin, i));
  checkSkin(currentSkin);
  // If current skin is custom skin, auto-open the editor
  if (currentSkin === CUSTOM_SKIN)
    openSkinEditor();
}

function createSkinElement(skin, id) {
  var {localUrl: filepath, downloadUrl: origpath, metaData: skinMeta} = skin;
  var skinId = "skin_" + id;
  var skinEl = $(
    '<div class="command" id="' + skinId + '">' +
    ('<input type="radio" name="skins" id="rad_' + skinId +
     '" value="' + escapeHtml(filepath) + '"></input>') +
    '<label class="label light" for="rad_'+ skinId + '">' +
    '<a class="name"/><br/>' +
    '<span class="author"></span><br/>' +
    '<span class="license"></span></label>' +
    '<div class="email light"></div>' +
    '<div class="homepage light"></div></div>');

  //Add the name and onchange event
  skinEl.find(".name").text(skinMeta.name);
  skinEl.find("input").change(function onRadioChange() {
    skinService.changeSkin(filepath);
  });

  if ("author" in skinMeta)
    skinEl.find(".author").text(L("ubiquity.settings.skinauthor",
                                  skinMeta.author));
  if ("email" in skinMeta) {
    let ee = escapeHtml(skinMeta.email);
    skinEl.find(".email")[0].innerHTML = "email: " + ee.link("mailto:" + ee);
  }
  if ("license" in skinMeta)
    skinEl.find(".license").text(L("ubiquity.settings.skinlicense",
                                   skinMeta.license));
  if ("homepage" in skinMeta) {
    let eh = escapeHtml(skinMeta.homepage);
    skinEl.find(".homepage")[0].innerHTML = eh.link(eh);
  }

  ($('<a class="action" target="_blank"></a>')
   .attr("href", "view-source:" + filepath)
   .text(L("ubiquity.settings.viewskinsource"))
   .appendTo(skinEl));
  if (filepath !== origpath) (
    $('<a class="action"></a>')
    .text(L("ubiquity.settings.uninstallskin"))
    .click(function uninstall() {
      var before = skinService.currentSkin;
      skinService.uninstall(filepath);
      var after = skinService.currentSkin;
      if (before !== after) checkSkin(after);
      skinEl.slideUp();
    })
    .appendTo(skinEl.append(" ")));

  return skinEl;
}

function checkSkin(url) {
  $("#skin-list input:radio").each(function radio() {
    if (this.value === url) {
      this.checked = true;
      return false;
    }
  });
}

function openSkinEditor() {
  $("#editor-div").show();
  $("#skin-editor").val(Utils.getLocalUrl(skinService.CUSTOM_SKIN)).focus();
  $("#edit-button").hide();
}

function saveCustomSkin() {
  try {
    skinService.saveCustomSkin($("#skin-editor").val());
  } catch (e) {
    messageService.displayMessage(L("ubiquity.settings.skinerror"));
    Cu.reportError(e);
    return;
  }
  messageService.displayMessage(L("ubiquity.settings.skinsaved"));
  loadSkinList();
  if (skinService.currentSkin === skinService.CUSTOM_SKIN)
    skinService.loadCurrentSkin();
}

function saveAs() {
  try {
    skinService.saveAs($("#skin-editor").val(), "custom");
  } catch (e) {
    messageService.displayMessage(L("ubiquity.settings.skinerror"));
    Cu.reportError(e);
    return;
  }
  loadSkinList();
}

function pasteToGist() {
  var data = $("#skin-editor").val();
  var ext = ".css";
  var name = Utils.trim((/@name[ \t]+(.+)/(data) || [, "ubiquity-skin"])[1]);
  Utils.openUrlInBrowser(
    "http://gist.github.com/gists/",
    ["file_" + key + "[gistfile1]=" + encodeURIComponent(val)
     for each ([key, val] in Iterator({
       ext: ext, name: name + ext, contents: data,
     }))].join("&"));
}
