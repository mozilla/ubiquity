var App = {
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
    $("#jetpacks").empty();
    for (url in Jetpack.FeedPlugin.Feeds)
      $("#jetpacks").append($('<div class="jetpack"></div>').text(url));

    var bins = MemoryTracking.getBins();
    var table = $('<table></table>');
    bins.forEach(
      function(name) {
        var objects = MemoryTracking.getLiveObjects(name);
        if (objects.length) {
          var row = $('<tr></tr>');
          row.append($('<td class="code"></td>').text(name));
          row.append($('<td></td>').text(objects.length));
          table.append(row);
        }
      });
    $("#extension-weakrefs").empty().append(table);
  }
};

$(window).ready(
  function() {
    window.setInterval(App.tick, 1000);
    $("#force-gc").click(App.forceGC);
    $("#js-error-console").click(App.openJsErrorConsole);

    if (!window.console.isFirebug && !window.loadFirebugConsole)
      $("#firebug-not-found").show();

    App.forceGC();
  });
