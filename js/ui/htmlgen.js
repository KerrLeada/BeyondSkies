var ui = ui || {};

// Helps with the construction of html elements
ui.html = (function() {
    var ns = {};
    function htmlElem(elem, clazz) {
        var e = $(elem);
        if (clazz && clazz !== '') {
            if (clazz instanceof Array) {
                clazz.forEach(function(cls) {
                    e.addClass(cls);
                });
            }
            else {
                e.addClass(clazz);
            }
        }
        return e;
    }
    ns.htmlElem = htmlElem;

    // Creates a table
    ns.table = function(clazz) {
        return htmlElem('<table>', clazz);
    };
    
    // Creates a tr
    ns.tr = function(clazz) {
        return htmlElem('<tr>', clazz);
    };
    
    // Creates a td
    ns.td = function(clazz) {
        return htmlElem('<td>', clazz);
    };
    
    // Creates an img
    ns.img = function(clazz) {
        return htmlElem('<img>', clazz);
    };
    
    // Creates a div
    ns.div = function(clazz) {
        return htmlElem('<div>', clazz);
    };

    ns.span = function(clazz) {
        return htmlElem('<span>', clazz);
    };
    
    // Creates a paragraph
    ns.p = function(clazz) {
        return htmlElem('<p>', clazz);
    };
    
    // Creates a button
    ns.button = function(clazz) {
        return htmlElem('<button>', clazz);
    };

    // Creates an input element, defaulting to a text field
    ns.input = function(what, clazz) {
        what = what || 'text';
        return htmlElem('<input>').attr('type', what);
    };

    // Creates a select element with the given options
    ns.select = function(options, clazz) {
        var e = htmlElem('<select>', clazz);
        if (options) {
            options.forEach(function(op) {
                e.append(op);
            });
        }
        return e;
    };

    // Creates an option with the given text
    ns.option = function(text, clazz) {
        return htmlElem('<option>', clazz).html(text);
    };

    return ns;
}());
