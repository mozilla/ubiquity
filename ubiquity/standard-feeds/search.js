/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ubiquity.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *   Aza Raskin <aza@mozilla.com>
 *   Maria Emerson <memerson@mozilla.com>
 *   Abimanyu Raja <abimanyu@gmail.com>
 *   Jono DiCarlo <jdicarlo@mozilla.com>
 *   Blair McBride <blair@theunfocused.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


// -----------------------------------------------------------------
// SEARCH COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  name: "search",
  icon: "chrome://ubiquity/skin/icons/search.png",
  description: "Search using your installed search engines",
  takes: {query: noun_arb_text},
  modifiers: {"with": noun_type_searchengine},
  preview: function(previewBlock, inputObject, queryModifiers) {
    var searchEngine = queryModifiers["with"].data;
    if(!searchEngine)
      searchEngine = noun_type_searchengine.getDefault();

    var previewTemplate = "Search using <b>${engine}</b> for:<br /><b>${query}</b>";
    var previewData = {
      engine: searchEngine.name,
      query: inputObject.text
    };
    previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);
  },
  execute: function(inputObject, queryModifiers) {
    var searchEngine = queryModifiers["with"].data;
    if(!searchEngine)
      searchEngine = noun_type_searchengine.getDefault();

    var searchSubmission = searchEngine.getSubmission(inputObject.text, null);
    Utils.openUrlInBrowser(searchSubmission.uri.spec, searchSubmission.postData);
  }
});


function fetchWikipediaArticle(previewBlock, articleTitle, langCode) {
  /* TODO
   - apply CSS max-height & overflow-y to summary container
  */
  if (!langCode)
    langCode = "en";
  var apiUrl = "http://" + langCode + ".wikipedia.org/w/api.php";
  var apiParams = {
    format: "json",
    action: "parse",
    page: articleTitle
  };

  jQuery.ajax({
    type: "GET",
    url: apiUrl,
    data: apiParams,
    datatype: "string",
    error: function() {
      previewBlock.innerHTML = "<i>Error retreiving summary.</i>";
    },
    success: function(responseData) {
      responseData = Utils.decodeJson(responseData);

      var tempElement = CmdUtils.getHiddenWindow().document.createElementNS("http://www.w3.org/1999/xhtml", "div");
      tempElement.innerHTML = responseData.parse.text["*"];

      //take only the text from summary because links won't work either way
      var articleSummary = jQuery(tempElement).find('p').eq(0).text();
      //remove citations [3], [citation needed], etc.
      //TODO: also remove audio links (.audiolink & .audiolinkinfo)
      articleSummary = articleSummary.replace(/\[([^\]]+)\]/g,"");

      //TODO: remove "may refer to" summaries

      var articleImageSrc = jQuery(tempElement).find(".infobox img").attr("src") ||
      jQuery(tempElement).find(".thumbimage").attr("src");

      var previewTemplate = "<img src=\"${img}\" style=\"float: left; max-width: 80px; max-height: 80px; background-color: white;\" />" +
      "<span class=\"wikisummary\">${summary}</span>";

      var previewData = {
        img: articleImageSrc,
        summary: articleSummary
      };

      previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);
    }
  });
}

