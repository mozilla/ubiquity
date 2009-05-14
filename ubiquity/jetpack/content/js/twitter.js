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

var Twitter = function ()
{
  // PRIVATE HELPERS //////////////////////////////////////////////////////////

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

  function doAjax(options) {
    var callback = options.callback;
    var jQueryOptions = {};
    for (name in options)
      if (name != "callback")
        jQueryOptions[name] = options[name];

    jQueryOptions.dataType = "json";
    jQueryOptions.success = function(data) { callback(data, false); };
    jQueryOptions.error = function() { callback(null, true); };

    jQuery.ajax(jQueryOptions);
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
      var data = {status: aTweet};

      if (aInReplyToStatusID)
        data.in_reply_to_status_id = aInReplyToStatusID;

      //XXXadw Actually if this is called from browser chrome, Firefox will put
      // up a prompt asking for user and pass, so maybe we don't want this.
      if (typeof(this.password) !== "string")
        throw "Password required to tweet, yo.";

      const that = this;
      doAjax(
        {type: "POST",
         url: "http://twitter.com/statuses/update.json",
         data: data,
         username: that.screenName,
         password: that.password,
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
      doAjax({url: "http://twitter.com/statuses/show/" + aStatusID + ".json",
              callback: aCallback});
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
      var data = {};
      data[resolveScreenNameOrID(aScreenNameOrID)] = aScreenNameOrID;
      data.page = aPage;

      doAjax({url: "http://twitter.com/statuses/friends.json",
              data: data,
              callback: aCallback});
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
      var data = {};
      data[resolveScreenNameOrID(aScreenNameOrID)] = aScreenNameOrID;

      doAjax(
        {url: "http://twitter.com/users/show.json",
         data: data,
         callback: aCallback});
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
      var data = {};
      data[resolveScreenNameOrID(aScreenNameOrID)] = aScreenNameOrID;

      doAjax({url: "http://twitter.com/statuses/user_timeline.json",
              data: data,
              callback: aCallback});
    }
  };
}();
