import os
import sys
import xml.dom.minidom
import subprocess
import shutil
import zipfile
import shutil
import distutils.dir_util
from ConfigParser import ConfigParser

# Path to the root of the extension, relative to where this script is
# located.
EXT_SUBDIR = "ubiquity"

# Full path to xpcshell; if it's not an absolute path, it's assumed
# to be on the user's PATH.
g_xpcshell_path = "xpcshell"

g_mydir = os.path.abspath(os.path.split(__import__("__main__").__file__)[0])

def clear_dir(dirname):
    if os.path.exists(dirname) and os.path.isdir(dirname):
        shutil.rmtree(dirname)

def find_profile_dir(name):
    """
    Given the name of a Firefox profile, attempts to find the absolute
    path to its directory.  If it can't be found, None is returned.
    """

    base_path = None
    if sys.platform == "darwin":
        base_path = os.path.expanduser(
            "~/Library/Application Support/Firefox/"
            )
    elif sys.platform.startswith("win"):
        # TODO: This only works on 2000/XP/Vista, not 98/Me.
        appdata = os.environ["APPDATA"]
        base_path = os.path.join(appdata, "Mozilla\\Firefox")
    elif sys.platform == "cygwin":
        appdata = os.environ["APPDATA"]
        base_path = os.path.join(appdata, "Mozilla\\Firefox")
    else:
        base_path = os.path.expanduser("~/.mozilla/firefox/")
    inifile = os.path.join(base_path, "profiles.ini")
    config = ConfigParser()
    config.read(inifile)
    profiles = [section for section in config.sections()
                if section.startswith("Profile")]
    for profile in profiles:
        if config.get(profile, "Name") == name:
            # TODO: Look at IsRelative?
            path = config.get(profile, "Path")
            if not os.path.isabs(path):
                path = os.path.join(base_path, path)
            print "Found profile '%s' at %s." % (name, path)
            return path
    print "Couldn't find a profile called '%s'." % name
    return None

def get_install_rdf_dom(path_to_extension_root):
    rdf_path = os.path.join(path_to_extension_root, "install.rdf")
    rdf = xml.dom.minidom.parse(rdf_path)
    return rdf

def get_install_rdf_property(path_to_extension_root, property):
    rdf = get_install_rdf_dom(path_to_extension_root)
    element = rdf.documentElement.getElementsByTagName(property)[0]
    return element.firstChild.nodeValue

def run_program(args, **kwargs):
    retval = subprocess.call(args, **kwargs)
    if retval:
        print "Process failed with exit code %d." % retval
        sys.exit(retval)

def run_python_script(args):
    run_program([sys.executable] + args)