CmdUtils.CreateCommand({
  name: "wikipedia",
  synonyms: ["lookup"],
  takes: {search: noun_arb_text},
  modifiers: {in: noun_type_language},
  locale: "en-US",
  homepage: "http://theunfocused.net/moz/ubiquity/verbs/",
  author: {name: "Blair McBride", email: "blair@theunfocused.net"},
  contributors: ["Viktor Pyatkovka"],
  license: "MPL",
  icon: "http://en.wikipedia.org/favicon.ico",
  description: "Searches Wikipedia for your words, in a given language.",
  preview: function(previewBlock, directObject, mods) {
    var langCode = mods.in.data || "en";
    var apiUrl = "http://" + langCode + ".wikipedia.org/w/api.php";

    var searchText = jQuery.trim(directObject.text);
    if(searchText.length < 1) {
      var previewStr = "Searches Wikipedia";
      if (mods.in.text) {
        var language = mods.in.text[0].toUpperCase() + mods.in.text.slice(1);
	previewStr = previewStr + " in " + language;
      }
      previewBlock.innerHTML = previewStr;
      return;
    }

    var previewTemplate = "Searching Wikipedia for <b>${query}</b> ...";
    var previewData = {query: searchText};
    previewBlock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

    var apiParams = {
      format: "json",
      action: "query",
      list: "search",
      srlimit: 5, // is this a good limit?
      srwhat: "text",
      srsearch: searchText
    };

    jQuery.ajax({
      type: "GET",
      url: apiUrl,
      data: apiParams,
      datatype: "string",
      error: function() {
        previewBlock.innerHTML = "Error searching Wikipedia";
      },
      success: function(searchResponse) {
        searchResponse = Utils.decodeJson(searchResponse);

        if(!("query" in searchResponse && "search" in searchResponse.query)) {
          previewBlock.innerHTML = "Error searching Wikipedia";
          return;
        }

        function generateWikipediaLink(title) {
          var wikipediaUrl = "http://" + langCode + ".wikipedia.org/wiki/";
          return wikipediaUrl + title.replace(/ /g, "_");
        }

        previewData = {
          query: searchText,
          results: searchResponse.query.search,
          _MODIFIERS: {wikilink: generateWikipediaLink}
        };

        previewBlock.innerHTML = CmdUtils.renderTemplate({file:"templates/wikipedia.html"}, previewData);

        jQuery(previewBlock).find("div[wikiarticle]").each(function() {
          var article = jQuery(this).attr("wikiarticle");
          fetchWikipediaArticle(this, article, langCode);
        });

      }
    });
  },
  execute: function(directObject, mods) {
    var lang = mods.in.data || "en";
    var searchUrl = "http://" + lang + ".wikipedia.org/wiki/Special:Search";
    var searchParams = {search: directObject.text};
    Utils.openUrlInBrowser(searchUrl + Utils.paramsToString(searchParams));
  }
});

CmdUtils.makeSearchCommand({
  name: "IMDB",
  synonyms: ["movie", "actor"],
  url: "http://www.imdb.com/find?s=all&q={QUERY}&x=0&y=0",
  icon: "http://i.imdb.com/favicon.ico",
  description: "Searches the Internet Movie Database for your words."
});


CmdUtils.makeSearchCommand({
  name: "yahoo-search",
  url: "http://search.yahoo.com/search?p={QUERY}&ei=UTF-8",
  icon: "http://search.yahoo.com/favicon.ico",
  description: "Searches <a href=\"http://search.yahoo.com\">Yahoo</a> for pages matching your words.",
  preview: function(pblock, directObject){
    //TODO: Figure out some way around rate limits
    //Currently, Yahoo rate limits to 5000 queries per IP per day
    var searchTerm = directObject.text;
    var pTemplate = "Searches Yahoo for <b>${query}</b>";
    var pData = {query: searchTerm};
    pblock.innerHTML = CmdUtils.renderTemplate(pTemplate, pData);

    var url = "http://search.yahooapis.com/WebSearchService/V1/webSearch";
    var params = {
      appid: "wZ.3jHnV34GC4QakIuzfgHTGiU..1SfNPwPAuasmt.L5ytoIPOuZAdP1txE4s6KfRBp9",
      query: searchTerm,
      results: 3,
      output: "json"
    };

    jQuery.get( url, params, function(data) {
      pblock.innerHTML = CmdUtils.renderTemplate( {file:"templates/yahoo-search.html"},
                   {results:data.ResultSet.Result}
                 );
    }, "json");
  }
});


