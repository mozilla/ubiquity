EXPORTED_SYMBOLS = ['start'];

let Cc = Components.classes;
let Ci = Components.interfaces;

let events = {};
Components.utils.import('resource://jsbridge/modules/events.js', events);

Components.utils.import('resource://ubiquity-modules/utils.js');

let INTERVAL_MS = 100;

function scheduleCheck() {
  function doCheck() {
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow('navigator:browser');

    if (win.gUbiquity) {
      dump('Ubiquity found.\n');
      events.fireEvent('ubiquity:success', true);
    } else {
      dump('Waiting ' + INTERVAL_MS + ' ms...\n');
      scheduleCheck();
    }
  }

  Utils.setTimeout(doCheck, INTERVAL_MS);
}

function start() {
  scheduleCheck();
}
