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

EXPORTED_SYMBOLS = ["MixedCodeSource",
                    "StringCodeSource",
                    "RemoteUriCodeSource",
                    "LocalUriCodeSource",
                    "XhtmlCodeSource"];

Components.utils.import("resource://ubiquity-modules/utils.js");

var Cc = Components.classes;
var Ci = Components.interfaces;

function MixedCodeSource(bodySource,
                         headerSources,
                         footerSources) {
  this.id = bodySource.id;

  this.getCode = function getCode() {
    let code;
    let codeSections = [];
    let headerCode = '';
    let headerCodeSections = [];

    for (headerCs in headerSources) {
      code = headerCs.getCode();
      headerCode += code;
      headerCodeSections.push({length: code.length,
                               filename: headerCs.id,
                               lineNumber: 1});
    }

    let footerCode = '';
    let footerCodeSections = [];
    for (footerCs in footerSources) {
      code = footerCs.getCode();
      footerCode += code;
      footerCodeSections.push({length: code.length,
                               filename: footerCs.id,
                               lineNumber: 1});
    }

    code = bodySource.getCode();
    codeSections = codeSections.concat(headerCodeSections);
    if (bodySource.codeSections)
      codeSections = codeSections.concat(bodySource.codeSections);
    else
      codeSections.push({length: code.length,
                         filename: bodySource.id,
                         lineNumber: 1});
    codeSections = codeSections.concat(footerCodeSections);
    code = headerCode + code + footerCode;

    this.codeSections = codeSections;
    this.dom = bodySource.dom;

    return code;
  };
}

function StringCodeSource(code, id, dom, codeSections) {
  this._code = code;
  this.id = id;
  this.dom = dom;
  this.codeSections = codeSections;
}

StringCodeSource.prototype = {
  getCode: function SCS_getCode() {
    return this._code;
  }
};

function RemoteUriCodeSource(feedInfo) {
  this.id = feedInfo.srcUri.spec;
  this._feedInfo = feedInfo;
  this._req = null;
  this._hasCheckedRecently = false;
};

RemoteUriCodeSource.isValidUri = function RUCS_isValidUri(uri) {
  uri = Utils.url(uri);
  return (uri.scheme == "http" ||
          uri.scheme == "https");
};

RemoteUriCodeSource.prototype = {
  getCode : function RUCS_getCode() {
    if (!this._req && !this._hasCheckedRecently) {
      this._hasCheckedRecently = true;

      // Queue another XMLHttpRequest to fetch the latest code.

      var self = this;
      self._req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                  .createInstance(Ci.nsIXMLHttpRequest);
      self._req.open('GET', this._feedInfo.srcUri.spec, true);
      self._req.overrideMimeType("text/plain");

      self._req.onreadystatechange = function RUCS__onXhrChange() {
        if (self._req.readyState == 4) {
          if (self._req.status == 200)
            // Update our cache.
            self._feedInfo.setCode(self._req.responseText);
          self._req = null;
          Utils.setTimeout(
            function() { self._hasCheckedRecently = false; },
            // TODO: Make the interval come from a preference.
            60000
          );
        }
      };

      this._req.send(null);
    }

    // Return whatever we've got cached for now.
    return this._feedInfo.getCode();
  }
};

function LocalUriCodeSource(uri) {
  this.id = uri;
  this.uri = uri;
  this._cached = null;
  this._cachedTimestamp = 0;
}

LocalUriCodeSource.isValidUri = function LUCS_isValidUri(uri) {
  uri = Utils.url(uri);
  return (uri.scheme == "file" ||
          uri.scheme == "chrome" ||
          uri.scheme == "resource" ||
          uri.scheme == "ubiquity");
};

LocalUriCodeSource.prototype = {
  getCode : function LUCS_getCode() {
    try {
      var url = Utils.url(this.uri);
      if (url.scheme == "file") {
        var file = url.QueryInterface(Components.interfaces.nsIFileURL).file;
        var lastModifiedTime = file.lastModifiedTime;

        if (this._cached && this._cachedTimestamp == lastModifiedTime)
          return this._cached;

        this._cachedTimestamp = lastModifiedTime;
      }

      var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
      req.open('GET', this.uri, false);
      req.overrideMimeType("text/javascript");
      req.send(null);

      if (req.status == 0) {
        if (req.responseText.indexOf("ERROR:") == 0)
          throw new Error(req.responseText);
        this._cached = req.responseText;
        return this._cached;
      } else
        throw new Error("XHR returned status " + req.status);
    } catch (e) {
      Components.utils.reportError("Retrieving " + this.uri +
                                   " raised exception " + e);
      return "";
    }
  }
};

function XhtmlCodeSource(codeSource) {
  var dom;
  var codeSections;
  var lastCode;
  var finalCode;

  this.__defineGetter__("dom",
                        function() { return dom ? dom : undefined; });

  this.__defineGetter__("id",
                        function() { return codeSource.id; });

  this.__defineGetter__("codeSections",
                        function() { return codeSections; });

  this.getCode = function XHTMLCS_getCode() {
    var code = codeSource.getCode();
    if (code == lastCode)
      return finalCode;

    lastCode = code;

    var trimmedCode = Utils.trim(code);
    if (trimmedCode.length > 0 &&
        trimmedCode[0] == "<") {
      var klass = Components.classes["@mozilla.org/xmlextras/domparser;1"];
      var parser = klass.createInstance(Components.interfaces.nsIDOMParser);

      // TODO: What if this fails?  Right now the behavior generally
      // seems ok simply because an exception doesn't get thrown here
      // if the XML isn't well-formed, we just get an error results
      // DOM back, which contains no command code.
      dom = parser.parseFromString(code, "text/xml");

      codeSections = [];
      var newCode = "";
      var xmlparser = {};
      Components.utils.import("resource://ubiquity-modules/xml_script_commands_parser.js", xmlparser);
      var info = xmlparser.parseCodeFromXml(code);
      for (var i = 0; i < info.length; i++) {
        newCode += info[i].code;
        codeSections.push({length: info[i].code.length,
                           filename: codeSource.id,
                           lineNumber: info[i].lineNumber});
      }

      finalCode = newCode;
    } else {
      dom = undefined;
      codeSections = undefined;
      finalCode = code;
    }
    return finalCode;
  };
}