CmdUtils.makeSearchCommand({
  name: "amazon-search",
  icon: "http://www.amazon.com/favicon.ico",
  description: "Searches <a href=\"http://www.amazon.com\">Amazon</a> for books matching your words.",
  url: "http://www.amazon.com/s/ref=nb_ss_gw?url=search-alias%3Dstripbooks&field-keywords={QUERY}",
  preview: function(previewBlock, directObject) {
	if(!directObject.text || directObject.text.length < 1) {
	  previewBlock.innerHTML = "Searches for books on Amazon";
	  return;
	}

	previewBlock.innerHTML = "Searching Amazon for books matching <b>" + directObject.summary + "</b>";

	var apiUrl = "http://ecs.amazonaws.com/onca/xml";
	var apiParams = {
	  Service: "AWSECommerceService",
	  AWSAccessKeyId: "08WX39XKK81ZEWHZ52R2",
	  Version: "2008-08-19",
	  Operation: "ItemSearch",
	  Condition: "All",
	  ResponseGroup: "ItemAttributes,Images",
	  SearchIndex: "Books",
	  Title: directObject.text
	};

	jQuery.ajax({
	  type: "GET",
	  url: apiUrl,
	  data: apiParams,
	  dataType: "xml",
	  error: function() {
		previewBlock.innerHTML = "Error searching Amazon.";
	  },
	  success: function(responseData) {
		const AMAZON_MAX_RESULTS = 5;

		responseData = jQuery(responseData);
		var items = [];

		responseData.find("Items Item").slice(0, AMAZON_MAX_RESULTS).each(function(itemIndex) {
		  var itemDetails = jQuery(this);

		  var newItem = {
			title: itemDetails.find("ItemAttributes Title").text(),
			url: itemDetails.find("DetailPageURL").text()
		  };

		  if(itemDetails.find("ItemAttributes Author").length > 0) {
			newItem.author = itemDetails.find("ItemAttributes Author").text();
		  }

		  if(itemDetails.find("ItemAttributes ListPrice").length > 0) {
			newItem.price = {
			  amount: itemDetails.find("ItemAttributes ListPrice FormattedPrice").text(),
			  currency: itemDetails.find("ItemAttributes ListPrice CurrencyCode").text()
			};
		  }

		  if(itemDetails.find("SmallImage").length > 0) {
			newItem.image = {
			  src: itemDetails.find("SmallImage:first URL").text(),
			  height: itemDetails.find("SmallImage:first Height").text(),
			  width: itemDetails.find("SmallImage:first Width").text()
			};
		  }

		  items.push(newItem);
		});

		var previewData = {
			query: directObject.summary,
			numitems: responseData.find("Items TotalResults").text(),
			items: items
		};

		previewBlock.innerHTML = CmdUtils.renderTemplate({file: "templates/amazon-search.html"}, previewData);
	  }
	});
  }
});


CmdUtils.makeSearchCommand({
  name: "YouTube",
  synonyms: ["video"],
  url: "http://www.youtube.com/results?search_type=search_videos&search_sort=relevance&search_query={QUERY}&search=Search",
  icon: "http://www.youtube.com/favicon.ico",
  description: "Searches <a href=\"http://www.youtube.com\">YouTube</a> for videos matching your words.",
  preview: function(pblock, directObject){
    var searchTerm = directObject.text;
    pblock.innerHTML = "Searches Youtube for <b>" + directObject.summary + "</b>";

    var url = "http://gdata.youtube.com/feeds/api/videos";
    var params = {
      alt: "json",
	  "max-results": 3,
      vq: searchTerm
    };

    jQuery.get( url, params, function(data) {
      pblock.innerHTML = CmdUtils.renderTemplate( {file:"templates/youtube.html"},
						  {
							results: data.feed.entry,
							query: directObject.summary,
							numresults: data.feed['openSearch$totalResults']['$t']
						  }
			);
    }, "json");
  }
});

