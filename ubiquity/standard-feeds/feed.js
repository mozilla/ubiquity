var Feed = {
  SCRIPT_PREFIX: "scripts/",

  SCRIPTS_TO_LOAD: ["docs/docs.css",
                    "jquery.js", "wikicreole.js", "docs/docs.js"],

  loadNextScript: function() {
    if (this.SCRIPTS_TO_LOAD.length) {
      var baseName = this.SCRIPTS_TO_LOAD.pop();
      var e;
      if (baseName.indexOf('.js') != -1) {
        e = document.createElement("script");
        e.src = this.SCRIPT_PREFIX + baseName;
        e.type="text/javascript";
        e.addEventListener("load",
                           function() { Feed.loadNextScript(); },
                           false);
        document.body.appendChild(e);
      } else {
        e = document.createElement("link");
        e.rel = "stylesheet";
        e.type = "text/css";
        e.href = this.SCRIPT_PREFIX + baseName;
        document.body.appendChild(e);
        this.loadNextScript();
      }
    } else {
      // Trigger the onload/ready events of any scripts we just
      // loaded.
      var event = document.createEvent("HTMLEvents");
      event.initEvent("load", true, true);
      window.dispatchEvent(event);
    }
  }
};

window.addEventListener(
  "load",
  function initial() {
    window.removeEventListener("load", initial, false);
    var isParentDirUbiquity = /.*\/ubiquity\/standard-feeds\/.*/;
    Feed.SCRIPTS_TO_LOAD.reverse();
    if (window.location.protocol == "file:" ||
        window.location.pathname.match(isParentDirUbiquity))
      // If we're on Windows, we don't have symlinks, and if we're
      // being served via hgweb we don't either, so use the
      // real path.
      Feed.SCRIPT_PREFIX = "../" + Feed.SCRIPT_PREFIX;
    Feed.loadNextScript();
  },
  false
  );
