import os
import sys
import subprocess

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print "usage: %s <command>" % sys.argv[0]
        print
        print "'command' can be one of the following:"
        print
        print "    test - run unit tests"
        print "    install - install to the given profile dir"
        print "    uninstall - uninstall from the given profile dir"
        print
        sys.exit(1)

    main = __import__("__main__")
    mydir = os.path.abspath(os.path.split(main.__file__)[0])

    path_to_extension_root = os.path.join(mydir, "ubiquity")

    cmd = args[0]
    
    if cmd == "test":
        if subprocess.call(["which", "xpcshell"],
                           stdout=subprocess.PIPE) != 0:
            print "You must have xpcshell on your PATH to run tests."
            sys.exit(1)

        xpcshell_args = [
            "xpcshell",
            "-v", "180",     # Use Javascript 1.8
            "-w",            # Enable warnings
            "-s",            # Enable strict mode
            os.path.join(mydir, "xpcshell_tests.js"),
            path_to_extension_root
            ]

        retval = subprocess.call(xpcshell_args)
        sys.exit(retval)
    elif cmd in ["install", "uninstall"]:
        if len(args) != 2:
            print "Path to profile directory not supplied."
            sys.exit(1)
        profile_dir = args[1]
        # TODO: Get this out of the install.rdf to preserve DRY.
        extension_id = "ubiquity@labs.mozilla.com"
        extension_file = os.path.join(profile_dir,
                                      "extensions",
                                      extension_id)
        files_to_remove = ["compreg.dat",
                           "xpti.dat"]
        for filename in files_to_remove:
            abspath = os.path.join(profile_dir, filename)
            if os.path.exists(abspath):
                os.remove(abspath)
        if os.path.exists(extension_file):
            os.remove(extension_file)
        if cmd == "install":
            fileobj = open(extension_file, "w")
            fileobj.write(path_to_extension_root)
            fileobj.close()
            print "Extension installed."
        else:
            print "Extension uninstalled."
    else:
        print "Unknown command '%s'" % cmd
        sys.exit(1)
