Components.utils.import("resource://ubiquity-modules/setup.js");
Components.utils.import("resource://ubiquity-modules/linkrel_codesvc.js");

$(window).ready(
  function setup() {
    var Cc = Components.classes;
    var oldAnnSvc = Cc["@mozilla.org/browser/annotation-service;1"]
                    .getService(Components.interfaces.nsIAnnotationService);
    var LRCS = new LinkRelCodeService(oldAnnSvc);
    var feedList = $("#command-feeds");
    var markedPages = LRCS.getMarkedPages();

    function addFeed(page) {
      feedList.append('<li><a href="' + page.htmlUri.spec + '">' +
                      page.title + '</li>');
    }

    markedPages.forEach(addFeed);
  }
);
