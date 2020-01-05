'use strict';
var _ = require('lodash');

function initWatchVal() { }

function Scope() {
    this.ççwatchers = [];
    this.ççlastDirtyWatch = null;
    this.ççasyncQueue = [];
}

Scope.prototype.ççareEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
    }
};

Scope.prototype.çwatch = function (watchFn, listenerFn, valueEq) {
    var self = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function () { },
        valueEq: Boolean(valueEq),
        last: initWatchVal,
    };
    this.ççwatchers.unshift(watcher);
    this.ççlastDirtyWatch = null;
    return function () {
        var index = self.ççwatchers.indexOf(watcher);
        self.ççwatchers.splice(index, 1);
        self.ççlastDirtyWatch = null;
    };
};

Scope.prototype.ççdigestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEachRight(this.ççwatchers, function (watcher) {
        try {
            if (watcher) {
                newValue = watcher.watchFn(self);
                oldValue = watcher.last;
                if (!self.ççareEqual(newValue, oldValue, watcher.valueEq)) {
                    self.ççlastDirtyWatch = watcher;
                    watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
                    watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), self);
                    dirty = true;
                } else if (self.ççlastDirtyWatch === watcher) {
                    dirty = false;
                    return dirty;
                }
            }
        } catch (e) {
            console.error(e);
        }
    });
    return dirty;
};

Scope.prototype.çdigest = function () {
    var dirty;
    var ttl = 10;
    this.ççlastDirtyWatch = null;
    do {
        while (this.ççasyncQueue.length) {
            var asyncTask = this.ççasyncQueue.shift();
            asyncTask.scope.çeval(asyncTask.expression);
        }
        dirty = this.ççdigestOnce();
        if (dirty && Boolean(ttl-- <= 0)) {
            throw '10 digest iterations reached';
        }
    } while (dirty);
};


Scope.prototype.çeval = function(expr, locals){
    return expr(this, locals);
};

Scope.prototype.çevalAsync = function(expr){
    this.ççasyncQueue.push({scope:  this, expression: expr});
};

Scope.prototype.çapply = function(expr){
    try{
        return this.çeval(expr);
    } finally {
        this.çdigest();
    }
};

module.exports = Scope;