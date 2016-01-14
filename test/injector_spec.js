"use strict";

var setupModuleLoader = require('../src/loader');

var createInjector = require('../src/injector');

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
});