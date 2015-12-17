'use strict';
var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$phase = null;
}

function initWacthVal() {
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function () {
        },
        valueEq: !!valueEq,
        last: initWacthVal
    };
    this.$$watchers.push(watcher);
    this.$$lastDirtyWatch = null;
};

Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$apply = function (expr) {
    try {
        this.$beginPhase("$apply");
        return this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$digest();
    }
};

Scope.prototype.$evalAsync = function (expr) {
    var self = this;
    if(!this.$$phase && !this.$$asyncQueue.length){
        setTimeout(function () {
            if(self.$$asyncQueue.length){
                self.$digest();
            }
        }, 0);
    }

    this.$$asyncQueue.push({scope: this, expression: expr});
};

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEqual) {
    if (!valueEqual) {
        return newValue === oldValue ||
            (typeof newValue === 'number' && typeof oldValue === 'number' &&
            isNaN(newValue) && isNaN(oldValue));
    }
    else {
        return _.isEqual(newValue, oldValue);
    }
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEach(this.$$watchers, function (watcher) {

        newValue = watcher.watchFn(self);
        oldValue = watcher.last;

        if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
            self.$$lastDirtyWatch = watcher;
            watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
            watcher.listenerFn(newValue,
                (oldValue === initWacthVal ? newValue : oldValue), self);

            dirty = true;
        }
        else if (self.$$lastDirtyWatch === watcher) {
            return false;
        }
    });

    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty, TTL = 10;
    this.$$lastDirtyWatch = null;
    this.$beginPhase("$digest");

    do {
        while (this.$$asyncQueue.length) {
            var asyncTask = this.$$asyncQueue.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }
        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(TTL--)) {
            this.$clearPhase();
            throw "exceed 10 times";
        }
    } while (dirty || this.$$asyncQueue.length);

    this.$clearPhase();
};

Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress.';
    }

    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};


module.exports = Scope;