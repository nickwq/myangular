'use strict';
var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
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

            self.$$lastDirtyWatch = watcher;
        }
        else if( self.$$lastDirtyWatch === watcher)
        {
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