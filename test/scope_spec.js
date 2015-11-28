'use strict';

var Scope = require('../src/scope');

describe('Scope', function(){

    it('can be constructed and use as an object', function () {
        var scope = new Scope();
        scope.aProperty = 1;
        expect(scope.aProperty).toBe(1);
    });

    describe('digest', function(){
       var scope;

        beforeEach(function(){
           scope = new Scope();
        });

        it('calls the listener function of a watch on first $digest', function () {
            var watchFn = function(){
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();

            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with scope as the the argument', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function(){};
            scope.$watch(watchFn, listenerFn);
            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

    });
});