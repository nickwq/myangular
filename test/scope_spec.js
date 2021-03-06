'use strict';

var Scope = require('../src/scope');
var _ = require('lodash');

describe('Scope', function () {

    it('can be constructed and use as an object', function () {
        var scope = new Scope();
        scope.aProperty = 1;
        expect(scope.aProperty).toBe(1);
    });

    describe('digest', function () {
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        it('calls the listener function of a watch on first $digest', function () {
            var watchFn = function () {
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();

            scope.$watch(watchFn, listenerFn);
            scope.$digest();
            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with scope as the the argument', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () {
            };
            scope.$watch(watchFn, listenerFn);
            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('call the listener function when the watched value changes', function () {
            scope.someValue = 'a';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', function () {
            scope.counter = 0;

            scope.$watch(
                function () {
                    return undefined;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', function () {
            scope.someValue = 123;
            var oldValueGiven;

            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('may have watchers that omit the listener function', function () {
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);

            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it('triggered chained watchers in the same digest', function () {
            scope.name = 'Jane';
            scope.$watch(
                function (scope) {
                    return scope.nameUpper;
                },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.name;
                },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
        });

        it('give up on the watchers after 10 times', function () {
            scope.counter = 0;
            scope.someValue = 0;

            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    scope.someValue++;
                    scope.counter++;
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.someValue;
                },
                function (newValue, oldValue, scope) {
                    scope.someValue++;
                    scope.counter++;
                }
            );

            expect(scope.$digest).toThrow();
        });

        it('ends the digest when the last watch is clean', function () {
            scope.array = _.range(100);
            var watchExecutions = 0;

            _.times(100, function (i) {
                scope.$watch(
                    function (scope) {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    function (newValue, oldValue, scope) {

                    }
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it('does not end digest so that new watches are not run', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.$watch(
                        function (scope) {
                            return scope.aValue;
                        },
                        function (newValue, oldValue, scope) {
                            scope.counter++;
                        }
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', function () {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it('correctly handles NANs', function () {
            scope.number = 0 / 0;
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.number;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("executes $eval'ed funciton and return result", function () {
            scope.aValue = 42;
            var result = scope.$eval(function (scope) {
                return scope.aValue;
            });

            expect(result).toBe(42);

        });

        it('passed the second $eval argument straight through', function () {
            scope.aValue = 42;

            var result = scope.$eval(function (scope, arg) {
                return scope.aValue + arg;
            }, 2);

            expect(result).toBe(44);
        });

        it("executes $apply'ed function and starts the digest", function () {
            scope.aValue = 42;
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function (scope) {
                scope.aValue = "otherValue";
            });

            expect(scope.counter).toBe(2);
        });

        it("executes $evalAsync'ed function later in the same cycle", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    });

                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
            );
            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);

        });

        it("executes $evalAsync'ed functions added by watch functions ", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;

            scope.$watch(
                function (scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluated = true;
                        });
                    }

                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {

                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });

        it('executes $evalAsync functions even when not dirty', function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;

            scope.$watch(
                function (scope) {
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },

                function (newValue, oldValue, scope) {
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it('eventually halts the $evalAsyncs added by watches', function () {
            scope.aValue = [1, 2, 3];

            scope.$watch(
                function (scope) {
                    scope.$evalAsync(function (scope) {
                    });
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                }
            );

            expect(function () {
                scope.$digest();
            }).toThrow();

        });

        it('has a $$phase field whose value is the current digest phase', function () {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                function (scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                },
                function (newValue, oldValue, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');

        });

        it('schedule a digest in $evalAsync', function (done) {
            scope.aValue = "abc";
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$evalAsync(function (scope) {
            });
            expect(scope.counter).toBe(0);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it('allows async $apply with $applyAsync', function (done) {
            scope.counter = 0;
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });

            expect(scope.counter).toBe(1);

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('never executes $applyAsynced function in the same cycle', function (done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(function (scope) {
                return scope.aValue;
            }, function (newValue, oldValue, scope) {
                scope.$applyAsync(function (scope) {
                    scope.asyncApplied = true;
                });
            });

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);

            setTimeout(function () {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });


        it('coalesces many calls to $applyAsync', function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {

                }
            );

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });

            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('cancels and flushed $applyAsync if digested first', function (done) {
            scope.counter = 0;

            scope.$watch(function (scope) {
                scope.counter++;
                return scope.aValue;
            }, function (newValue, oldValue, scope) {

            });


            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toBe('def');

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('runs a $$postDigest function after each digest', function () {
            scope.counter = 0;

            scope.$$postDigest(
                function () {
                    scope.counter++;
                }
            );

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('does not include $$postDigest in the digest', function () {
            scope.aValue = 'original value';

            scope.$$postDigest(function () {
                scope.aValue = 'changed value';
            });

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                });

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        it('catches expections in watch functions and continues', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    throw "error";
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in listener functions and continues', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    throw "error";
                }
            );
            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);


        });

        it('catches exceptions in $applyAsync', function (done) {
            scope.$applyAsync(function (scope) {
                throw "error";
            });
            scope.$applyAsync(function (scope) {
                throw "error";
            });
            scope.$applyAsync(function (scope) {
                scope.applied = true;
            });

            setTimeout(function () {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });

        it('catches exceptions in $$postDigest', function () {
            var didRun = false;

            scope.$$postDigest(function (scope) {
                throw "error";
            });
            scope.$$postDigest(function () {
                didRun = true;
            });

            scope.$digest();
            expect(didRun).toBe(true);

        });

        it('allows destroying a $watch with a removal function', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('allows destroying a $watch during digest', function () {
            scope.aValue = 'abc';
            var watchCalls = [];

            scope.$watch(function (scope) {
                watchCalls.push('first');
                return scope.aValue;
            });

            var destroyWatch = scope.$watch(function (scope) {
                watchCalls.push('second');
                destroyWatch();
            });

            scope.$watch(function (scope) {
                watchCalls.push('third');
                return scope.aValue;
            });

            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);

        });

        it('allows a $watch to destroy another during digest', function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    destroyWatch();
                }
            );

            var destroyWatch = scope.$watch(
                function (scope) {

                },
                function (newValue, oldValue, scope) {
                }
            );

            scope.$watch(function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

        });

        it("allows destroying several $watches during digest", function () {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch1 = scope.$watch(
                function (scope) {
                    destroyWatch1();
                    destroyWatch2();
                }
            );
            var destroyWatch2 = scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(0);
        });
    });

    describe('$watchGroup', function () {
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        it('takes watches as an array and calls listener with arrays', function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [function (scope) {
                    return scope.aValue;
                }, function (scope) {
                    return scope.anotherValue;
                }],
                function (newValues, oldValues, scope) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();

            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('use differnet arrays for old and new values on subsequent runs', function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });
            scope.$digest();
            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('calls the listener once when the watch array is empty', function () {
            var gotNewValues, gotOldValues;

            scope.$watchGroup([], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();

            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it('can be deregistered', function () {
            var counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            var destroyGroup = scope.$watchGroup([
                function (scope) {
                    return scope.aValue;
                },
                function (scope) {
                    return scope.anotherValue;
                }
            ], function (newValues, oldValues, scope) {
                counter++;
            });

            scope.$digest();

            scope.anotherValue = 3;
            destroyGroup();
            scope.$digest();

            expect(counter).toEqual(1);
        });

        it('does not call the zero-watch listener when deregistered first', function () {
            var counter = 0;

            var destroyGroup = scope.$watchGroup([],
                function (newValues, oldValues, scope) {
                    counter++;
                });

            destroyGroup();
            scope.$digest();

            expect(counter).toEqual(0);
        });
    });

    describe('inheritance', function () {

        it('inherits the parents properties', function () {
            var parent = new Scope();
            parent.aValue = [1, 2, 3];

            var child = parent.$new();
            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it('doesnot cause a parent to inherit its properties', function () {
            var parent = new Scope();

            var child = parent.$new();
            child.aValue = [1, 2, 3];

            expect(parent.aValue).toBeUndefined();
        });

        it('inherits the parents properties whenever they are defined', function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = [1, 2, 3];

            expect(child.aValue).toEqual([1, 2, 3]);

        });

        it('can manipulate a parent scopes property', function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = [1, 2, 3];

            child.aValue.push(4);

            expect(child.aValue).toEqual([1, 2, 3, 4]);
            expect(parent.aValue).toEqual([1, 2, 3, 4]);

        });

        it('can watch a property in the parent', function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = [1, 2, 3];
            child.counter = 0;

            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    child.counter++;
                }, true);

            child.$digest();
            expect(child.counter).toBe(1);

            parent.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);

        });

        it('shadows a parents property with the same name', function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.name = "Joe";
            child.name = "Jill";

            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');
        });

        it('does not shadow members of parent scopes attributes', function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.user = {name: 'Joe'};
            child.user.name = 'Jill';

            expect(child.user.name).toBe('Jill');
            expect(parent.user.name).toBe('Jill');
        });

        it('does not digest its parents', function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();

        });

        it('keeps a record of its children', function () {
            var parent = new Scope();
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);
            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        it("digests its children", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it("digests from root on $apply", function () {
            var parent = new Scope();
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function(scope){});

            expect(parent.counter).toBe(1);
        });

        it("schedules a digest from root on $evalAsync", function (done) {
            var parent = new Scope();
            var child = parent.$new();
            var child2= child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;

            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function (scope) {
            });

            setTimeout(function() {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it("does not have access to parent attributes when isolated", function () {
            var parent  = new Scope();
            var child = parent.$new(true);

            parent.aValue = 'abc';

            expect(child.aValue).toBeUndefined();

        });

        it("cannot watch parent attributes when isolated", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it("digests its isolated children", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it("digests from root on $apply when isolated", function () {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;

            parent.$watch(
                function(scope){ return scope.aValue;},
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function(scope){});
            expect(parent.counter).toBe(1);
        });

        it("schedules a digest from root on $evalAsync when isolated", function (done) {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function(scope){});
            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it("executes $evalAsync functions on isolated scopes", function(done){
            var parent = new Scope();
            var child = parent.$new(true);
            child.$evalAsync(function(scope){
                scope.didEvalAsync = true;
            });

            setTimeout(function(){
                expect(child.didEvalAsync).toBe(true);
                done();
            }, 50);
        });

        it("executes $$postDigest functions on isolated scopes", function(){
           var parent = new Scope();
            var child = parent.$new();

            child.$$postDigest(function(){
                child.didEvalAsync = true;
            });

            child.$$postDigest(function(){
                child.didEvalAsync = true;
            });

            parent.$digest();

            expect(child.didEvalAsync).toBe(true);
        });

        it("can take some other scope as the parent", function () {
          var prototypeParent = new Scope();
          var hierarchyParent = new Scope();
          var child = prototypeParent.$new(false, hierarchyParent);

          prototypeParent.a = 42;
          expect(child.a).toEqual(42);

          child.counter = 0;
          child.$watch(function(scope){
            scope.counter++;
          });

          prototypeParent.$digest();
          expect(child.counter).toEqual(0);

          hierarchyParent.$digest();
          expect(child.counter).toEqual(2);
        });

        it('is no longer digested when $destroy has been called', function () {
            var parent = new Scope();
            var child = parent.$new();

            child.aValue = [1,2,3];
            child.counter = 0;

            child.$watch(function(scope){
                return scope.aValue;
            }, function(newValue, oldValue, scope){
                scope.counter++;
            }, true);

            parent.$digest();
            expect(child.counter).toBe(1);

            child.aValue.push(4);
            child.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);

        });
    });

    describe('$watchCollection', function () {
        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        it('works like a normal watch for non-collections', function () {
            var valueProvided;
            
            scope.aValue = 42;
            scope.counter = 0;
            
            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    valueProvided = newValue;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(scope.aValue);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('works like a normal watch for NaNs', function () {
            scope.aValue = 0/0;
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices when the value becomes an array', function () {
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr = [1,2,3];
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item added to an array', function () {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when an item removed from array', function () {
            scope.arr = [1, 2, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.shift();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaces in an array', function () {
            scope.arr = [1,2, 3];
            scope.counter = 0;
            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices items reordered in an array', function () {
            scope.arr = [2, 1, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arr;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaced in an arguments object', function () {
            (function(){
                scope.arrayLike = arguments;
            })(1, 2, 3);
            scope.counter = 0;

            scope.$watchCollection(
                function (scope) {
                    return scope.arrayLike;
                },
                function(newValue, oldValue, scope){
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arrayLike[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaced in a NodeList object', function() {
            document.documentElement.appendChild(document.createElement('div'));
            scope.arrayLike = document.getElementsByTagName('div');
            scope.counter = 0;
            scope.$watchCollection(
                function(scope) { return scope.arrayLike; },
                function(newValue, oldValue, scope) {
                    scope.counter++;}
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            document.documentElement.appendChild(document.createElement('div'));
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when the value becomes an object', function() {
            scope.counter = 0;
            scope.$watchCollection(
                function(scope) { return scope.obj; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.obj = {a: 1};
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notice when an attribute is added to an object', function () {
            scope.counter = 0;
            scope.obj = {a:1};
            
            scope.$watchCollection(
                function () {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            
            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.obj.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when an attribute is rermoved from an object', function () {
            scope.counter = 0;
            scope.obj = {a:1};

            scope.$watchCollection(
                function () {
                    return scope.obj;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            delete scope.obj.a;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not consider any object with a length property as an array', function () {
            scope.object = {length:42, otherKey: 'abc'};
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) {
                    return scope.object;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.object.newKey = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('gives the old non-collection value to listeners', function () {
            scope.aValue = 42;
            var oldValueGiven;

            scope.$watchCollection(
                function(scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue = 43;
            scope.$digest();
            expect(oldValueGiven).toBe(42);
        });

        it('gives the old array value to listeners', function () {
            scope.aValue = [1,2,3];
            var oldValueGiven;

            scope.$watchCollection(
                function(scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue.push(4);
            scope.$digest();
            expect(oldValueGiven).toEqual([1, 2, 3]);
        });

        it('gives the old object value to listeners', function () {
            scope.aValue = {a:1, b:2};
            var oldValueGiven;

            scope.$watchCollection(
                function(scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue.c = 3;
            scope.$digest();
            expect(oldValueGiven).toEqual({a:1, b:2});
        });

        it('uses the new value as the old value on first digest', function() {
            scope.aValue = {a: 1, b: 2};
            var oldValueGiven;
            scope.$watchCollection(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );
            scope.$digest();
            expect(oldValueGiven).toEqual({a: 1, b: 2});
        });
    });
});