CmdUtils.makeSearchCommand({
  name: "Flickr",
  synonyms: ["images"],
  url: "http://www.flickr.com/search/?q={QUERY}&w=all",
  icon: "http://www.flickr.com/favicon.ico",
  description: "Searches <a href=\"http://www.flickr.com\">Flickr</a> for pictures matching your words.",
  preview : function(previewBlock, inputObject){
    var inputText = inputObject.text;

    if(inputText.length < 1) {
      previewBlock.innerHTML = "Searches for photos on Flickr.";
      return;
    }

    previewBlock.innerHTML = "Searching for photos on Flickr...";

    var apiUrl = "http://api.flickr.com/services/rest/";
    var apiParams = {
      api_key: "4ca9aaaf5c2d83260eba9ab68ac1b1ac",
      format: "json",
      nojsoncallback: 1,
      method: "flickr.photos.search",
      media: "photos",
      text: inputText,
      per_page: 8,
      sort: "relevance"
    };

    jQuery.ajax({
      type: "GET",
      url: apiUrl,
      data: apiParams,
      datatype: "string",
      error: function() {
        previewBlock.innerHTML = "<i>Error searching Flickr.</i>";
      },
      success: function(responseData) {
        responseData = Utils.decodeJson(responseData);

        if(responseData.stat != "ok") {
          previewBlock.innerHTML = "<i>Error searching Flickr.</i>";
          return;
        }

        var previewData = {
          numcols: 4,
          nummatches: responseData.photos.total,
          photos: responseData.photos.photo
        };

        previewBlock.innerHTML = CmdUtils.renderTemplate({file:"templates/flickr.html"}, previewData);
    }
  });
}
});

CmdUtils.makeSearchCommand({
  name: "Bugzilla",
  url: "https://bugzilla.mozilla.org/buglist.cgi?query_format=specific&order=relevance+desc&bug_status=__open__&content={QUERY}",
  icon: "http://www.mozilla.org/favicon.ico",
  description: "Searches <a href=\"http://bugzilla.mozilla.com\">Bugzilla</a> for Mozilla bugs matching the given words."
});

CmdUtils.makeSearchCommand({
  name: "msn-search",
  url: "http://search.msn.com/results.aspx?q={QUERY}",
  icon: "http://search.msn.com/favicon.ico",
  description: "Searches <a href=\"http://search.msn.com\">MSN</a> for the given words.",
  preview: function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = "Searches MSN for " + directObj.text;
    else
      pBlock.innerHTML = "Searches MSN for the given words.";
  }
});

CmdUtils.makeSearchCommand({
  name: "ebay-search",
  url: "http://search.ebay.com/search/search.dll?satitle={QUERY}",
  icon: "http://search.ebay.com/favicon.ico",
  description: "Searches <a href=\"http://search.ebay.com\">EBay</a> for auctions matching the given words.",
  preview: function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = "Searches EBay for " + directObj.text;
    else
      pBlock.innerHTML = "Searches EBay for the given words.";
  }
});

CmdUtils.makeSearchCommand({
  name: "ask-search",
  url: "http://www.ask.com/web?q={QUERY}",
  icon: "http://www.ask.com/favicon.ico",
  description: "Searches <a href=\"http://www.ask.com\">Ask.com</a> for the given words.",
  preview: function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = "Searches Ask.com for " + directObj.text;
    else
      pBlock.innerHTML = "Searches Ask.com for the given words.";
  }
});

CmdUtils.makeSearchCommand({
  name: "answers-search",
  url: "http://www.answers.com/{QUERY}",
  icon: "http://www.answers.com/favicon.ico",
  description: "Searches <a href=\"http://www.answers.com\">Answers.com</a> for the given words.",
  preview: function(pBlock, directObj) {
    if (directObj.text)
      pBlock.innerHTML = "Searches Answers.com for " + directObj.text;
    else
      pBlock.innerHTML = "Searches Answers.com for the given words.";
  }
});

