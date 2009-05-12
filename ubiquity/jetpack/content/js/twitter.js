/**
 * Twitter is the top-level object.  It contains static methods.  See the return
 * statement inside the scope-bubble function below.
 *
 * Twitter.Twit is the Twitter user prototype.  new Twitter.Twit(username) or
 * new Twitter.Twit(username, password) to get an object.  See Twitter_Twit().
 *
 * Every method takes a callback function.  The callback is called like (see
 * request()):
 *
 *   aCallback(aTwitterResponse, aDidError);
 *
 * where aTwitterResponse is the JS object returned from Twitter and aDidError
 * is false if the response was a 200 and true otherwise.
 *
 * Usage examples at the very bottom of this file.
 *
 * Drew Willcoxon <adw@mozilla.com>
 */

let Twitter = function ()
{
  // PRIVATE HELPERS //////////////////////////////////////////////////////////

  var Cc = Components.classes;
  var Ci = Components.interfaces;

  if (typeof(JSON) === "undefined")
  {
    var JSON =
    {
      parse: function JSON_parse(aJSON)
      {
        return Cc["@mozilla.org/dom/json;1"].
               createInstance(Ci.nsIJSON).
               decode(aJSON);
      },
      stringify: function JSON_stringify(aObj)
      {
        return Cc["@mozilla.org/dom/json;1"].
               createInstance(Ci.nsIJSON).
               encode(aObj);
      }
    };
  }

  /**
   * Returns a URL param string constructed from given keys and values.
   * aKeyValuePairs may be a regular JS object or a sequence of arguments,
   * and in that case this method should be called like:
   *
   *   encodeParams("key1", "va11", "key2", "val2", ...);
   *
   * @param aKeyValPairs
   *        A regular JS object or sequence of arguments
   */
  function encodeParams(aKeyValPairs)
  {
    let arr = [];
    if (typeof(aKeyValPairs) === "object")
    {
      for (let [key, val] in Iterator(aKeyValPairs))
      {
        if (val !== undefined && val !== null)
          arr.push(key + "=" + encodeURIComponent(val));
      }
    }
    else
    {
      if (arguments.length % 2)
        throw "Odd number of arguments given";

      for (let i = 0; i < arguments.length; i++)
      {
        if (arguments[i] === undefined && arguments[i] === null)
        {
          if (i % 2)
            continue;
          throw "Key at argument " + i + " is undefined or null";
        }

        if (i % 2)
          arr.push(arguments[i - 1] + "=" + encodeURIComponent(arguments[i]));
      }
    }

    return arr.join("&");
  }

  /**
   * XHR helper.
   *
   * @param aOptions
   *        See request()
   */
  function GET(aOptions)
  {
    aOptions.method = "GET";
    request(aOptions);
  }

  /**
   * XHR helper.
   *
   * @param aOptions
   *        See request()
   */
  function POST(aOptions)
  {
    aOptions.method = "POST";
    request(aOptions);
  }

  /**
   * XHR helper.
   *
   * @param aOptions
   *        See code
   */
  function request(aOptions)
  {
    if (aOptions.method !== "GET" && aOptions.method !== "POST")
      throw "Unknown request method '" + aOptions.method + "'";
    if (aOptions.method === "POST" && typeof(aOptions.body) !== "object")
      throw "Non-object body given for POST";

    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
              createInstance(Ci.nsIXMLHttpRequest);
    xhr.open(aOptions.method, aOptions.url, true, aOptions.user, aOptions.pass);
    xhr.onreadystatechange = function ()
    {
      if (xhr.readyState === 4 && aOptions.callback)
        aOptions.callback(JSON.parse(xhr.responseText), xhr.status !== 200);
    };
    if (aOptions.method === "POST")
    {
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send(encodeParams(aOptions.body));
    }
    else
      xhr.send(null);
  }

  /**
   * Returns either "user_id" if aScreenNameOrID is a number or "screen_name"
   * if it's a string.
   *
   * @param aScreenNameOrID
   *        Either a user ID (number) or screen name (string)
   */
  function resolveScreenNameOrID(aScreenNameOrID)
  {
    switch (typeof(aScreenNameOrID))
    {
    case "number":
      return "user_id";
      break;
    case "string":
      return "screen_name";
      break;
    }
    throw "Invalid screen name or ID type " + typeof(aScreenNameOrID);
    return null;
  }

  // TWITTER USER PROTOTYPE: Twitter.Twit /////////////////////////////////////

  //XXXadw Maybe instead of the Twitter.Twit methods delegating to the static
  // methods of Twitter and giving callers the option of using the static
  // methods, we ought to implement them directly in Twitter.Twit and force
  // callers to make new Twitter.Twit objects -- in the spirit of being
  // opinionated and keeping the API uncluttered.

  //XXXadw "getStatus" vs. "status" in method names?

  /**
   * A Twitter user.
   *
   * @param aScreenName
   *        The user's screen name
   * @param aPassword [optional]
   *        If specified, the twit can be used to tweet
   */
  function Twitter_Twit(aScreenName, aPassword)
  {
    this.screenName = aScreenName;
    this.password = aPassword;
  };

  Twitter_Twit.prototype =
  {
    /**
     * Gets the user's friends.
     *
     * @param aPage [optional]
     *        The page of friends to retrieve
     */
    getFriends:
    function Twitter_Twit_proto_getFriends(aPage, aCallback)
    {
      Twitter.getTwitFriends(this.screenName, aPage, aCallback);
    },

    /**
     * Gets the user's info.
     */
    getInfo:
    function Twitter_Twit_proto_getInfo(aCallback)
    {
      Twitter.getTwitInfo(this.screenName, aCallback);
    },

    /**
     * Gets the user's latest status.
     */
    getLatestStatus:
    function Twitter_Twit_proto_getLatestStatus(aCallback)
    {
      Twitter.getTwitLatestStatus(this.screenName, aCallback);
    },

    /**
     * Gets the user's timeline.
     */
    getTimeline:
    function Twitter_Twit_proto_getTimeline(aCallback)
    {
      Twitter.getTwitTimeline(this.screenName, aCallback);
    },

    /**
     * Tweets a tweet.  The tweeting twit must have a password.
     */
    tweet:
    function Twitter_Twit_proto_tweet(aTweet, aInReplyToStatusID, aCallback)
    {
      //XXXadw Actually if this is called from browser chrome, Firefox will put
      // up a prompt asking for user and pass, so maybe we don't want this.
      if (typeof(this.password) !== "string")
        throw "Password required to tweet, yo.";

      const that = this;
      POST({
        url:     "http://twitter.com/statuses/update.json",
        body:
        {
          status:                aTweet,
          in_reply_to_status_id: aInReplyToStatusID
        },
        user:     that.screenName,
        pass:     that.password,
        callback: aCallback
      });
    }
  };

  // TOP-LEVEL OBJECT AND STATIC METHODS: Twitter /////////////////////////////

  return {

    Twit: Twitter_Twit,

    /**
     * Gets the status with the given ID.
     *
     * @param aStatusID
     *        The ID of the status
     */
    getStatus:
    function Twitter_getStatus(aStatusID, aCallback)
    {
      GET({
        url:     "http://twitter.com/statuses/show/" + aStatusID + ".json",
        callback: aCallback
      });
    },

    /**
     * Gets a user's friends.
     *
     * @param aScreenNameOrID
     *        Either a user's screen name (string) or user ID (number)
     * @param aPage [optional]
     *        The page of friends to retrieve
     */
    getTwitFriends:
    function Twitter_getTwitFriends(aScreenNameOrID, aPage, aCallback)
    {
      GET({
        url: "http://twitter.com/statuses/friends.json?" +
                encodeParams(resolveScreenNameOrID(aScreenNameOrID),
                             aScreenNameOrID,
                             "page",
                             aPage),
        callback: aCallback
      });
    },

    /**
     * Gets info about a user.
     *
     * @param aScreenNameOrID
     *        Either a user's screen name (string) or user ID (number)
     */
    getTwitInfo:
    function Twitter_getTwitInfo(aScreenNameOrID, aCallback)
    {
      GET({
        url: "http://twitter.com/users/show.json?" +
                encodeParams(resolveScreenNameOrID(aScreenNameOrID),
                             aScreenNameOrID),
        callback: aCallback
      });
    },

    /**
     * Gets the latest status of a user.
     *
     * @param aScreenNameOrID
     *        Either a user's screen name (string) or user ID (number)
     */
    getTwitLatestStatus:
    function Twitter_getTwitLatestStatus(aScreenNameOrID, aCallback)
    {
      Twitter.getTwitInfo(aScreenNameOrID, function (stat)
      {
        if (aCallback)
          aCallback(stat.status);
      });
    },

    /**
     * Gets a user's timeline.
     *
     * @param aScreenNameOrID
     *        Either a user's screen name (string) or user ID (number)
     */
    getTwitTimeline:
    function Twitter_getTwitTimeline(aScreenNameOrID, aCallback)
    {
      GET({
        url: "http://twitter.com/statuses/user_timeline.json?" +
                encodeParams(resolveScreenNameOrID(aScreenNameOrID),
                             aScreenNameOrID),
        callback: aCallback
      });
    }
  };
}();

