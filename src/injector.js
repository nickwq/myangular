"use strict";

var _ = require('lodash');
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /^\s*(_?)(\S+?)(_?)\s*$/;

var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
var INSTANTIATING = {};


function createInjector(modulesToLoad, strictDi) {
    var providerCache = {};
    var instanceCache = {};
    var loadedModules = {};
    strictDi = (strictDi === true);
    var $provide = {
        constant: function(key, value){
            if(key === 'hasOwnProperty'){
                throw 'hasOwnProperty is not a valid constant name!';
            }
            instanceCache[key] = value;
        },
        provider: function(key, provider){
            providerCache[key + 'Provider'] = provider;
        }
    };

    function getService(name) {
        if(instanceCache.hasOwnProperty(name)){
            if(instanceCache[name] === INSTANTIATING){
                throw new Error('Circular dependency found')
            }
            return instanceCache[name];
        }
        else if(providerCache.hasOwnProperty(name+'Provider')){
            instanceCache[name] = INSTANTIATING;
            var provider = providerCache[name+'Provider'];
            var instance = invoke(provider.$get, provider);
            instanceCache[name] = instance;
            return instance;
        }
    }

    function invoke(fn, self, locals){
        var args = _.map(annotate(fn), function (token) {
            if(_.isString(token)){
                //
                return locals && locals.hasOwnProperty(token) ?
                    locals[token] : getService(token);
            } else {
                throw 'Incorrect injection token! Expected a string, got ' + token;
            }
        });

        if(_.isArray(fn)){
            fn = _.last(fn);
        }

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
            if(strictDi){
                throw 'fn is not using explicit annotation and cannot be invoked in strict mode';
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function(arg){
                return arg.match(FN_ARG)[2];
            });
        }
    }
    return {
        has: function (key) {
            return providerCache.hasOwnProperty(key + 'Provider') ||
                instanceCache.hasOwnProperty(key);
        },
        get: getService,
        invoke: invoke,
        annotate: annotate
    };
}

module.exports = createInjector;