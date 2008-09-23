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

function MixedCodeSourceCollection(headerSources,
                                   bodySources,
                                   footerSources) {
  this.__iterator__ = function MCSC_iterator() {
    let headerCode = '';
    for (headerCs in headerSources) {
      headerCode += headerCs.getCode();
    }

    let footerCode = '';
    for (footerCs in footerSources) {
      footerCode += footerCs.getCode();
    }

    for (bodyCs in bodySources) {
      let code = headerCode + bodyCs.getCode() + footerCode;
      yield new StringCodeSource(code, bodyCs.id, bodyCs.dom);
    }
  };
}

function StringCodeSource(code, id, dom) {
  this._code = code;
  this.id = id;
  this.dom = dom;
}

StringCodeSource.prototype = {
  getCode: function() {
    return this._code;
  }
};

function RemoteUriCodeSource(pageInfo) {
  this.id = pageInfo.jsUri.spec;
  this._pageInfo = pageInfo;
  this._req = null;
};

RemoteUriCodeSource.isValidUri = function RUCS_isValidUri(uri) {
  uri = Utils.url(uri);
  return (uri.scheme == "http" ||
          uri.scheme == "https");
};

RemoteUriCodeSource.prototype = {
  getCode : function() {
    if (!this._req) {
      // Queue another XMLHttpRequest to fetch the latest code.

      var self = this;
      self._req = new XMLHttpRequest();
      self._req.open('GET', this._pageInfo.jsUri.spec, true);
      self._req.overrideMimeType("text/plain");

      self._req.onreadystatechange = function RUCS__onXhrChange() {
        if (self._req.readyState == 4) {
          if (self._req.status == 200)
            // Update our cache.
            self._pageInfo.setCode(self._req.responseText);
          self._req = null;
        }
      };

      this._req.send(null);
    }

    // Return whatever we've got cached for now.
    return this._pageInfo.getCode();
  }
};

function LocalUriCodeSource(uri) {
  this.id = uri;
  this.uri = uri;
}

LocalUriCodeSource.isValidUri = function LUCS_isValidUri(uri) {
  uri = Utils.url(uri);
  return (uri.scheme == "file" ||
          uri.scheme == "chrome" ||
          uri.scheme == "resource");
};

LocalUriCodeSource.prototype = {
  getCode : function() {
    var req = new XMLHttpRequest();
    req.open('GET', this.uri, false);
    req.overrideMimeType("text/javascript");
    req.send(null);
    /* TODO if you have a bookmark to a local file, and the expected file
       isn't there, this will throw an exception that takes Ubiquity down
       with it. */
    if (req.status == 0)
      return req.responseText;
    else
      // TODO: Throw an exception or display a message.
      return "";
  }
};

function XhtmlCodeSource(codeSource) {
  var dom;

  function DomUnavailableError() {};

  this.DomUnavailableError = DomUnavailableError;

  this.__defineGetter__("dom",
                        function() { return dom ? dom : undefined; });

  this.__defineGetter__("id",
                        function() { return codeSource.id; });

  this.getCode = function XHTMLCS_getCode() {
    var code = codeSource.getCode();

    var trimmedCode = Utils.trim(code);
    if (trimmedCode.length > 0 &&
        trimmedCode[0] == "<") {
      if (!XhtmlCodeSource.isAvailable())
        throw new DomUnavailableError();
      var parser = new DOMParser();
      // TODO: What if this fails?
      dom = parser.parseFromString(code, "text/xml");

      var newCode = "";
      jQuery("script", dom).each(function() { newCode += this.text; });
      return newCode;
    }

    dom = undefined;
    return code;
  };
}

XhtmlCodeSource.isAvailable = function isAvailable() {
  try {
    var parser = new DOMParser();
  } catch (e if e instanceof ReferenceError) {
    return false;
  }
  return true;
};
