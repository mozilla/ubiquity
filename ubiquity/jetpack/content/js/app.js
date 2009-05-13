var App = {
  get isFirefoxOld() {
    var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                  .getService(Ci.nsIXULAppInfo);
    var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
                         .getService(Ci.nsIVersionComparator);
    if (versionChecker.compare(appInfo.version, "3.1b3") < 0)
      return true;
    return false;
  },

  // Open the JS error console.  This code was largely taken from
  // http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js
  openJsErrorConsole: function openJsErrorConsole() {
    var wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
    var wmInterface = wm.QueryInterface(Ci.nsIWindowMediator);
    var topWindow = wmInterface.getMostRecentWindow("global:console");

    if (topWindow)
      topWindow.focus();
    else
      window.open("chrome://global/content/console.xul", "_blank",
                  "chrome,extrachrome,menubar,resizable,scrollbars," +
                  "status,toolbar");
  },

  forceGC: function forceGC() {
    Components.utils.forceGC();
    App.tick();
  },

  tick: function tick() {
    var bins = MemoryTracking.getBins();
    var table = $('<table></table>');
    bins.forEach(
      function(name) {
        var objects = MemoryTracking.getLiveObjects(name);
        var row = $('<tr></tr>');
        row.append($('<td class="code"></td>').text(name));
        row.append($('<td></td>').text(objects.length));
        table.append(row);
      });
    $("#extension-weakrefs").empty().append(table);
  }
};

$(window).ready(
  function() {
    window.setInterval(App.tick, 1000);
    $("#force-gc").click(App.forceGC);
    $("#run-tests").click(function() { Tests.run(); });
    $("#display-sample").click(
      function() { $("#sample-code").slideToggle(); }
    );

    if (window.console.isFirebug) {
      $(".logging-source").text("Firebug Console");
    } else {
      $("#firebug-not-found").show();
      $(".logging-source").click(App.openJsErrorConsole);
      $(".logging-source").addClass("buttony");
      $(".logging-source").text("JS Error Console");
    }

    if (App.isFirefoxOld)
      $("#old-firefox-version").show();

    Jetpack.FeedPlugin.FeedManager.getSubscribedFeeds().forEach(
      function(feed) {
        if (feed.type == "jetpack") {
          var url = feed.uri.spec;
          var link = $('<a></a>').attr('href', url).text(url);
          $("#jetpacks").append($('<div class="jetpack"></div>').append(link));
        }
      });

    App.forceGC();
  });
