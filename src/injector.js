"use strict";

var _ = require('lodash');
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /^\s*(\S+)\s*$/;
var STRIP_COMMENTS = /\/\*.*\*\//;

function createInjector(modulesToLoad) {
    var cache = {};
    var loadedModules = {};
    var $provide = {
        constant: function(key, value){
            if(key === 'hasOwnProperty'){
                throw 'hasOwnProperty is not a valid constant name!'
            }
            cache[key] = value;
        }
    };

    function invoke(fn, self, locals){
        var args = _.map(fn.$inject, function (token) {
            if(_.isString(token)){
                if(locals && locals.hasOwnProperty(token)){
                    return locals[token];
                }else {
                    return cache[token];
                }
            } else {
                throw 'Incorrect injection token! Expected a string, got ' + token;
            }
        });

        return fn.apply(self, args);
    }

    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if(!loadedModules.hasOwnProperty(moduleName)){
            loadedModules[moduleName] = true;
            var module = window.angular.module(moduleName);
            _.forEach(module.requires, loadModule);
            _.forEach(module._invokeQueue, function(invokeArgs){
                var method = invokeArgs[0];
                var args = invokeArgs[1];
                $provide[method].apply($provide, args);
            });
        }
    });

    function annotate(fn) {
        if(_.isArray(fn)){
            return fn.slice(0, fn.length-1);
        } else if (fn.$inject) {
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function(arg){
                return arg.match(FN_ARG)[1];
            });
        }
    }
    return {
        has: function (key) {
            return cache.hasOwnProperty(key);
        },
        get: function(key){
            return cache[key];
        },
        invoke: invoke,
        annotate: annotate
    };
}

module.exports = createInjector;