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

function StringCodeSource(code) {
  this._code = code;
}

StringCodeSource.prototype = {
  getCode: function() {
    return this._code;
  }
};

function RemoteUriCodeSource(pageInfo) {
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
      self._req.overrideMimeType("text/javascript");

      function isJsType(type) {
        var validTypes = ["text/javascript",
                          "text/ecmascript",
                          "text/plain",
                          "application/x-javascript",
                          "application/javascript"];
        for (var i = 0; i < validTypes.length; i++) {
          // We only want to see if the string starts with the
          // type, since it might contain extra information, e.g.
          // 'text/html;charset=utf-8'.
          if (type.indexOf(validTypes[i]) == 0)
            return true;
        }
        return false;
      }

      self._req.onreadystatechange = function RUCS__onXhrChange() {
        if (self._req.readyState == 4) {
          if (self._req.status == 200) {
            // Update our cache.
            if (isJsType(self._req.getResponseHeader("Content-Type")))
              self._pageInfo.setCode(self._req.responseText);
          } else {
            // TODO: What should we do? Display a message?
          }
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
