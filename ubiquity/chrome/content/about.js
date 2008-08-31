function makeRemover(element, uri) {
  function onHidden() {
    $(element).remove();
    if (!$("#command-feeds").text())
      $("#commands-feeds-div").slideUp();
  }
  function remove() {
    LinkRelCodeSource.removeMarkedPage(uri);
    $(element).slideUp(onHidden);
  }
  return remove;
}

function showBugRelatedAlerts() {
  // Show a warning for bug #146.
  var sanitizeOnShutdown = Application.prefs.getValue(
    "privacy.sanitize.sanitizeOnShutdown",
    false
  );
  if (sanitizeOnShutdown)
    $("#sanitizeOnShutdown-alert").slideDown();
}

function onReady() {
  PrefKeys.onLoad();
  showBugRelatedAlerts();
  let markedPages = LinkRelCodeSource.getMarkedPages();
  for (let i = 0; i < markedPages.length; i++) {
    let info = markedPages[i];
    var li = document.createElement("li");

    function addLink(text, url, className) {
      var linkToHtml = document.createElement("a");
      $(linkToHtml).text(text);
      if (className)
        $(linkToHtml).addClass(className);
      linkToHtml.href = url;
      $(li).append(linkToHtml);
    }

    addLink(info.title, info.htmlUri.spec);

    $(li).append("<br/>");

    var linkToUnsubscribe = document.createElement("span");
    $(linkToUnsubscribe).text("[unsubscribe]");
    $(linkToUnsubscribe).click(makeRemover(li, info.htmlUri));
    $(linkToUnsubscribe).css({cursor: "pointer", color: "#aaa"});
    $(li).append(linkToUnsubscribe);

    var sourceUrl;
    var sourceName;

    if (info.canUpdate) {
      sourceUrl = info.jsUri.spec;
      sourceName = "auto-updated source";
    } else {
      sourceUrl = "data:application/x-javascript," + escape(info.getCode());
      sourceName = "source";
    }

    $(li).append(" ");
    addLink("[view " + sourceName + "]", sourceUrl, "feed-action");

    $("#command-feeds").append(li);
  }
  if (!$("#command-feeds").text())
    $("#commands-feeds-div").hide();

  jQuery.get( "http://hg.toolness.com/ubiquity-firefox/rss-log", loadNews);
}

function loadNews( data ) {
  $("item", data).each(function(){
    var p = document.createElement("p");
    var a = document.createElement("a");


    $(a).attr("href", $("link", this).text() )
        .text( $("title", this).text() +"..." );

    var author = $("author", this).text();

    $(p).append(a).append("<span class='light'><br/>by " + author + "</span>");
    $("#news").append(p);
  });
}

$(window).ready(onReady);
