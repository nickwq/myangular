'use strict';
var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
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

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEqual) {
    if (!valueEqual) {
        return newValue === oldValue;
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

    do {
        dirty = this.$$digestOnce();
        if (dirty && !(TTL--)) throw "exceed 10 times";
        TTL++;
    } while (dirty);
};

module.exports = Scope;