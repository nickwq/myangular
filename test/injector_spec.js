"use strict";

var setupModuleLoader = require('../src/loader');

var createInjector = require('../src/injector');
var _ = require('lodash');

describe('injector', function () {

    beforeEach(function () {
        delete window.angular;
        setupModuleLoader(window);
    });

    it("can be created", function () {
        var injector = createInjector([]);
        expect(injector).toBeDefined();
    });

    it("has a constant that has been registered to a module", function () {
        var module = window.angular.module('myModule', []);
        module.constant('aConstant', 42);
        var injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(true);
    });

    it("does not have a non-registered constant", function () {
        var module = window.angular.module('myModule', []);
        var injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(false);
    });

    it("does not allow a constant called hasOwnProperty", function () {
        var module = window.angular.module('myModule', []);
        module.constant('hasOwnProperty', false);
        expect(function () {
            createInjector(['myModule']);
        }).toThrow();
    });

    it("can return a registered constant", function () {
        var module = window.angular.module('myModule', []);
        module.constant('aConstant', 42);

        var injector = createInjector(['myModule']);
        expect(injector.get('aConstant')).toBe(42);
    });

    it("loads multiple modules", function () {
        var module1 = window.angular.module('myModule', []);
        var module2 = window.angular.module('myOtherModule', []);

        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);

        var injector = createInjector(['myModule', 'myOtherModule']);
        expect(injector.has('aConstant')).toBeTruthy();
        expect(injector.has('anotherConstant')).toBeTruthy();
    });

    it("loads the required modules of a module", function () {
        var module1 = window.angular.module('myModule', []);
        var module2 = window.angular.module('myOtherModule', ['myModule']);

        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);

        var injector = createInjector(['myOtherModule']);

        expect(injector.has('aConstant')).toBeTruthy();
        expect(injector.has('anotherConstant')).toBeTruthy();
    });

    it("loads the transitively requires modules of a module", function () {
        var module1 = window.angular.module('myModule', []);
        var module2 = window.angular.module('myOtherModule', ['myModule']);
        var module3 = window.angular.module('myThirdModule', ['myOtherModule']);

        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        module3.constant('aThirdConstant', 44);

        var injector = createInjector(['myThirdModule']);

        expect(injector.has('aConstant')).toBeTruthy();
        expect(injector.has('anotherConstant')).toBeTruthy();
        expect(injector.has('aThirdConstant')).toBeTruthy();
    });

    it("loads each module only once", function () {
        window.angular.module('myModule', ['myOtherModule']);
        window.angular.module('myOtherModule', ['myModule']);

        createInjector(['myModule']);
    });

    it("invokes an annotated function with dependency injection", function () {
        var module = window.angular.module('myModule', []);

        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);

        var fn = function (one, two) {
            return one + two;
        };
        fn.$inject = ['a', 'b'];

        expect(injector.invoke(fn)).toBe(3);
    });

    it("does not accept non-strings as injection tokens", function () {
        var module = window.angular.module('myModule', []);
        module.constant('a', 1);
        var injector = createInjector(['myModule']);

        var fn = function (one, two) {
            return one + two;
        };
        fn.$inject = ['a', 2];

        expect(function () {
            injector.invoke(fn);
        }).toThrow();

    });

    it("invokes a function with the given context", function () {
        var module = window.angular.module('myModule', []);
        module.constant('a', 1);
        var injector = createInjector(['myModule']);

        var obj = {
            two: 2,
            fn: function (one) {
                return one + this.two;
            }
        };

        obj.fn.$inject = ['a'];

        expect(injector.invoke(obj.fn, obj)).toBe(3);
    });

    it("overrides dependencies with locals when invoking", function () {
        var module = window.angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);

        var fn = function (one, two) {
            return one + two;
        };
        fn.$inject = ['a', 'b'];

        expect(injector.invoke(fn, undefined, {b: 3})).toBe(4);
    });
});

