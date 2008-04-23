function AssertionError(message)
{
    this.message = message;
}

function TestCase(func)
{
    this.name = func.name;
    this.__func = func;
}

TestCase.prototype = {
    run : function()
    {
        this.__func();
    },

    assertIsDefined : function(condition, msg)
    {
        if (condition == undefined)
            throw new AssertionError(msg);
    },

    assert : function(condition, msg)
    {
        if (!condition)
            throw new AssertionError(msg);
    }
};

var TestSuite = {
    getTests : function(parent)
    {
        var tests = [];

        for (prop in parent)
            if (prop.indexOf("test") == 0)
                tests.push(new TestCase(parent[prop]));

        return tests;
    },

    start : function()
    {
        var output = window.document.getElementById( "test-output" );

        var successes = 0;
        var failures = 0;

        var tests = this.getTests(window);

        for each (test in tests)
        {
            try {
                dump("Running test: "+test.name+"\n");
                test.run();
                successes += 1;
            } catch (e) {
                var html = ("<p class=\"error\">Error in test " +
                            test.name + ": " + e.message);
                if (e.fileName)
                    html += (" (in " + e.fileName +
                             ", line " + e.lineNumber + ")");
                html += "</p>";
                output.innerHTML += html;
                failures += 1;
            }
        }
        var total = successes + failures;

        output.innerHTML += ("<p>" + successes + " out of " +
                             total + " tests successful (" + failures +
                             " failed).</p>");
    }
};