/* XPCShell test usage (a.k.a. usage examples!) */
/*
function run_test()
{
  do_test_pending();

//   Twitter.getStatus(1769736664, function (obj, didErr)
//   {
//     if (didErr)
//       dump("ERROR!\n");
//     dump(JSON.stringify(obj) + "\n");
//     do_throw("XXX");
//     do_test_finished();
//   });

//   let twit = new Twitter.Twit("joi");
//   twit.getTimeline(function (obj, didErr)
//   {
//     if (didErr)
//       dump("ERROR!\n");
//     dump(JSON.stringify(obj) + "\n");
//     do_throw("XXX");
//     do_test_finished();
//   });

//   let twit = new Twitter.Twit("joi");
//   twit.getInfo(function (obj, didErr)
//   {
//     if (didErr)
//       dump("ERROR!\n");
//     dump(JSON.stringify(obj) + "\n");
//     do_throw("XXX");
//     do_test_finished();
//   });

//   let twit = new Twitter.Twit("joi");
//   twit.getLatestStatus(function (obj, didErr)
//   {
//     if (didErr)
//       dump("ERROR!\n");
//     dump(JSON.stringify(obj) + "\n");
//     do_throw("XXX");
//     do_test_finished();
//   });

//   let twit = new Twitter.Twit("username", "password");
//   twit.tweet("Oh, what a big man you are.  Let me buy you a pack of gum, " +
//              "show you how to chew it.",
//              null, function (obj, didErr)
//   {
//     if (didErr)
//       dump("ERROR!\n");
//     dump(JSON.stringify(obj) + "\n");
//     do_throw("XXX");
//     do_test_finished();
//   });

  let twit = new Twitter.Twit("joi");
  twit.getFriends(null, function (obj, didErr)
  {
    if (didErr)
      dump("ERROR!\n");
    dump(JSON.stringify(obj) + "\n");
    do_throw("XXX");
    do_test_finished();
  });
}
*/