CmdUtils.CreateCommand({
  name: "yelp",
  takes: { "restaurant":noun_arb_text },
  // TODO: Should be noun_type_address, which is currently broken.
  // See http://labs.toolness.com/trac/ticket/44
  modifiers: { near:noun_arb_text },
  icon: "http://www.yelp.com/favicon.ico",
  description: "Searches <a href=\"http://www.yelp.com\">Yelp</a> for restaurants matching your words.",
  help: "You can search for restaurants near a certain location using the <i>near</i> modifier.  For example, try &quot;yelp pizza near boston&quot;.",
  execute: function( directObject, info ) {
    var doc = context.focusedWindow.document;
    var focused = context.focusedElement;

    if (doc.designMode == "on") {
      var data = globals.yelp[0];
      var msg = "<img style='float:left;margin:5px;border:solid #ccc 5px;' src='${photoUrl}'/><a href='${url}'>${name}</a> is a <img style='position:relative;top:5px;' src='${starUrl}'> restaurant in <a href='${whereUrl}'>${where}</a>, ${city}.<br/> It's been reviewed ${times} times.";
      var msg = CmdUtils.renderTemplate( msg, {
        url: data.url,
        starUrl: data.rating_img_url,
        photoUrl: data.photo_url_small,
        name: data.name,
        whereUrl: data.neighborhoods[0].url,
        where: data.neighborhoods[0].name,
        city: data.city,
        times: data.review_count
      });
      CmdUtils.setSelection( msg );
      return;
    }

    var query = directObject.text;
    var url = "http://www.yelp.com/search?find_desc={QUERY}&find_loc={NEAR}";
    url = url.replace( /{QUERY}/g, query);
    url = url.replace( /{NEAR}/g, info.near.text);

    Utils.openUrlInBrowser( url );
  },

  preview: function( pblock, directObject, info ) {
    var query = directObject.text;
    var url = "http://api.yelp.com/business_review_search?";

    if( query.length == 0 ) return;

    var loc = CmdUtils.getGeoLocation();
    var near = info.near.text || (loc.city + ", " + loc.state);

    var params = {
      term: query,
      num_biz_requested: 4,
      location: near,
      ywsid: "HbSZ2zXYuMnu1VTImlyA9A"
    };

    jQuery.get( url, params, function(data) {
      globals.yelp = data.businesses;
      pblock.innerHTML = CmdUtils.renderTemplate(
        {file:"templates/yelp.html"},
        {businesses: data.businesses}
      );

		}, "json");
  }
});

// -----------------------------------------------------------------
// WEATHER COMMANDS
// -----------------------------------------------------------------

var Temperature_Units = [
  'fahrenheit',
  'celsius'
];

var noun_type_temperature_units = new CmdUtils.NounType( "temperature units", Temperature_Units );

var WEATHER_TYPES = "none|tropical storm|hurricane|severe thunderstorms|thunderstorms|mixed rain and snow|mixed rain and sleet|mixed snow and sleet|freezing drizzle|drizzle|freezing rain|rain|rain|snow flurries|light snow showers|blowing snow|snow|hail|sleet|dust|foggy|haze|smoky|blustery|windy|cold|cloudy|mostly cloudy|mostly cloudy|partly cloudy|partly cloudy|clear|sunny|fair|fair|mixed rain and hail|hot|isolated thunderstorms|scattered thunderstorms|scattered thunderstorms|scattered showers|heavy snow|scattered snow showers|heavy snow|partly cloudy|thundershowers|snow showers|isolated thundershowers".split("|");

