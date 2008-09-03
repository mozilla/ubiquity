var skins = {};

function formatCommandAuthor(authorData) {
  if(!authorData) return "";

  if(typeof authorData == "string") return authorData;

  var authorMarkup = '';
  if(authorData.name && !authorData.email) {
    authorMarkup += authorData.name + " ";
  } else if(authorData.name && authorData.email) {
    authorMarkup += '<a href="mailto:' + authorData.email + '">' +
      authorData.name +
      '</a> ';
  } else if(!authorData.name && authorData.email) {
    authorMarkup += '<a href="mailto:' + authorData.email + '">' +
      authorData.email +
      '</a> ';
  }

  if(authorData.homepage) {
    authorMarkup += '[<a href="' + authorData.homepage + '">Homepage</a>]';
  }

  if(authorMarkup.length == 0)
    return '';

  return 'by ' + authorMarkup;
}

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

function changeSkin(skin_id) {
  $('input#useskin').attr('disabled','disabled');
  $('#error').empty();
  
  try {
    var style_service = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    var io_service = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
      
    var cur_skin = Application.prefs.get('extensions.ubiquity.skin').value;
    Application.prefs.setValue('extensions.ubiquity.skin', skin_id);
    
    var old_browser_css = io_service.newURI(
      ((cur_skin == "default") ? "chrome://ubiquity/content/browser.css" : "chrome://ubiquity/content/skins/"+cur_skin+"/browser.css"),
      null,
      null
      );
    var old_preview_css = io_service.newURI(
      ((cur_skin == "default") ? "chrome://ubiquity/content/preview.css" : "chrome://ubiquity/content/skins/"+cur_skin+"/preview.css"),
      null,
      null
      );
    var browser_css = io_service.newURI(
      ((skin_id != "default") ? "chrome://ubiquity/content/skins/"+skin_id+"/browser.css" : "chrome://ubiquity/content/browser.css"),
      null,
      null
      );
    var preview_css = io_service.newURI(
      ((skin_id != "default") ? "chrome://ubiquity/content/skins/"+skin_id+"/preview.css" : "chrome://ubiquity/content/preview.css"),
      null,
      null
      );
    
    style_service.loadAndRegisterSheet(browser, style_service.USER_SHEET);
    style_service.loadAndRegisterSheet(preview, style_service.USER_SHEET);
    
    try {
      // this can fail and the rest still work
      if(style_service.sheetRegistered(old_browser, style_service.USER_SHEET))
        style_service.unregisterSheet(old_browser, style_service.USER_SHEET);
      if(style_service.sheetRegistered(old_preview, style_service.USER_SHEET))
        style_service.unregisterSheet(old_preview, style_service.USER_SHEET);
    } catch(e) {
      // do nothing
    }
    
  } catch(e) {
    $('#error').text('Error applying skin: ' + skin_id);
    Components.utils.reportError("Error applying Ubiquity skin '" + skin_id + "': " + e);
  }
}

$(document).ready(onDocumentLoad);
