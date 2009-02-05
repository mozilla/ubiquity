import sys

ubiquity.defineVerb({'name': 'sample-python-command',
                     'id': '1',
                     'preview': 'a sample python command.'})

def execute_verb(verb_id):
    ubiquity.displayMessage(
        'hi, I am a sample python command running under Python %s.' %
        sys.version
        )