CmdUtils.CreateCommand({
  name: "weather",
  takes: {"location": noun_type_geolocation},
  modifiers: {"in": noun_type_temperature_units},
  icon: "http://www.wunderground.com/favicon.ico",
  description: "Checks the weather for a given location.",
  help: "Try issuing &quot;weather chicago&quot;.  It works with zip-codes, too.",
  execute: function( directObj ) {
    var location = directObj.text;
    var url = "http://www.wunderground.com/cgi-bin/findweather/getForecast?query=";
    url += escape( location );

    Utils.openUrlInBrowser( url );
  },

  preview: function( pblock, directObj, modifiers) {
    var location = directObj.text;
    if( location.length < 1 ) {
      pblock.innerHTML = "Gets the weather for a zip code/city.";
      return;
    }

    pblock.innerHTML = "Weather for " + location;

    //use either the specified "in" unit or get from geolocation
    var temp_units = 'celsius';
    if(!modifiers.in.text){
      var cc = CmdUtils.getGeoLocation().country_code;
      if(["US","UM","BZ"].indexOf(cc) != -1){
        temp_units = 'fahrenheit';
      }
    }else{
      temp_units = modifiers.in.text;
    }

    var url = "http://www.google.com/ig/api";
    jQuery.get( url, {weather: location}, function(xml) {
      var el = jQuery(xml).find("current_conditions");
      if( el.length == 0 ) return;

      var condition = el.find("condition").attr("data");

      var place = jQuery(xml).find("forecast_information > city").attr("data");

      var weatherId = WEATHER_TYPES.indexOf( condition.toLowerCase() );
      var imgSrc = "http://l.yimg.com/us.yimg.com/i/us/nws/weather/gr/";
      imgSrc += weatherId + "d.png";

      //change wind speed to kmh based on geolocation
      var wind_text = el.find("wind_condition").attr("data").split("at");
      var wind_speed = parseInt(wind_text[1].split(" ")[1]);
      var wind_units = "mph";
      //http://en.wikipedia.org/wiki/Si_units
      //UK uses mph
      if(["US","UM", "LR", "MM", "GB"].indexOf(cc) == -1){
        wind_units = "km/h";
        wind_speed = wind_speed * 1.6;
      }

      var wind = wind_text[0] + " at " + wind_speed.toFixed(1) + wind_units;
      var weather = {
        condition: condition,
        temp_units: temp_units,
        tempc: el.find("temp_c").attr("data"),
        tempf: el.find("temp_f").attr("data"),
        humidity: el.find("humidity").attr("data"),
        wind: wind,
        img: imgSrc
      };

      weather["img"] = imgSrc;

      var html = CmdUtils.renderTemplate( {file:"templates/weather.html"}, {w:weather, location:place}
                                        );

      jQuery(pblock).html( html );
      }, "xml");
  }
});


function defineWord(word, callback) {
  var url = "http://services.aonaware.com/DictService/DictService.asmx/DefineInDict";
  var params = Utils.paramsToString({
    dictId: "wn", //wn: WordNet, gcide: Collaborative Dictionary
    word: word
  });

  Utils.ajaxGet(url + params, function(xml) {
    CmdUtils.loadJQuery( function(jQuery) {
      var text = jQuery(xml).find("WordDefinition").text();
      callback(text);
    });
  });
}

CmdUtils.CreateCommand({
  name: "define",
  description: "Gives the meaning of a word.",
  help: "Try issuing &quot;define aglet&quot;",
  icon: "http://www.answers.com/favicon.ico",
  takes: {"word": noun_arb_text},
  execute: function( directObj ) {
    var word = directObj.text;
    Utils.openUrlInBrowser( "http://www.answers.com/" + escape(word) );
  },
  preview: function( pblock, directObj ) {
    var word = directObj.text;
    if (word.length < 2)
      pblock.innerHTML = "Gives the definition of a word.";
    else {
      pblock.innerHTML = "Gives the definition of the word " + word + ".";
      defineWord( word, function(text){
        text = text.replace(/(\d+:)/g, "<br/><b>$&</b>");
        text = text.replace(/(1:)/g, "<br/>$&");
        text = text.replace(word, "<span style='font-size:18px;'>$&</span>");
        text = text.replace(/\[.*?\]/g, "");

        pblock.innerHTML = text;
      });
    }
  }
});

//Don't release now cos it's still rough and users may be disappointed
//TODO: add support for POST forms
//TODO: add preview with pictures showing how to use command (?)

