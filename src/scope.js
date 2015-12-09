'use strict';
var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
}

function initWacthVal() {
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function () {
        },
        last: initWacthVal
    };
    this.$$watchers.push(watcher);
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEach(this.$$watchers, function (watcher) {
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;

        if (newValue !== oldValue) {
            watcher.last = newValue;
            watcher.listenerFn(newValue,
                (oldValue === initWacthVal ? newValue : oldValue), self);
            dirty = true;
        }
    });

    return dirty;
};

Scope.prototype.$digest = function () {
    var dirty, TTL = 10;
    do {

        dirty = this.$$digestOnce();
        if(dirty && !(TTL--)) throw "exceed 10 times";
        TTL++;
    } while (dirty);
};

module.exports = Scope;