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

function HtmlTestResponder(outputElement)
{
    this._output = outputElement;
}

HtmlTestResponder.prototype = {
    onStartTest : function(test)
    {
    },

    onException : function(test, e)
    {
        var html = ("<p class=\"error\">Error in test " +
                    test.name + ": " + e.message);
        if (e.fileName)
            html += (" (in " + e.fileName +
                     ", line " + e.lineNumber + ")");
        html += "</p>";
        this._output.innerHTML += html;
    },

    onFinished : function(successes, failures)
    {
        var total = successes + failures;

        var html = ("<p>" + successes + " out of " +
                    total + " tests successful (" + failures +
                    " failed).</p>");

        this._output.innerHTML += html;
    }
};

function TestSuite(responder, parent)
{
    this._responder = responder;
    this._parent = parent;
}

TestSuite.prototype = {
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
        var successes = 0;
        var failures = 0;

        var tests = this.getTests(this._parent);

        for each (test in tests)
        {
            try {
                this._responder.onStartTest(test);
                test.run();
                successes += 1;
            } catch (e) {
                this._responder.onException(test, e);
                failures += 1;
            }
        }
        this._responder.onFinished(successes, failures);
    }
};
