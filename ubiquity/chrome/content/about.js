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

function onReady() {
  PrefKeys.onLoad();
  let markedPages = LinkRelCodeSource.getMarkedPages();
  for (let i = 0; i < markedPages.length; i++) {
    let info = markedPages[i];
    var li = document.createElement("li");

    var linkToHtml = document.createElement("a");
    $(linkToHtml).text(info.title);
    linkToHtml.href = info.htmlUri.spec;
    $(li).append(linkToHtml);

    var linkToUnsubscribe = document.createElement("span");
    $(linkToUnsubscribe).text(" [unsubscribe]");
    $(linkToUnsubscribe).click(makeRemover(li, info.htmlUri));
    $(linkToUnsubscribe).css({cursor: "pointer", color: "#aaa"});
    $(li).append(linkToUnsubscribe);

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
        .text( $("title", this).text() +"..." )
    
    var author = $("author", this).text();

    $(p).append(a).append("<span class='light'><br/>by " + author + "</span>");
    $("#news").append(p);
  })
}

$(window).ready(onReady);
