/* TODO
From Abi:
	I think the ones I most often use would be to check the current status
	of a specific friend (or maybe, the last 3 statuses). The ability to
	check your friends timeline as a whole would also be nice.


*/

// max of 140 chars is recommended, but it really allows 160... but that gets truncated on some displays? grr
const TWITTER_STATUS_MAXLEN = 140;


CmdUtils.CreateCommand({
  name: "twitter",
  synonyms: ["tweet"],
  icon: "http://assets3.twitter.com/images/favicon.ico",
  takes: {status: noun_arb_text},
  modifiers: {},
  description: "Sets your Twitter status to a message of at most 160 characters.",
  help: "You'll need a <a href=\"http://twitter.com\">Twitter account</a>, obviously.  If you're not already logged in" +
        " you'll be asked to log in.",
  preview: function(previewBlock, directObj) {
	// these are converted in the Twitter database anyway, and counted as 4 characters
    var statusText = directObj.text
	  .replace("<", "&lt;")
	  .replace(">", "&gt;");

    var previewTemplate = "Updates your Twitter status to: <br /><b>${status}</b><br /><br />Characters remaining: <b>${chars}</b> <p style='font-size:11px'> tip: tweet @mozillaubiquity for help </p>";
    var truncateTemplate = "<span style='color: red;'><br />The last <b>${truncate}</b> characters will be truncated!</span>";
    var previewData = {
      status: statusText,
      chars: TWITTER_STATUS_MAXLEN - statusText.length
    };

    var previewHTML = CmdUtils.renderTemplate(previewTemplate, previewData);

    if (previewData.chars < 0) {
      var truncateData = {
        truncate: 0 - previewData.chars
      };

      previewHTML += CmdUtils.renderTemplate(truncateTemplate, truncateData);
    }

    previewBlock.innerHTML = previewHTML;
  },
  execute: function(directObj) {
    var statusText = directObj.text;
    if(statusText.length < 1) {
      displayMessage("Twitter requires a status to be entered");
      return;
    }

    var updateUrl = "https://twitter.com/statuses/update.json";
    var updateParams = {
      source: "ubiquity",
      status: statusText.slice(0, TWITTER_STATUS_MAXLEN)
    };

    jQuery.ajax({
      type: "POST",
      url: updateUrl,
      data: updateParams,
      dataType: "json",
      error: function() {
        displayMessage("Twitter error - status not updated");
      },
      success: function() {
        var msg = updateParams.status.match(/^d /) ?
                  "Twitter direct message sent" :
                  "Twitter status updated";
        displayMessage(msg);
      }
    });
  }
});

CmdUtils.CreateCommand({
  name: "digg",
  synonyms: ["share-on-digg"],
  icon: "http://digg.com/favicon.ico",
  homepage: "http://www.gialloporpora.netsons.org",
  description: "If not yet submitted, submits the page to Digg. Otherwise, it takes you to the story's Digg page.",
  author: { name: "Sandro Della Giustina", email: "sandrodll@yahoo.it"},
  license: "MPL,GPL",
  execute: function() {
    var doc = CmdUtils.getDocument();
    var sel = doc.getSelection().substring(0,375);

    var params = Utils.paramsToString({
      phase: "2",
      url: doc.location,
      title: doc.title,
      bodytext: sel
    });

    story_url='http://digg.com/submit' + params;
    Utils.openUrlInBrowser(story_url);

  },
  preview: function(pblock) {

    var doc = CmdUtils.getDocument();
    var selected_text= doc.getSelection();
    var api_url='http://services.digg.com/stories';

    var params = Utils.paramsToString({
      appkey: "http://www.gialloporpora.netsons.org",
      link: doc.location
    });

    var html= 'Submit or digg this page. Checking if this page has already been submitted...';
    pblock.innerHTML = html;

    CmdUtils.previewAjax(pblock, {
      type: "GET",
      url: api_url+params,
      error: function(){
        //pblock.innerHTML= 'Digg API seems to be unavailable or the URI is incorrect.<br/>';
      },
      success: function(xml){
        var el = jQuery(xml).find("story");
        var diggs = el.attr("diggs");

        if (diggs == null){
          html = 'Submit this page to Digg';
          if (selected_text.length > 0) {
            html += " with the description:<br/> <i style='padding:10px;color: #CCC;display:block;'>" + selected_text + "</i>";
            if (selected_text.length > 375){
              html +='<br/> Description can only be 375 characters. The last <b>'
              + (selected_text.length - 375) + '</b> characters will be truncated.';
            }
          }
        }
        else{
          html = 'Digg this page. This page already has <b>'+diggs+'</b> diggs.';
        }
        pblock.innerHTML = html;
      }
    });
  }
});


CmdUtils.CreateCommand({
  name: "tinyurl",
  takes: {"url to shorten": noun_type_url},
  icon: "http://tinyurl.com/favicon.ico",
  description: "Replaces the selected URL with a <a href=\"http://www.tinyurl.com\">TinyUrl</a>",
  preview: function( pblock, urlToShorten ){
    pblock.innerHTML = "Replaces the selected URL with a TinyUrl.";
    var baseUrl = "http://tinyurl.com/api-create.php?url=";
    pblock.innerHTML = "Replaces the selected URL with ",
    jQuery.get( baseUrl + urlToShorten.text, function( tinyUrl ) {
      if(tinyUrl != "Error") pblock.innerHTML += tinyUrl;
    });
  },
  execute: function( urlToShorten ) {
    //escaping urlToShorten will not create the right tinyurl
    var baseUrl = "http://tinyurl.com/api-create.php?url=";
    jQuery.get( baseUrl + urlToShorten.text, function( tinyUrl ) {
      CmdUtils.setSelection( tinyUrl );
    });
  }
});
