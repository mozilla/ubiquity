import os
import sys

import simplejson
import jsbridge

jsbridge_dir = jsbridge.__path__[0]
ext_dir = os.path.join(jsbridge_dir, 'extension', 'resource')

json = simplejson.dumps({'jsbridge_resource_dir': ext_dir})
open(sys.argv[1], 'w').write(json)
print "configuration written to %s." % sys.argv[1]
