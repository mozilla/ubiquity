var skins = {};

function loadSkinsXML() {
  var req = new XMLHttpRequest();
  req.open("GET", "chrome://ubiquity/content/skins.xml", false);
  req.overrideMimeType("text/xml");
  req.send(null);
  if (req.status == 0)
    return req.responseXML;
  return null;
}

function onDocumentLoad() {
  // TODO: See if there's any other way to check for skins
  // in the skin folder.

  skins = {};
  var skinsXML = loadSkinsXML();
  if(skinsXML == null) {
    $("#skin-list").append(
      '<strong>Error loading list of skins.</strong>'
    );
    return;
  }
  
  var sks = $(skinsXML).find("skins");
  sks.find('skin').each(function(){
    var skin = $(this);
    var skinMeta = {
      'id': skin.attr('id'),
      'name': skin.find('name').text(),
      'author': {
        'name': skin.find('author').text(),
        'email': skin.find('author').attr('email'),
        'homepage': skin.find('author').attr('homepage')
      },
      'license': skin.find('license').text(),
      'description': skin.find('description').text()
    };
    skins[skinMeta.id] = skinMeta;
    
    $('#skin-list').append(
      '<li class="command" id="skin_' + skinMeta.id + '">' +
      '<a class="name" onClick="previewSkin(\''+skinMeta.id+'\');">' + skinMeta.name + '</a>' +
      '<span class="description"/>' +
      '<div class="light"><span class="author"/><span class="license"/></div>' +
      '<div class="homepage light"/>' +
      '</li>'
    );
    var skinElement = $(document.getElementById("skin_" + skinMeta.id));
    if(skinMeta.description)
      skinElement.find(".description").html(skinMeta.description);
    else
      skinElement.find(".description").empty();
    if(skinMeta.author)
      skinElement.find(".author").html(formatCommandAuthor(skinMeta.author));
    else
      skinElement.find(".author").empty();
    if(skinMeta.license)
      skinElement.find(".license").html(' - licensed as ' + skinMeta.license);
    else
      skinElement.find(".license").empty();
  });
    
  var sortKey = $("#sortby").val();
  $("#sortby").change(function() {
    sortKey = $("#sortby").val();
    sortSkinsBy(sortKey);
  });
  $('input#useskin').attr('disabled','disabled');
}

function sortSkinsBy(key) {
  var skinList = $("#skin-list");
  var allSkins = skinList.find(".command").get();

  allSkins.sort(function(a, b) {
    var aKey = $(a).find(key).text().toLowerCase();
    var bKey = $(b).find(key).text().toLowerCase();

    // ensure empty fields get given lower priority
    if(aKey.length > 0  && bKey.length == 0)
      return -1;
    if(aKey.length == 0  && bKey.length > 0)
      return 1;

    if(aKey < bKey)
      return -1;
    if(aKey > bKey)
      return 1;

    return 0;
  });

  $.each(allSkins, function(skinIndex, skin) {
    skinList.append(skin);
  });
}

function previewSkin(skin_id) {
  var cur_skin = Application.prefs.get('extensions.ubiquity.skin').value;
  $('#preview-image').html(skins[skin_id].name);
  if(cur_skin == skin_id) {
    $('input#useskin').attr('disabled','disabled');
  } else {
    $('input#useskin').removeAttr('disabled').click(function(){
      changeSkin(skin_id);
    });
  }
}

function changeSkin(newSkinName) {
  $('input#useskin').attr('disabled','disabled');
  $('#error').empty();
  
  try {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);

    var oldSkinName = Application.prefs.getValue("extensions.ubiquity.skin", "default");
    var skinFolderUrl = "chrome://ubiquity/skin/skins/";
    var oldBrowserCss = Utils.url(skinFolderUrl + oldSkinName + "/browser.css");
    var oldPreviewCss = Utils.url(skinFolderUrl + oldSkinName + "/preview.css");
    
    var browserCss = Utils.url(skinFolderUrl + newSkinName + "/browser.css");
    var previewCss = Utils.url(skinFolderUrl + newSkinName + "/preview.css");
    
    sss.loadAndRegisterSheet(browserCss, sss.USER_SHEET);
    sss.loadAndRegisterSheet(previewCss, sss.USER_SHEET);
    
    try {
      // this can fail and the rest still work
      if(sss.sheetRegistered(oldBrowserCss, sss.USER_SHEET))
        sss.unregisterSheet(oldBrowserCss, sss.USER_SHEET);
      if(sss.sheetRegistered(oldPreviewCss, sss.USER_SHEET))
        sss.unregisterSheet(oldPreviewCss, sss.USER_SHEET);
    } catch(e) {
      // do nothing
    }
    
    Application.prefs.setValue("extensions.ubiquity.skin", newSkinName);
    $('input#useskin').attr('disabled','disabled');
  } catch(e) {
    $('#error').text('Error applying skin: ' + skin_id);
    Components.utils.reportError("Error applying Ubiquity skin '" + skin_id + "': " + e);
  }
}

$(document).ready(onDocumentLoad);