/*
CmdUtils.CreateCommand({
  description: "Creates a new Ubiquity command from a search-box.  Like creating a bookmark with keywords, except less clicking.",
  help: "Select a searchbox, click it and then type make-new... keyword, and a command named keyword will be created.",
  name: "make-new-search-command",
  author: {name: "Marcello Herreshoff",
           homepage: "http://stanford.edu/~marce110/"},
  icon: "chrome://ubiquity/skin/icons/search.png",
  license: "GPL/LGPL/MPL",
  homepage: "http://stanford.edu/~marce110/verbs/new-command-from-search-box.html",
  takes: {"command name": noun_arb_text},

  _makeURI : function(aURL, aOriginCharset, aBaseURI){
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(aURL, aOriginCharset, aBaseURI);
  },

  _escapeNameValuePair: function(aName, aValue, aIsFormUrlEncoded){
    if (aIsFormUrlEncoded)
      return escape(aName + "=" + aValue);
    else
      return escape(aName) + "=" + escape(aValue);
  },

  preview: function(pblock, input) {
    if(input.text.length < 1){
      pblock.innerHTML = "Select a searchbox, click it and then type make-new... keyword, and a command named keyword will be created.";
    }else{
      pblock.innerHTML = "Creates a new search command called <b>" + input.text + "</b>";
    }
  },

  execute: function(name){
    //1. Figure out what this search-bar does.
    var node = context.focusedElement;
    if(!node || !node.form){
      displayMessage("You need to click on a searchbox before running this command."); return;
    }

    //Copied from chrome://browser/content/browser.js, function AddKeywordForSearchField()
    //Comments starting with MMH: indicates that something has been changed by me.
    PLACEHOLDER = "{QUERY}"; //MMH: Note also: I have globally replaced "%s" with PLACEHOLDER
    //COPY STARTS
    var charset = node.ownerDocument.characterSet;

    var docURI = this._makeURI(node.ownerDocument.URL,
                         charset);

    var formURI = this._makeURI(node.form.getAttribute("action"),
                          charset,
                          docURI);

    var spec = formURI.spec;

    var isURLEncoded =
                 (node.form.method.toUpperCase() == "POST"
                  && (node.form.enctype == "application/x-www-form-urlencoded" ||
                      node.form.enctype == ""));

    var el, type;
    var formData = [];

    for (var i=0; i < node.form.elements.length; i++) {
      el = node.form.elements[i];

      if (!el.type) // happens with fieldsets
        continue;

      if (el == node) {
        formData.push((isURLEncoded) ? this._escapeNameValuePair(el.name, PLACEHOLDER, true) :
                                       // Don't escape PLACEHOLDER, just append
                                       this._escapeNameValuePair(el.name, "", false) + PLACEHOLDER);
        continue;
      }

      type = el.type.toLowerCase();

      if ((type == "text" || type == "hidden" || type == "textarea") ||
          ((type == "checkbox" || type == "radio") && el.checked)) {
        formData.push(this._escapeNameValuePair(el.name, el.value, isURLEncoded));
      //} else if (el instanceof HTMLSelectElement && el.selectedIndex >= 0) {
      } else if (el.selectedIndex && el.getTagName() == "select" && el.selectedIndex >= 0){
           //MMH: HTMLSelectElement was undefined.
        for (var j=0; j < el.options.length; j++) {
          if (el.options[j].selected)
            formData.push(this._escapeNameValuePair(el.name, el.options[j].value,
                                              isURLEncoded));
        }
      }
    }

    var postData;

    if (isURLEncoded)
      postData = formData.join("&");
    else
      spec += "?" + formData.join("&");

    //COPY ENDS

    if(postData){
      displayMessage("Sorry.  Support for POST-method forms is yet to be implemented.");
      return;
    }

    var url = spec;

    //2. Now that we have the form's URL, figure out the name, description and favicon for the command
    currentLocation = String(Application.activeWindow.activeTab.document.location);
    domain = currentLocation.replace(/^(.*):\/\//, '').split('/')[0];
    name = name.text;
    if(!name){ var parts = domain.split('.'); name = parts[parts.length-2]}
    var icon = "http://"+domain+"/favicon.ico";
    var description = "Searches " + domain;

    //3. Build the piece of code that creates the command
    var code =  '\n\n//Note: This command was automatically generated by the make-new-search-command command.\n'
    code += 'CmdUtils.makeSearchCommand({\n'
    code += '  name: "'+name+'",\n';
    code += '  url: "'+url+'",\n';
    code += '  icon: "'+icon+'",\n';
    code += '  description: "'+description+'"\n';
    code += '});\n'
    //4. Append the code to Ubiqity's code
    CmdUtils.UserCode.appendCode(code);

    //5. Tell the user we finished
    displayMessage("You have created the command: " + name +
                   ".  You can edit its source-code with the command-editor command.");
  }
});*/