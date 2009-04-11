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
 *   Maria Emerson <memerson@mozilla.com>
 *   Aza Raskin <aza@mozilla.com>
 *   Abimanyu Raja <abimanyuraja@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Dietrich Ayala <dietrich@mozilla.com>
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

// TODO: This is almost identical to browser.js, which violates DRY.

var gUbiquity = null;

function ubiquitySetup()
{
  var jsm = {};
  Components.utils.import("resource://ubiquity/modules/setup.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/parser/parser.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/cmdmanager.js",
                          jsm);
  Components.utils.import("resource://ubiquity/modules/skinsvc.js",
                          jsm);
  var services = jsm.UbiquitySetup.createServices();
  jsm.UbiquitySetup.setupWindow(window);

  var nlParser = jsm.NLParser.makeParserForLanguage(
    jsm.UbiquitySetup.languageCode,
    [],
    []
  );


  var cmdMan = new jsm.CommandManager(services.commandSource,
                                      services.messageService,
                                      nlParser);

  //Install skin detector
  var skinService = new jsm.SkinSvc(window);
  skinService.installToWindow();
  skinService.updateAllSkins();

  //Load current skin
  var skinUrl = skinService.getCurrentSkin();
  var defaultSkinUrl = skinService.DEFAULT_SKIN;

  //For backwards compatibility since in 0.1.2
  //The pref was "default" or "old"
  //Now, we are storing the complete file path in the pref.
  if(skinUrl == "default" || skinUrl == "old"){
    skinUrl = defaultSkinUrl;
    skinService.setCurrentSkin(skinUrl);
  }
  try{
    skinService.loadSkin(skinUrl);
  }catch(e){
    //If there's any error loading the current skin,
    //load the default and tell the user about the failure
    skinService.loadSkin(defaultSkinUrl);
    services.messageService
            .displayMessage("Loading your current skin failed." +
                            "The default skin will be loaded.");
  }

  var previewIframe = document.getElementById("cmd-preview");
  var previewBlock = previewIframe.contentDocument
                     .getElementById("ubiquity-preview");

  function resizePreview() {
    previewIframe.height = previewIframe.contentDocument.height;
    previewIframe.width = previewBlock.scrollWidth;
  }

  previewIframe.contentDocument.addEventListener(
    "DOMSubtreeModified",
    function() { resizePreview(); },
    false
  );

  previewIframe.contentDocument.addEventListener(
    "load",
    function(aEvt) {
      if (aEvt.originalTarget.nodeName == "IMG")
        resizePreview();
    },
    true
  );

  gUbiquity = new Ubiquity(
    document.getElementById("cmd-entry"),
    cmdMan,
    previewBlock,
    jsm.UbiquitySetup.languageCode
  );
}

function ubiquityTeardown()
{
  /* TODO: Remove event listeners. */
}

window.addEventListener(
  "load",
  function() {
    var jsm = {};
    Components.utils.import("resource://ubiquity/modules/setup.js", jsm);
    jsm.UbiquitySetup.preload(ubiquitySetup);
  },
  false
);

window.addEventListener("unload", ubiquityTeardown, false);
