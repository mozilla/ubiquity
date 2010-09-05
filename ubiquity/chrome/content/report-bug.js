Components.utils.import("resource://ubiquity/modules/utils.js");

var Cc = Components.classes;
var Ci = Components.interfaces;

var BUG_REPORT_PREF = "extensions.ubiquity.bugReportUri";

var gIsSubmitInProgress = false;

function _getExtensionInfo(Application) {
  var extensions = {};
  Application.extensions.all.forEach(function(ext) {
    extensions[ext.name] = {
      version:  ext.version,
      firstRun: ext.firstRun,
      enabled:  ext._enabled,
    };
  });
  return extensions;
}

function _getBrowserInfo(Application) {
  var numTabs = 0;
  Application.windows.forEach(function(win) {
    numTabs += win.tabs.length;
  });

  var nav = window.navigator;

  return {
    name:            Application.name,
    version:         Application.version,
    numberOfWindows: Application.windows.length,
    numberOfTabs:    numTabs,
    cookieEnabled:   nav.cookieEnabled,
    language:        nav.language,
    buildID:         nav.buildID,
  };
}

function _getOSInfo() {
  var hostJS = window.navigator;

  return {
    oscpu:    hostJS.oscpu,
    platform: hostJS.platform,
  };
}

function _getPluginInfo() {
  var plugins = [];
  var hostJS = window.navigator;
  for (var i=0; i < hostJS.plugins.length; i++) {
    plugins.push({
      name: hostJS.plugins[i].name,
      //description: hostJS.plugins[i].description,
      filename: hostJS.plugins[i].filename,
    });
  }
  return plugins;
}

function _getErrorInfo() {
  var consoleService = Utils.ConsoleService;

  // Get the last five errors
  var errors = {};
  var count = {};
  consoleService.getMessageArray(errors, count);
  errors = errors.value.slice(-5);

  var errorList = [];
  errors.forEach(
    function(error) {
      var info;
      try {
        var scriptErr = error.QueryInterface(Ci.nsIScriptError);
        info = {
          message: scriptErr.errorMessage,
          flags: scriptErr.flags,
          category: scriptErr.category,
          filename: scriptErr.sourceName,
          lineno: scriptErr.lineNumber,
        };
      } catch (e if e.result === Components.results.NS_NOINTERFACE) {
        info = {message: error.message};
      }
      errorList.push(info);
    });

  return errorList;
}

function _getDebugInfo() {
  return {
    browser:    _getBrowserInfo(Application),
    extensions: _getExtensionInfo(Application),
    plugins:    _getPluginInfo(),
    os:         _getOSInfo(),
    errors:     _getErrorInfo(),
  };
}

function visualize(info, elem) {
  var table = $('<table class="data"></table>');

  for (var name in info)
    if (info.hasOwnProperty(name)) {
      var value = info[name];
      var row = $('<tr class="item"></tr>');
      var nameCell = $('<td class="name"></td>');
      var valueCell = $('<td class="value"></td>');
      nameCell.text(name);
      if (typeof(value) == "object") {
        visualize(value, valueCell);
      } else {
        valueCell.text(value);
      }
      row.append(nameCell);
      row.append(valueCell);
      table.append(row);
    }

  elem.append(table);
}

function showResult(html, cb) {
  var node = $(html);
  node.hide();
  $("#output").append(node);
  node.slideDown("normal", cb);
}

function doSubmit(info) {
  if (gIsSubmitInProgress)
    return;
  gIsSubmitInProgress = true;
  $("#submit").removeClass("unbusy");
  $("#submit").addClass("busy");
  var description = $("#description").attr("value");
  info.description = description;

  function doFinish(msg) {
    showResult(msg,
               function() {
                 $("#submit").removeClass("busy");
                 $("#submit").addClass("unbusy");
                 gIsSubmitInProgress = false;
               });
  }

  var json = JSON.stringify(info);
  Utils.reportInfo("submitting: " + json);
  jQuery.ajax({
    contentType: "application/json",
    type: "POST",
    url: Utils.prefs.getValue(BUG_REPORT_PREF, ""),
    data: json,
    dataType: "json",
    success: function(data, textStatus) {
      doFinish("<p>Bug submitted with report id <tt>" + data.report_id +
               "</tt>.</p>");
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      doFinish("<p>An error occurred when submitting the report.</p>");
    }
  });
}

function onReady() {
  var info = _getDebugInfo();
  var elem = $("#data");

  visualize(info, elem);
  $("#description").focus();
  $("#form").submit(function(aEvt) {
    aEvt.preventDefault();
    doSubmit(info);
  });
}

$(window).ready(onReady);
