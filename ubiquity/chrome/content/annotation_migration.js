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
      
      function createLink(data){
          var confirmUrl = ("chrome://ubiquity/content/confirm-add-command.html?url=" +
                        encodeURIComponent(page.htmlUri.spec) + "&sourceUrl=" +
                        encodeURIComponent(page.jsUri.spec) + "&updateCode=" +
                        encodeURIComponent(data));
          
          feedList.append('<li><a href="' + page.htmlUri.spec + '">' +
                      page.title + ' <a href="' + confirmUrl + '">[resubscribe]</a></li>');
      }
      
      if(page.canAutoUpdate){
        jQuery.ajax({ url: page.jsUri.spec,
               dataType: "text",
               success: createLink });
      } else {
        createLink(page.getCode())
      }
    }

    markedPages.forEach(addFeed);
  }
);