describe('annotate', function () {
    it("returns the $inject annotation of a function when it has one", function () {
        var injector = createInjector([]);

        var fn = function () {
        };
        fn.$inject = ['a', 'b'];

        expect(injector.annotate(fn)).toEqual(['a', 'b']);
    });

    it("returns the array-style annotations of a function", function () {
        var injector = createInjector([]);

        var fn = ['a', 'b', function () {
        }];

        expect(injector.annotate(fn)).toEqual(['a', 'b']);
    });

    it("returns an empty array for a non-annotated 0-arg function", function () {
        var injector = createInjector([]);
        var fn = function () {
        };

        expect(injector.annotate(fn)).toEqual([]);


    });

    it("returns annotations parsed from function args when not annotated", function () {
        var injector = createInjector([]);

        var fn = function (a, b) {
        };

        expect(injector.annotate(fn)).toEqual(['a', 'b']);

    });

    it("strips comments from argument lists when parsing", function () {
        var injector = createInjector([]);

        var fn = function (a, /*b,*/c) {
        };
        expect(injector.annotate(fn)).toEqual(['a', 'c']);

    });

    it("strips // comments from argument lists when parsing", function () {
        var injector = createInjector([]);

        var fn = function (a, //b
                           c) {
        };
        expect(injector.annotate(fn)).toEqual(['a', 'c']);

    });

    it("strips surrouding underscores from argument names when parsing", function () {
        var injector = createInjector([]);

        var fn = function (a, _b_, c_, _d, an_argument) {
        };

        expect(injector.annotate(fn)).toEqual(['a', 'b', 'c', 'd', 'an_argument']);
    });

    it("throws when using a non-annotated fn in strict mode", function () {
        var injector = createInjector([], true);

        var fn = function (a, b, c) {
        };

        expect(function () {
            injector.annotate(fn);
        }).toThrow();
    });

    it("invokes an array-annotated function with dependency injection", function () {
        var module = window.angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);

        var fn = ['a', 'b', function (one, two) {
            return one + two;
        }];
        expect(injector.invoke(fn)).toBe(3);
    });

    it("invokes a non-annotated function with dependency injection", function () {
        var module = window.angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);

        var fn = function (a, b) {
            return a + b;
        };
        expect(injector.invoke(fn)).toBe(3);
    });

    it("allows registering a provider and uses its $get", function () {
        var module = window.angular.module('myModule', []);
        module.provider('a', {
            $get: function () {
                return 42;
            }
        });

        var injector = createInjector(['myModule']);
        expect(injector.has('a')).toBeTruthy();
        expect(injector.get('a')).toBe(42);
    });

    it("injects the $get method of a provider", function () {
        var module = window.angular.module('myModule', []);
        module.constant('a', 1);
        module.provider('b', {
            $get: function (a) {
                return a + 2;
            }
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(3);
    });

    it("injects the $get method of a provider laily", function () {
        var module = window.angular.module(['myModule']);
        module.provider('b', {
            $get: function (a) {
                return a + 2;
            }
        });

        module.provider('a', {
            $get: _.constant(1)
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(3);
    });

    it("instantiates a dependency only once", function () {
        var module = window.angular.module('myModule', []);
        module.provider('a', {
            $get: function(){ return {};}
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(injector.get('a'));

    });

    it("notifies the user about a circular dependency", function () {
        var module = window.angular.module('myModule', []);
        module.provider('a', {$get: function(b){}});
        module.provider('b', {$get: function(c){}});
        module.provider('c', {$get: function(a){}});

        var injector = createInjector(['myModule']);
        expect(function () {
            injector.get('a');
        }).toThrowError(/Circular dependency found/);

    });

    it("cleans up the circular marker when instantiation fails", function () {
        var module = window.angular.module('myModule', []);
        module.provider('a', {
            $get: function(){
                throw  'Failing instantiation';
            }
        });

        var injector = createInjector(['myModule']);
        expect(function () {
            injector.get('a');
        }).toThrow('Failing instantiation');

        expect(function () {
            injector.get('a');
        }).toThrow('Failing instantiation');

    });

    it("notifies the user about a circular dependency", function () {
        var module = window.angular.module('myModule', []);
        module.provider('a', {$get: function(b){}});
        module.provider('b', {$get: function(c){}});
        module.provider('c', {$get: function(a){}});

        var injector = createInjector(['myModule']);

        expect(function () {
            injector.get('a');
        }).toThrowError('Circular dependency found: a <- c <- b <- a');
    });

    it('injects the given provider construction function', function () {
        var module = window.angular.module('myModule', []);
        module.provider('a', function AProvider(){
            this.$get = function() {return 42;};
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(42);
    });

    it('injects the given provider constructor function', function () {
        var module = window.angular.module('myModule', []);
        module.constant('b' , 2);
        module.provider('a', function AProvider(b) {
            this.$get = function() { return 1 + b;};
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(3);
    });

    it('injects another provider to a provider constructor function', function () {
        var module = window.angular.module('myModule', []);

        module.provider('a', function AProvider(){
            var value = 1;
            this.setValue = function(v) { value=v;};
            this.$get = function() { return value;};
        });

        module.provider('b', function BProvider(aProvider){
            aProvider.setValue(2);
            this.$get = function(){};
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(2);
    });

    it('does not inject an instance to a provider constructor function', function () {
        var module = window.angular.module('myModule', []);

        module.provider('a', function AProvider(){
            this.$get = function(){ return 1;};
        });

        module.provider('b', function BProvider(a){
            this.$get = function() { return a; };
        });

        expect(function(){
            createInjector(['myModule']);
        }).toThrow();
    });

    it('does not inject provider to a $get function', function () {
        var module = window.angular.module('myModule', []);

        module.provider('a', function AProvider(){
            this.$get = function(){ return 1;};
        });

        module.provider('b', function BProvider(){
            this.$get = function(aProvider) { return aProvider.$get(); };
        });

        var injector = createInjector(['myModule']);
        expect(function(){
            injector.get(b);
        }).toThrow();
    });

    it('does not inject a provider to invoke', function () {
        var module = window.angular.module('myModule', []);

        module.provider('a', function AProvider(){
            this.$get = function () {
                return 1;
            };
        });
        var injector = createInjector(['myModule']);
        expect( function () {injector.get('aProvider');}).toThrow();
    });

    it('does not give access to providers through get', function() {
        var module = window.angular.module('myModule', []);
        module.provider('a', function AProvider() {
            this.$get = function() { return 1; };
        });
        var injector = createInjector(['myModule']);
        expect(function() {
            injector.get('aProvider');
        }).toThrow();
    });

    it('registers contants first to make them available to providers', function () {
        var module = window.angular.module('myModule', []);

        module.provider('a', function AProvider(b){
            this.$get = function() {return b;};
        });
        module.constant('b', 42);
        var injector = createInjector(['myModule']);
        expect(injector.get('a')).toBe(42);
    });

    it('allows inject the injector instance to $get', function () {
        var module = window.angular.module('myModule', []);

        module.constant('a', 42);

        module.provider('b', function BProvider(){
            this.$get = function ($injector) {
                return $injector.get('a');
            }
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(42);
    });

    it('allows injecting the provider injector to provider', function () {
        var module = window.angular.module('myModule', []);

        module.provider('a', function AProvider(){
            this.value = 42;
            this.$get = function(){
                return this.value;
            };
        });
        module.provider('b', function BProvider($injector){
            var aProvider = $injector.get('aProvider');
            this.$get = function(){
                return aProvider.value;
            };
        });

        var injector = createInjector(['myModule']);
        expect(injector.get('b')).toBe(42);
    });

});