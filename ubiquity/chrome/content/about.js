function makeRemover(element, uri) {
  function onHidden() {
    $(element).remove();
    if (!$("#command-feeds").text())
      $("#command-feeds-header").slideUp();
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

    var linkToUnsubscribe = document.createElement("div");
    $(linkToUnsubscribe).text("unsubscribe");
    $(linkToUnsubscribe).click(makeRemover(li, info.htmlUri));
    $(linkToUnsubscribe).css({cursor: "pointer"});
    $(li).append(linkToUnsubscribe);

    $("#command-feeds").append(li);
  }
  if (!$("#command-feeds").text())
    $("#command-feeds-header").hide();
}

$(window).ready(onReady);