def get_xpcom_info():
    cmdline = [
        os.path.join(os.path.dirname(g_xpcshell_path),
	             "run-mozilla.sh"),
        g_xpcshell_path,
        os.path.join(g_mydir, "get_xpcom_info.js")
        ]
    if not os.path.exists(cmdline[0]):
        cmdline = cmdline[1:]
    popen = subprocess.Popen(
        cmdline,
        stdout = subprocess.PIPE
        )
    retval = popen.wait()
    assert retval == 0
    os_target, xpcomabi = popen.stdout.read().splitlines()
    comsd = os.path.join(os.path.dirname(g_xpcshell_path),
                         "components")
    return dict(comsd = comsd,
                os_target = os_target,
                xpcomabi = xpcomabi)

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print "usage: %s <command>" % sys.argv[0]
        print
        print "'command' can be one of the following:"
        print
        print "    unittest - run unit tests"
        print "    test - run system and unit tests"
        print "    install - install to the given profile"
        print "    uninstall - uninstall from the given profile"
        print "    build-xpi - build an xpi of the addon"
        print "    build-components - build C++ XPCOM components"
        print
        sys.exit(1)

    if os.environ.get("OBJDIR"):
        g_xpcshell_path = os.path.join(os.environ["OBJDIR"],
                                       "dist", "bin", g_xpcshell_path)

    path_to_extension_root = os.path.join(g_mydir, EXT_SUBDIR)

    cmd = args[0]

    if cmd == "test":
        this_script = sys.argv[0]
        this_dir = os.path.dirname(this_script)
        print "Running unit tests."
        run_python_script([this_script, "unittest"])
        print "Running system tests."
        run_python_script([os.path.join(this_dir, "systemtests.py")])
        print "All tests successful."
    elif cmd == "unittest":
        #if subprocess.call(["which", g_xpcshell_path],
        #                   stdout=subprocess.PIPE) != 0:
        #    print "You must have xpcshell on your PATH to run tests."
        #    sys.exit(1)

        xpcshell_args = [
            g_xpcshell_path,
            "-v", "180",     # Use Javascript 1.8
            "-w",            # Enable warnings
            "-s",            # Enable strict mode
            os.path.join(g_mydir, "xpcshell_tests.js"),
            path_to_extension_root
            ]

        retval = subprocess.call(xpcshell_args)
        sys.exit(retval)
    elif cmd in ["install", "uninstall"]:
        if len(args) != 2:
            print "Attempting to find location of default profile..."

            profile_dir = find_profile_dir("default")
        else:
            profile_dir = args[1]
            if not os.path.exists(profile_dir):
                print "Attempting to find a profile with the name '%s'." % (
                    profile_dir
                    )
                profile_dir = find_profile_dir(profile_dir)

        if not (profile_dir and os.path.exists(profile_dir) and
                os.path.isdir(profile_dir)):
            print "Can't resolve profile directory; aborting."
            sys.exit(1)

        extension_id = get_install_rdf_property(path_to_extension_root,
                                                "em:id")

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
            if os.path.isdir(extension_file):
                shutil.rmtree(extension_file)
            else:
                os.remove(extension_file)
        if cmd == "install":
            #if cygwin, change the path to windows format so firefox can understand it
            if sys.platform == "cygwin":
                file = 'cygpath.exe -w ' + path_to_extension_root
                path_to_extension_root = "".join(os.popen(file).readlines()).replace("\n", " ").rstrip()

            extdir = os.path.dirname(extension_file)
            if not os.path.exists(extdir):
                distutils.dir_util.mkpath(extdir)
            fileobj = open(extension_file, "w")
            fileobj.write(path_to_extension_root)
            fileobj.close()
            print "Extension '%s' installed." % extension_id
        else:
            print "Extension '%s' uninstalled." % extension_id
    elif cmd == "build-xpi":
        version = get_install_rdf_property(path_to_extension_root,
                                           "em:version")
        extname = get_install_rdf_property(path_to_extension_root,
                                           "em:name").lower()
        zfname = "%s-%s.xpi" % (extname, version)
        zf = zipfile.ZipFile(zfname,
                             "w",
                             zipfile.ZIP_DEFLATED)
        for dirpath, dirnames, filenames in os.walk(path_to_extension_root):
            for filename in filenames:
                abspath = os.path.join(dirpath, filename)
                arcpath = abspath[len(path_to_extension_root)+1:]
                zf.write(abspath, arcpath)
        print "Created %s." % zfname
    elif cmd == "build-components":
        if "TOPSRCDIR" not in os.environ:
            print ("Please set the TOPSRCDIR environment variable "
                   "to the root of your mozilla-central checkout. "
                   "If you're on Windows, this should be a standard "
                   "Windows-style path, NOT a unix-style path.")
            sys.exit(1)
        if "OBJDIR" not in os.environ:
            print ("Please set the OBJDIR envirionment variable "
                   "to the root of your objdir. "
                   "If you're on Windows, this should be a standard "
                   "Windows-style path, NOT a unix-style path.")
            sys.exit(1)
        xpcominfo = get_xpcom_info()
        topsrcdir = os.environ["TOPSRCDIR"]
        objdir = os.environ["OBJDIR"]
        comp_src_dir = os.path.join(g_mydir, "components")
        rel_dest_dir = os.path.join("browser", "components", "ubiquity")
        comp_dest_dir = os.path.join(topsrcdir, rel_dest_dir)
        comp_xpi_dir = os.path.join(objdir, "dist", "xpi-stage",
                                    "ubiquity", "components")
        comp_plat_dir = os.path.join(
            g_mydir, "ubiquity", "platform",
            "%(os_target)s_%(xpcomabi)s" % xpcominfo,
            "components",
            )

        clear_dir(comp_dest_dir)
        clear_dir(comp_xpi_dir)
        clear_dir(comp_plat_dir)

        shutil.copytree(comp_src_dir, comp_dest_dir)

        # Ensure that these paths are unix-like on Windows.
	sh_pwd = subprocess.Popen(["sh", "-c", "pwd"],
                                  cwd=topsrcdir,
                                  stdout=subprocess.PIPE)
        sh_pwd.wait()
        unix_topsrcdir = sh_pwd.stdout.read().strip()
        unix_rel_dest_dir = rel_dest_dir.replace("\\", "/")

        # We're specifying 'perl' here because we have to for this
        # to work on Windows.
        run_program(["perl",
                     os.path.join(topsrcdir, "build", "autoconf",
                                  "make-makefile"),
                     "-t", unix_topsrcdir,
                     unix_rel_dest_dir],
                    cwd=objdir)
        run_program(["make"],
                    cwd=os.path.join(objdir, rel_dest_dir))

        shutil.copytree(comp_xpi_dir, comp_plat_dir)
        for filename in os.listdir(comp_xpi_dir):
            shutil.copy(os.path.join(comp_xpi_dir, filename),
                        xpcominfo["comsd"])

        for filename in ["compreg.dat", "xpti.dat"]:
            fullpath = os.path.join(xpcominfo["comsd"], filename)
            if os.path.exists(fullpath):
                os.unlink(fullpath)
    else:
        print "Unknown command '%s'" % cmd
        sys.exit(1)
