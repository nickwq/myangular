'use strict';
var _ = require('lodash');

function Scope() {
    this.$$watchers = [];
}

function initWacthVal(){}

Scope.prototype.$watch = function (watchFn, listenerFn) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn,
        last: initWacthVal
    };
    this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function () {
    var self = this;
    var newValue, oldValue;
    _.forEach(this.$$watchers, function (watcher) {
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;

        if (newValue !== oldValue) {
            watcher.last = newValue;
            watcher.listenerFn(newValue,
                (oldValue === initWacthVal ? newValue : oldValue), self);
        }
    });
};

module.exports = Scope;