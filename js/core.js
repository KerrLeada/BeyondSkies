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
        for (var pt in obj) {
            if (obj.hasOwnProperty(pt)) {
                result[pt] = obj[pt];
            }
        }
        return result;
    };

    // Creates a new constructor with the given prototype
    ns.newCtor = function(proto, init) {
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

    // Returns a function that calls "f" with "me" as this.
    // Any arguments are passed along to "f".
    ns.bind = function(me, f) {
        return function() {
            return f.apply(me, Array.prototype.slice.call(arguments));
        };
    };

    ns.lseek = function(arr, pred) {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (pred(arr[i])) {
                return arr[i];
            }
        }
        return undefined;
    };
    
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
        return this._elems[key] !== undefined;
    };
    
    // Checks if there exists an element that passes the given predicate
    MyHashtable.prototype.exists = function(pred) {
        return this.find(pred) !== undefined;
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
    // element was found 'undefined' is returned.
    MyHashtable.prototype.find = function(pred) {
        var elems = this._elems;
        for (var k in elems) {
            if (elems.hasOwnProperty(k) && pred(elems[k], k)) {
                return elems[k];
            }
        }
        return undefined;
    };
    
    // Attempts to find an element that matches the given predicate, or
    // return the given default value.
    MyHashtable.prototype.tryFind = function(defaultResult, pred) {
        var result = this.find(pred);
        return result !== undefined ? result : defaultResult;
    };
    
    // Searches through all the hashtable elements for the best match for
    // the comparator comp and returns it, or undefined if there was no
    // elements in the hashtable
    MyHashtable.prototype.findBest = function(comp) {
        var elems = this._elems;
        var chosen = undefined;
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
        var results = [];
        this.forEach(function(value, key) {
            results.push(f(value, key));
        });
        return results;
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
    
    // Adds or sets a new value with the given key
    MyHashtable.prototype.set = function(key, value) {
        if (!this._elems[key]) {
            this.size += 1;
        }
        this._elems[key] = value;
    };
    
    // Gets the value with the given key
    MyHashtable.prototype.get = function(key) {
        return this._elems[key];
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
