import virtualenv

filename = 'jsbridge_virtualenv_extra_code.py'
output_filename = '../ubiquity/python/bootstrap.py'
output = virtualenv.create_bootstrap_script(open(filename, 'r').read())
print "Writing %s" % output_filename
open(output_filename, 'w').write(output)
