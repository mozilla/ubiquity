// == Core Developer Commands ==
//
// This is the command feed for core developer commands.

// === {{{markupTickets()}}} ===
//
// This function finds any text in the given JQuery query that looks like
// a Trac ticket and hyperlinks the text to the ticket.
function markupTickets(query) {
  var html = query.html();
  var regexp = /#([0-9]+)/g;
  var template = ('<a href="https://ubiquity.mozilla.com/' +
                  'trac/ticket/$1">#$1</a>');
  query.html(html.replace(regexp, template));
}

// === {{{addMoreLinks()}}} ===
//
// Adds a row labeled "more" to the changeset detail page, with links
// to additional information contained in the revision, such as
// the built-in documentation.
function addMoreLinks(rev, doc) {
  var newRow = jQuery('<tr><th class="files">more</th></tr>', doc);
  newRow.append('<td class="files">' +
                '<a href="/hg/ubiquity-firefox/raw-file/' + rev +
                '/ubiquity/index.html">documentation</a></td>');
  jQuery("#changesetEntry", doc).append(newRow);
}

// === {{{pageLoad_developerCommands()}}} ===
//
// This function is a page-load function that applies transformations
// to certain developer-related web pages to provide added functionality.
function pageLoad_developerCommands(doc) {
  if ((doc.location.protocol == "http:" ||
       doc.location.protocol == "https:") &&
      doc.location.host == 'ubiquity.mozilla.com') {
    var regexp = /\/hg\/ubiquity-firefox\/rev\/([0-9a-f]+)/;
    var match = doc.location.pathname.match(regexp);
    if (match) {
      var rev = match[1];
      markupTickets(jQuery(".description", doc));
      addMoreLinks(rev, doc);
    }
  }
}
