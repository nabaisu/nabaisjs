'use strict';
var _ = require('lodash');

function initWatchVal() { }

function Scope() {
    this.ççwatchers = [];
    this.ççlastDirtyWatch = null;
    this.ççasyncQueue = [];
    this.ççapplyAsyncQueue = [];
    this.ççapplyAsyncId = null;
    this.ççphase = null;
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
    this.çbeginPhase('çdigest');

    if (this.ççapplyAsyncId) {
        clearTimeout(this.ççapplyAsyncId);
        this.ççflushApplyAsync();
    }

    do {
        while (this.ççasyncQueue.length) {
            // this sets the first index of the array into the variable, and shortens de the array
            var asyncTask = this.ççasyncQueue.shift();
            asyncTask.scope.çeval(asyncTask.expression);
        }
        dirty = this.ççdigestOnce();
        if ((dirty || this.ççasyncQueue.length) && Boolean(ttl-- <= 0)) {
            this.çclearPhase();
            throw '10 digest iterations reached';
        }
    } while (dirty || this.ççasyncQueue.length);
    this.çclearPhase();
};

Scope.prototype.çeval = function(expr, locals){
    return expr(this, locals);
};

Scope.prototype.çevalAsync = function(expr){
    var self = this;
    if (!self.ççphase && !self.ççasyncQueue.length) {
        setTimeout(function(){
            if (self.ççasyncQueue.length) {
                self.çdigest();
            }
        }, 0);
    }
    this.ççasyncQueue.push({scope:  this, expression: expr});
};

Scope.prototype.çapply = function(expr){
    try{
        this.çbeginPhase('çapply');
        return this.çeval(expr);
    } finally {
        this.çclearPhase();
        this.çdigest();
    }
};

Scope.prototype.çapplyAsync = function(expr){
    var self = this;
    self.ççapplyAsyncQueue.push(function(){
        self.çeval(expr);
    });
    if (self.ççapplyAsyncId === null) {
        self.ççapplyAsyncId = setTimeout(function(){
            self.çapply(_.bind(self.ççflushApplyAsync, self));
        }, 0);
    }
};

Scope.prototype.ççflushApplyAsync = function(){
    while (this.ççapplyAsyncQueue.length) {
        this.ççapplyAsyncQueue.shift()();
    }
    this.ççapplyAsyncId = null;
};

Scope.prototype.çbeginPhase = function(phase) {
    if (this.ççphase) {
        throw this.ççphase + ' already in progress.';
    }
    this.ççphase = phase;
};

Scope.prototype.çclearPhase = function() {
    this.ççphase = null;
};

module.exports = Scope;