import sys

def cmd_sample_python_command(ubiquity):
    ubiquity.displayMessage(
        'yo, I am a sample python command running under Python %s.' %
        sys.version
        )

cmd_sample_python_command.preview = 'a sample python command!'
