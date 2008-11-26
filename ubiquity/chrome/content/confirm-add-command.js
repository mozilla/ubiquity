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
 *   Blair McBride <unfocused@gmail.com>
 *   Aza Raskin <aza@mozilla.com>
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

Components.utils.import("resource://ubiquity-modules/utils.js");
Components.utils.import("resource://ubiquity-modules/codesource.js");
Components.utils.import("resource://ubiquity-modules/builtinfactories.js");

function getUrlParams() {
  var urlFragments = document.URL.split("?")[1];
  urlFragments = urlFragments.split("&");
  var params = {};
  for( var x in urlFragments ) {
    var fragFrags = urlFragments[x].split("=");
    params[ fragFrags[0] ] = decodeURIComponent(fragFrags[1]);
  }
  return params;
}

var gCommandFeedInfo = getUrlParams();

function showConfirmation() {
  $("#errorPageContainer").css("background-color", "white");
  $("#errorPageContainer h1,h2,p,a,div").css("background-color",
                                             "transparent");

  $("#errorTitle").html("<h1>Subscription Successful</h1>");

  $("#errorShortDesc").html($("#confirmationShortDesc").html());
  $("#errorLongDesc").html($("#confirmationLongDesc").html());
  $("#buttons").remove();
}

function onSubmit() {
  var code = $("#sourceCode").text();
  var canUpdate = $("#autoupdate").attr("checked") ? true : false;
  if (code) {
    var linkRelCodeSvc = UbiquitySetup.createServices().linkRelCodeService;
    linkRelCodeSvc.addMarkedPage({url: gCommandFeedInfo.url,
                                  sourceCode: code,
                                  canUpdate: canUpdate});
    showConfirmation();
  }
}

function onCancel() {
  window.close();
}

function displayCode(data) {
    $("#sourceCode").css({whiteSpace: "pre-wrap",
                          fontFamily: "Monospace"});
    $("#sourceCode").text(data);
}

function fetchSource(uri, onSuccess) {
  if (LocalUriCodeSource.isValidUri(uri)) {
    $("#autoupdate-widget").hide();
    var codeSource = new LocalUriCodeSource(uri);
    onSuccess(codeSource.getCode());
  } else {
    jQuery.ajax({url: uri,
                 dataType: "text",
                 success: onSuccess});
  }
}

function onReady() {
  var linkRelCodeSvc = UbiquitySetup.createServices().linkRelCodeService;
  if (linkRelCodeSvc.isMarkedPage(gCommandFeedInfo.url)) {
    if (gCommandFeedInfo.updateCode)
      // TODO: Also check to see if updateCode is different from
      // the current code.
      displayCode(gCommandFeedInfo.updateCode);
    else
      showConfirmation();
  } else
    fetchSource(gCommandFeedInfo.sourceUrl, displayCode);

  $("#targetLink").text(gCommandFeedInfo.url);
  $("#targetLink").attr("href", gCommandFeedInfo.url);

  function onAutoupdateClicked() {
    if ($("#autoupdate").attr("checked"))
      $("#autoupdate-warning").slideDown();
    else
      $("#autoupdate-warning").slideUp();
  }

  var urlScheme = Utils.url(gCommandFeedInfo.sourceUrl).scheme;
  var safeSchemes = ["https", "chrome", "file", "resource"];
  if (safeSchemes.indexOf(urlScheme) == -1)
    $("#mitm-warning").show();

  $("#autoupdate").click(onAutoupdateClicked);
  onAutoupdateClicked();
}

$(window).ready(onReady);
