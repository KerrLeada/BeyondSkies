// Contains useful functions intended for reuse
var core = (function() {
    var ns = {};

    // Pythagoras theorem
    ns.pythagoras = function(x, y) {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    };
    
    // Lists the properties of the given object (does not check the prototype)
    ns.listOwn = function(obj) {
        var result = [];
        for (var pt in obj) {
            if (obj.hasOwnProperty(pt)) {
                result.push(obj[pt]);
            }
        }
        return result;
    };
    
    // Performs a simple and shallow copy of an object without copying anything from the prototype
    ns.copy = function(obj) {
        var result = {};
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                result[prop] = obj[prop];
            }
        }
        return result;
    };

    // Creates a new constructor with the given prototype
    var newCtor = function(proto, init) {
        var ctor = function() {
            init.apply(this, arguments);
        };
        ctor.prototype = Object.create(proto.prototype);
        if (!ctor.prototype._super) {
            ctor.prototype._super = function() {
                proto.apply(this, Array.prototype.slice.call(arguments, 1));
            };
        }
        return ctor;
    };
    ns.newCtor = newCtor;

    // Returns a function that calls "f" with "me" as this.
    // Any arguments are passed along to "f".
    var bind = function(me, f) {
        return function() {
            return f.apply(me, Array.prototype.slice.call(arguments));
        };
    };
    ns.bind = bind;

    // Creates a getter function for the given hashtable
    // A getter will return either a list of the content of the hashtable,
    // or if a key is provided, the value stored with that key.
    // A KeyNotFoundError is thrown on an invalid key.
    ns.getter = function(src) {
        return bind(src, function(key) {
            if (key) {
                return src.get(key);
            }
            return src.values();
        });
    };
    
    // Creates a getter function for an array
    ns.arrGetter = function(src) {
        return function(modId) {
            if (modId) {
                return src[modId];
            }
            return src.slice();
        };
    };

    // Makes sure obj isnt a falsy-value, and throws an exception with the given error message if it is
    ns.guard = function(obj, errMsg) {
        if (!obj) {
            throw new TypeError(errMsg);
        }
    };

    // Makes sure something is not undefined
    function defined(val, errMsg) {
        if (val === undefined) {
            throw new TypeError(errMsg);
        }
    }

    // Makes sure something is a function
    function validateFunction(f) {
        if (! (f instanceof Function)) {
            throw new TypeError('Expecting function');
        }
    }

    // Makes sure a key isnt undefined
    function validateKey(key) {
        defined(key, 'Key cannot be undefined');
    }

    // Makes sure the key and value are not undefined
    function validateKeyValue(key, value) {
        validateKey(key);
        defined(value, 'Value cannot be undefined');
    }
    
    // Used to init an error
    function errorInit(msg) {
        this._super(msg);
    }

    // Error for when a key was not found
    var KeyNotFoundError = newCtor(Error, errorInit);
    ns.KeyNotFoundError = KeyNotFoundError;

    // Error for when a key was already taken, and a value therefor could not be added
    var KeyTakenError = newCtor(Error, errorInit);
    ns.KeyTakenError = KeyTakenError;

    // Error for when a predicate function failed to find a match in a hashtable
    var NoMatchError = newCtor(Error, function(matcher) {
        this._super('No match');
        this.matcher = matcher;
    });
    ns.NoMatchError = NoMatchError;
    
    // A simple hashtable
    var MyHashtable = function(other) {
        var me = this;
        this._elems = {};
        this.size = 0;
        
        // If there was a provided hashtable, add its contents
        if (other) {
            other.forEach(function(value, key) {
                me.set(key, value);
            });
        }
    };
    
    // Checks if the hashtable is empty or not
    MyHashtable.prototype.isEmpty = function() {
        return this.size === 0;
    };
    
    // Checks if the given key exist within the hashtable
    MyHashtable.prototype.has = function(key) {
        validateKey(key);
        return this._elems[key] !== undefined;
    };
    
    // Checks if there exists an element that passes the given predicate
    MyHashtable.prototype.exists = function(pred) {
        return this.tryFind(pred, undefined) !== undefined;
    };
    
    // Used to move loop through the hashtable
    MyHashtable.prototype.forEach = function(f) {
        var elems = this._elems;
        for (var key in elems) {
            if (elems.hasOwnProperty(key)) {
                f(elems[key], key);
            }
        }
    };
    
    // Searches the hashtable for an element that matches the given
    // predicate and returns it if it was found. If no matching
    // element was found a NoMatchError is thrown.
    MyHashtable.prototype.find = function(pred) {
        var result = this.tryFind(pred, undefined);
        if (result === undefined) {
            throw new NoMatchError(pred);
        }
        return result;
    };
    
    // Attempts to find an element that matches the given predicate, or
    // return the given default value. If no default value is given, undefined
    // is returned.
    MyHashtable.prototype.tryFind = function(pred, defaultResult) {
        validateFunction(pred);
        var elems = this._elems;
        for (var k in elems) {
            if (elems.hasOwnProperty(k) && pred(elems[k], k)) {
                return elems[k];
            }
        }
        return defaultResult;
    };

    // Searches through all the hashtable elements for the best match for
    // the comparator comp and returns it, or throws an NoMatchError if
    // nothing was found.
    MyHashtable.prototype.findBest = function(comp) {
        var result = this.tryFindBest(comp, undefined);
        if (result === undefined) {
            throw new NoMatchError(comp);
        }
        return result;
    };
    
    // Searches through all the hashtable elements for the best match for
    // the comparator comp and returns it, or the defaultResult if there was no
    // elements in the hashtable or no elements that was a better match then the
    // default result.
    MyHashtable.prototype.tryFindBest = function(comp, defaultResult) {
        validateFunction(comp);
        var elems = this._elems;
        var chosen = defaultResult;
        for (var k in elems) {
            if (elems.hasOwnProperty(k)) {
                if (chosen === undefined || comp(chosen, elems[k])) {
                    chosen = elems[k];
                }
            }
        }
        return chosen;
    };

    // Applies the given function to each element in the hashtable, returning
    // an array of the results
    MyHashtable.prototype.map = function(f) {
        validateFunction(f);
        var results = [];
        this.forEach(function(value, key) {
            results.push(f(value, key));
        });
        return results;
    };

    // Returns an array of the elements that was accepted by the given predicate
    MyHashtable.prototype.filter = function(pred) {
        validateFunction(pred);
        var result = [];
        this.forEach(function(value, key) {
            if (pred(value, key)) {
                results.push(value);
            }
        });
        return result;
    };
    
    // Returns the values
    MyHashtable.prototype.values = function() {
        var results = new Array();
        this.forEach(function(value) {
            results.push(value);
        });
        return results;
    };
    
    // Returns the keys
    MyHashtable.prototype.keys = function() {
        var results = new Array();
        this.forEach(function(_, key) {
            results.push(key);
        });
        return results;
    };
    
    // Removes the given key
    MyHashtable.prototype.remove = function(key) {
        validateKey(key);
        if (this._elems.hasOwnProperty(key)) {
            delete this._elems[key];
            this.size -= 1;
        }
    };
    
    // Removes the given keys
    MyHashtable.prototype.removeAll = function(keys) {
        for (var i = 0; i < keys.length; ++i) {
            this.remove(keys[i]);
        }
    };

    // Adds a new value with the given key
    // Throws an exception if there already was an entry with the given key
    MyHashtable.prototype.add = function(key, value) {
        validateKeyValue(key, value);
        if (this._elems[key]) {
            throw new KeyTakenError(key);
        }
        this.size += 1;
        this._elems[key] = value;
    };
    
    // Adds or sets a new value with the given key
    MyHashtable.prototype.set = function(key, value) {
        validateKeyValue(key, value);
        if (!this._elems[key]) {
            this.size += 1;
        }
        this._elems[key] = value;
    };
    
    // Gets the value with the given key
    MyHashtable.prototype.get = function(key) {
        validateKey(key);
        var result = this._elems[key];
        if (!result) {
            throw new KeyNotFoundError(key);
        }
        return result;
    };

    // Gets the value of the given key, or the provided default argument
    // If no default argument is given, undefined is returned
    MyHashtable.prototype.tryGet = function(key, defaultResult) {
        validateKey(key);
        return this._elems[key] || defaultResult;
    };
    
    // Clears the hashtable of all content
    MyHashtable.prototype.clear = function() {
        this.removeAll(this.keys());
        this.size = 0;
    };
    
    // Add the hashtable to the namespace
    ns.Hashtable = MyHashtable;

    // Returns the "namespace"
    return ns;
}());
