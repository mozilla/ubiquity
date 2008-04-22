const Ci = Components.interfaces;
const Cc = Components.classes;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

/* nsIAutoCompleteSearch implementation
 *
 * Any XUL textbox element that wants to use this search should set
 * its 'type' attribute to 'autocomplete' and its 'autocompletesearch'
 * attribute to 'commands'. For more information, see:
 *
 * http://developer.mozilla.org/en/docs/XUL:textbox_(Firefox_autocomplete)
 * */

function CommandsAutoCompleter()
{
}

CommandsAutoCompleter.prototype = {
    classDescription : "CommandsAutoCompleter",
    classID : Components.ID("de8db85f-c1de-4d87-94ba-7844890f91fe"),
    contractID : "@mozilla.org/autocomplete/search;1?name=commands",
    QueryInterface : XPCOMUtils.generateQI([Ci.nsIAutoCompleteSearch]),

    startSearch : function(searchString, searchParam, previousResult,
                           listener)
    {
        var result = new CommandsAutoCompleteResult(searchString);
        dump("returning "+result+"\n");
        listener.onSearchResult(this, result);
    },

    stopSearch : function()
    {
    }
};

/* nsIAutoCompleteResult implementation */

function CommandsAutoCompleteResult(searchString)
{
    this._searchString = searchString;
}

CommandsAutoCompleteResult.prototype = {
    RESULT_IGNORED : 1,
    RESULT_FAILURE : 2,
    RESULT_NOMATCH : 3,
    RESULT_SUCCESS : 4,
    RESULT_NOMATCH_ONGOING : 5,
    RESULT_SUCCESS_ONGOING : 6,

    get searchString()
    {
        return this._searchString;
    },

    get defaultIndex()
    {
        dump("defaultIndex\n");
        return 0;
    },

    get errorDescription()
    {
        dump("errorDescription\n");
        return null;
    },

    get matchCount()
    {
        dump("matchCount\n");
        return 1;
    },

    get searchResult()
    {
        dump("searchResult\n");
        return this.RESULT_SUCCESS;
    },

    getCommentAt : function(index)
    {
        dump("getCommentAt " + index + "\n");
        return "o yea";
    },

    getImageAt : function(index)
    {
        dump("getImageAt " + index + "\n");
        return "blah";
    },

    getStyleAt : function(index)
    {
        dump("getStyleAt " + index + "\n");
        return "";
    },

    getValueAt : function(index)
    {
        dump("getValueAt " + index + "\n");
        return "hai2u";
    },

    removeValueAt : function(rowIndex, removeFromDb)
    {
        dump("removeValueAt " + rowIndex + "\n");
    },

    QueryInterface : XPCOMUtils.generateQI([Ci.nsIAutoCompleteResult])
};

function NSGetModule(compMgr, fileSpec) {
    return XPCOMUtils.generateModule([CommandsAutoCompleter]);
}
