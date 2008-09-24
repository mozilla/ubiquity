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
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
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

let UbiquitySetup = {
  // TODO: This value is temporary.
  STANDARD_FEEDS: [{page: "sample.html",
                    source: "sample.js",
                    title: "Sample Standard Feed"}],

  // TODO: This value is temporary.
  BASE_REMOTE_URI: "http://localhost/",

  __getExtDir: function __getExtDir() {
    let Cc = Components.classes;
    let extMgr = Cc["@mozilla.org/extensions/manager;1"]
                 .getService(Components.interfaces.nsIExtensionManager);
    let loc = extMgr.getInstallLocation("ubiquity@labs.mozilla.com");
    let extDir = loc.getItemLocation("ubiquity@labs.mozilla.com");

    return extDir;
  },

  getBaseUri: function getBaseUri() {
    let ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
    let extDir = this.__getExtDir();
    let baseUri = ioSvc.newFileURI(extDir).spec;

    return baseUri;
  },

  isInstalledAsXpi: function isInstalledAsXpi() {
    let Cc = Components.classes;
    let profileDir = Cc["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
    let extDir = this.__getExtDir();
    if (profileDir.contains(extDir, false))
      return true;
    return false;
  },

  installDefaults: function installDefaults() {
    let baseLocalUri = this.getBaseUri() + "standard-feeds/";
    let baseUri;

    if (this.isInstalledAsXpi())
      baseUri = this.BASE_REMOTE_URI;
    else
      baseUri = baseLocalUri;

    LinkRelCodeSource.installDefaults(baseUri,
                                      baseLocalUri,
                                      this.STANDARD_FEEDS);
  }
};

function makeBuiltinGlobalsMaker(msgService, ubiquityGlobals) {
  var windowGlobals = {};

  function makeGlobals(codeSource) {
    var id = codeSource.id;

    if (!(id in windowGlobals))
      windowGlobals[id] = {};

    return {
      XPathResult: XPathResult,
      XMLHttpRequest: XMLHttpRequest,
      jQuery: jQuery,
      Template: TrimPath,
      Application: Application,
      Components: Components,
      window: window,
      feed: {id: codeSource.id,
             dom: codeSource.dom},
      windowGlobals: windowGlobals[id],
      globals: ubiquityGlobals.getForId(id),
      displayMessage: function() {
        msgService.displayMessage.apply(msgService, arguments);
      }
    };
  }

  return makeGlobals;
}

function makeBuiltinCodeSources(languageCode) {
  var baseUri = UbiquitySetup.getBaseUri() + "chrome/content/";

  var headerCodeSources = [
    new LocalUriCodeSource(baseUri + "utils.js"),
    new LocalUriCodeSource(baseUri + "cmdutils.js")
  ];
  var bodyCodeSources = [
    new LocalUriCodeSource(baseUri + "onstartup.js")
  ];
  var footerCodeSources = [
    new LocalUriCodeSource(baseUri + "final.js")
  ];

  dump( "Language code is " + languageCode + "\n");
  if (languageCode == "jp") {
    headerCodeSources.push(new LocalUriCodeSource(baseUri + "nlparser/jp/nountypes.js"));
    bodyCodeSources.push(new LocalUriCodeSource(baseUri + "nlparser/jp/builtincmds.js"));
  } else if (languageCode == "en") {
    headerCodeSources = headerCodeSources.concat([
      new LocalUriCodeSource(baseUri + "date.js"),
      new LocalUriCodeSource(baseUri + "nlparser/en/nountypes.js")
    ]);
    var templateCmds = new LocalUriCodeSource(baseUri + "templatecmds.xhtml");
    bodyCodeSources = bodyCodeSources.concat([
      new LocalUriCodeSource(baseUri + "builtincmds.js"),
      new LocalUriCodeSource(baseUri + "tagging_cmds.js"),
      new XhtmlCodeSource(templateCmds),
      new XhtmlCodeSource(PrefCommands)
    ]);
  }

  bodyCodeSources = new CompositeCollection([
    new IterableCollection(bodyCodeSources),
    new LinkRelCodeSource()
  ]);

  return new MixedCodeSourceCollection(
    new IterableCollection(headerCodeSources),
    bodyCodeSources,
    new IterableCollection(footerCodeSources)
  );
}
