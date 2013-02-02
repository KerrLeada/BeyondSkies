// Contains useful functions intended for reuse
var core = new function() {
    // Creates a new array by applying function fn to all elements of xs 
    this.map = function(xs, fn) {
        var result = [];
        for (var i = 0; i < xs.length; ++i) {
            result.push(fn(xs[i]));
        }
        return result;
    };

    this.fold = function(xs, state, fn) {
        var acc = state;
        for (var i = 0; i < xs.length; ++i) {
            acc = fn(acc, xs[i]);
        }
        return acc;
    }
    
    // A simple hashtable
    var MyHashtable = function() {
        this._elems = {};
        this.size = 0;
    };
    
    // Checks if the hashtable is empty or not
    MyHashtable.prototype.isEmpty = function() {
        return this.size === 0;
    };
    
    // Checks if the given key exist within the hashtable
    MyHashtable.prototype.has = function(key) {
        return this._elems[key] !== undefined;
    };
    
    // Used to move loop through the hashtable
    MyHashtable.prototype.foreach = function(f) {
        var elems = this._elems;
        for (var key in elems) {
            if (elems.hasOwnProperty(key)) {
                f(key, elems[key]);
            }
        }
    };
    
    // Searches the hashtable for an element that matches the given
    // predicate and returns it if it was found. If no matching
    // element was found 'undefined' is returned.
    MyHashtable.prototype.find = function(pred) {
        var elems = this._elems;
        for (var k in elems) {
            if (elems.hasOwnProperty(k) && pred(k, elems[k])) {
                return elems[k];
            }
        }
        return undefined;
    };
    
    // Returns the values
    MyHashtable.prototype.values = function() {
        var results = new Array();
        this.foreach(function(_, value) {
            results.push(value);
        });
        return results;
    };
    
    // Returns the keys
    MyHashtable.prototype.keys = function() {
        var results = new Array();
        this.foreach(function(key, _) {
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
    
    // Adds a new value with the given key
    MyHashtable.prototype.put = function(key, value) {
        this._elems[key] = value;
        this.size += 1;
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
    this.Hashtable = MyHashtable;
};
