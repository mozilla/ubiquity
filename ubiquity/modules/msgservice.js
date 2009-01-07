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

EXPORTED_SYMBOLS = ["ExceptionUtils",
                    "ErrorConsoleMessageService",
                    "AlertMessageService",
                    "CompositeMessageService"];

Components.utils.import("resource://ubiquity/modules/utils.js");

let Cc = Components.classes;
let Ci = Components.interfaces;

var ExceptionUtils = {
  stackTraceFromFrame: function stackTraceFromFrame(frame, formatter) {
    if (!formatter)
      formatter = function defaultFormatter(frame) { return frame; };

    var output = "";

    while (frame) {
      output += formatter(frame) + "\n";
      frame = frame.caller;
    }

    return output;
  },

  stackTrace: function stackTrace(e, formatter) {
    var output = "";
    if (e.location) {
      // It's a wrapped nsIException.
      output += this.stackTraceFromFrame(e.location, formatter);
    } else if (e.stack)
      // It's a standard JS exception.

      // TODO: It would be nice if we could parse this string and
      // create a 'fake' nsIStackFrame-like call stack out of it,
      // so that we can do things w/ this stack trace like we do
      // with nsIException traces.
      output += e.stack;
    else
      // It's some other thrown object, e.g. a bare string.
      output += "No traceback available.\n";

    return output;
  }
};

function ErrorConsoleMessageService() {
  this.displayMessage = function(msg) {
    if (typeof(msg) == "object" && msg.exception) {
      var tb = ExceptionUtils.stackTrace(msg.exception);
      Components.utils.reportError(msg.exception);
      Components.utils.reportError("Traceback for last exception:\n" + tb);
    }
  };
}

function AlertMessageService() {
  this.ALERT_IMG = "http://www.mozilla.com/favicon.ico";

  this.displayMessage = function(msg) {
    var text = msg;
    var title = "Ubiquity Notification";
    var icon = this.ALERT_IMG;

    if (typeof(msg) == "object") {
      text = msg.text;

      if (msg.title)
        title = msg.title;

      if (msg.icon)
        icon = msg.icon;

      if (msg.exception) {
        let Application = Cc["@mozilla.org/fuel/application;1"]
                          .getService(Ci.fuelIApplication);
        let SHOW_ERR_PREF = "extensions.ubiquity.displayAlertOnError";
        let showErr = Application.prefs.getValue(SHOW_ERR_PREF, false);

        if (showErr)
          text += "\n" + msg.exception;
        else
          return;
      }
    }

    try {
      var classObj = Components.classes["@mozilla.org/alerts-service;1"];
      var alertService = classObj.getService(Ci.nsIAlertsService);

      alertService.showAlertNotification(icon, title, text);
    } catch (e) {
      Components.utils.reportError(e);
      Utils.focusUrlInBrowser("chrome://ubiquity/content/bug19warning.html");
    }
  };
}

function CompositeMessageService() {
  this._services = [];
}

CompositeMessageService.prototype = {
  add: function CMS_add(service) {
    this._services.push(service);
  },

  displayMessage: function CMS_displayMessage(msg) {
    for (var i = 0; i < this._services.length; i++)
      this._services[i].displayMessage(msg);
  }
}
