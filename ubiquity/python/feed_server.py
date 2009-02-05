import sys
import asyncore
import traceback
import Queue

import jsbridge
import jsbridge.events
import jsbridge.network

ENDPOINT_URI = 'resource://ubiquity/modules/python_feed_endpoint.js'

finished = False
queue = Queue.Queue()
feeds = {}

class UbiquityFeed(object):
    def __init__(self, namespace, api):
        self.namespace = namespace
        self.api = api

        name_prefix = 'cmd_'
        names = [name for name in namespace
                 if (name.startswith(name_prefix) and
                     callable(namespace[name]))]

        for name in names:
            cmd = namespace[name]
            readable_name = name[len(name_prefix):].replace('_', '-')
            api.defineVerb({'name': readable_name,
                            'id': name,
                            'preview': cmd.preview})

    def execute_verb(self, verb_id):
        cmd = self.namespace[verb_id]
        cmd(self.api)

def get_endpoint():
    return jsbridge.JSObject(
        jsbridge.network.bridge,
        "Components.utils.import('%s')" % ENDPOINT_URI
        ).Endpoint

def handle_event(event_name, obj):
    try:
        global finished
        if event_name == 'ubiquity-python:refresh-feed':
            endpoint = get_endpoint()
            api = endpoint.getApi(obj['feed'])
            code = compile(obj['code'], obj['srcUri'], 'exec')
            globs = {}
            exec code in globs
            feeds[obj['feed']] = UbiquityFeed(globs, api)
        elif event_name == 'ubiquity-python:execute-verb':
            feeds[obj['feed']].execute_verb(obj['id'])
        elif event_name == 'ubiquity-python:shutdown':
            finished = True
        print "python feed server event: %s  obj: %s" % (event_name, obj)
    except:
        tb = traceback.format_exc()
        print tb
        try:
            endpoint = get_endpoint()
            api = endpoint.getApi(obj['feed'])
            api.reportError(tb)
        except:
            pass

def on_event(event_name, obj):
    queue.put((event_name, obj))

if __name__ == '__main__':
    port = int(sys.argv[1])
    settings = jsbridge.get_settings()
    settings['JSBRIDGE_REPL_HOST'] = 'localhost:%d' % port
    jsbridge.start(settings)
    jsbridge.network.events.add_global_listener(on_event)
    endpoint = get_endpoint()
    endpoint.registerServer()
    print "Python feed server running, attached to jsbridge server on "
    print "port %d." % port
    while not finished:
        event_name, obj = queue.get()
        handle_event(event_name, obj)
