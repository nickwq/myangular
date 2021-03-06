"use strict";

var _ = require('lodash');
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /^\s*(_?)(\S+?)(_?)\s*$/;

var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;
var INSTANTIATING = {};


function createInjector(modulesToLoad, strictDi) {
    var providerCache = {};
    var providerInjector = providerCache.$injector =
        createInternalInjector(providerCache, function() {
        throw 'Unknown provider: '+path.join(' <- ');
    });
    var instanceCache = {};
    var instanceInjector = instanceCache.$injector =
        createInternalInjector(instanceCache, function(name) {
        var provider = providerInjector.get(name + 'Provider');
        return instanceInjector.invoke(provider.$get, provider);
    });
    var loadedModules = {};
    var path = [];
    strictDi = (strictDi === true);
    var $provide = {
        constant: function (key, value) {
            if (key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name!';
            }
            providerCache[key] = value;
            instanceCache[key] = value;
        },
        provider: function (key, provider) {
            if (_.isFunction(provider)) {
                provider = providerInjector.instantiate(provider);
            }
            providerCache[key + 'Provider'] = provider;
        }
    };

    function createInternalInjector(cache, factoryFn) {
        function getService(name) {
            if (cache.hasOwnProperty(name)) {
                if (cache[name] === INSTANTIATING) {
                    throw new Error('Circular dependency found: ' +
                        name + ' <- ' + path.join(' <- '));
                }
                return cache[name];
            } else {
                path.unshift(name);
                cache[name] = INSTANTIATING;
                try {
                    return (cache[name] = factoryFn(name));
                } finally {
                    if (cache[name] === INSTANTIATING) {
                        delete cache[name];
                    }
                }
            }
        }

        function invoke(fn, self, locals) {
            var args = annotate(fn).map(function (token) {
                if (_.isString(token)) {
                    return locals && locals.hasOwnProperty(token) ?
                        locals[token] : getService(token);
                } else {
                    throw 'Incorrect injection token! Expected a string, got ' + token;
                }
            });

            if (_.isArray(fn)) {
                fn = _.last(fn);
            }
            return fn.apply(self, args);
        }

        function instantiate(Type, locals) {
            var instance = Object.create((_.isArray(Type) ?
                _.last(Type) : Type).prototype);

            invoke(Type, instance, locals);
            return instance;
        }

        return {
            has: function (name) {
                return cache.hasOwnProperty(name) ||
                    providerCache.hasOwnProperty(name + 'Provider');
            },
            get: getService,
            annotate: annotate,
            invoke: invoke,
            instantiate: instantiate
        };
    }

    function getService(name) {
        if (instanceCache.hasOwnProperty(name)) {
            if (instanceCache[name] === INSTANTIATING) {
                throw new Error('Circular dependency found: ' +
                    name + ' <- ' + path.join(' <- '));
            }
            return instanceCache[name];
        }
        else if (providerCache.hasOwnProperty(name)) {
            return providerCache[name];
        }
        else if (providerCache.hasOwnProperty(name + 'Provider')) {
            path.unshift(name);
            instanceCache[name] = INSTANTIATING;

            try {
                var provider = providerCache[name + 'Provider'];
                var instance = invoke(provider.$get, provider);
                instanceCache[name] = instance;
                return instance;
            } finally {
                path.shift();
                if (instanceCache[name] === INSTANTIATING) {
                    delete instanceCache[name];
                }
            }

        }
    }

    function invoke(fn, self, locals) {
        var args = _.map(annotate(fn), function (token) {
            if (_.isString(token)) {
                //
                return locals && locals.hasOwnProperty(token) ?
                    locals[token] : getService(token);
            } else {
                throw 'Incorrect injection token! Expected a string, got ' + token;
            }
        });

        if (_.isArray(fn)) {
            fn = _.last(fn);
        }

        return fn.apply(self, args);
    }

    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if (!loadedModules.hasOwnProperty(moduleName)) {
            loadedModules[moduleName] = true;
            var module = window.angular.module(moduleName);
            _.forEach(module.requires, loadModule);
            _.forEach(module._invokeQueue, function (invokeArgs) {
                var method = invokeArgs[0];
                var args = invokeArgs[1];
                $provide[method].apply($provide, args);
            });
        }
    });

    function annotate(fn) {
        if (_.isArray(fn)) {
            return fn.slice(0, fn.length - 1);
        } else if (fn.$inject) {
            return fn.$inject;
        } else if (!fn.length) {
            return [];
        } else {
            if (strictDi) {
                throw 'fn is not using explicit annotation and cannot be invoked in strict mode';
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '');
            var argDeclaration = source.match(FN_ARGS);
            return _.map(argDeclaration[1].split(','), function (arg) {
                return arg.match(FN_ARG)[2];
            });
        }
    }

    return instanceInjector;

}

module.exports = createInjector;