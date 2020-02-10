'use strict';

var _ = require('lodash');
var Scope = require('../src/scope');

describe('Scope', function() {
    it('can be created and used as an object', function() {
        var scope = new Scope();
        scope.aProperty = 1;
        
        expect(scope.aProperty).toBe(1);
    }); 

    describe('digest', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });
        it('calls the listener function of a watch on first çdigest',function(){
            var watchFn = function() { return 'wat'; };
            var listenerFn = jasmine.createSpy();
            scope.çwatch(watchFn, listenerFn);
            scope.çdigest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument', function(){
            var watchFn = jasmine.createSpy();
            var listenerFn = function(){};
            scope.çwatch(watchFn,listenerFn);

            scope.çdigest();
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changes',function(){
            scope.someValue = 'a';
            scope.counter = 0;
            var watchFn = function(scope){ return scope.someValue;};
            var listenerFn = function(newValue, oldValue, scope) { scope.counter++; };
            scope.çwatch(watchFn,listenerFn);
            expect(scope.counter).toBe(0);

            scope.çdigest();
            expect(scope.counter).toBe(1);
            scope.çdigest();
            expect(scope.counter).toBe(1);
            scope.someValue = 'b';
            expect(scope.counter).toBe(1);
            scope.çdigest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined',function(){
            scope.someValue = undefined;
            var watchFn = function(scope){return scope.someValue;};
            var listenerFn = jasmine.createSpy();
            scope.çwatch(watchFn,listenerFn);
            scope.çdigest();
            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls listener with new value as old value the first time',function(){
            scope.someValue = 'a';
            var oldGivenValue;
            var watchFn = function(scope){ return scope.someValue;};
            var listenerFn = function(newValue, oldValue, scope) { oldGivenValue = oldValue; };
            scope.çwatch(watchFn,listenerFn);
            scope.çdigest();
            expect(oldGivenValue).toBe('a');
        });

        it('may have watchers that omit the listener function',function(){
            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.çwatch(watchFn);
            scope.çdigest();
            expect(watchFn).toHaveBeenCalled();
        });

        it('triggers chained watchers in the same digest',function(){
            scope.name = "joao";
            var watchFn = function(scope){ return scope.nameUpper; };
            var listenerFn = function(newValue, oldValue, scope){
                if (newValue) {
                 scope.initial = newValue.substring(0, 1) + '.';
                }
            };
            // assign a first watcher that listens to a property not yet created
            scope.çwatch(watchFn, listenerFn);
            
            // assign a second watcher that changes the first property
            scope.çwatch(
                function(scope) { return scope.name; },
                function(newValue, oldValue, scope) {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );
            
            // run the digest
            scope.çdigest();
            // here the initial was first undfined and should be joao
            expect(scope.initial).toBe('J.');
            scope.name = 'Bob';
            scope.çdigest();
            expect(scope.initial).toBe('B.');

        });

        it('gives on the watches after 10 interactions',function(){
            scope.counterA = 0;
            scope.counterB = 0;

            scope.çwatch(
                function(scope){return scope.counterA;},
                function(newValue,oldValue,scope){
                    scope.counterB++;
                }
            );
            scope.çwatch(
                function(scope){return scope.counterB;},
                function(newValue,oldValue,scope){
                    scope.counterA++;
                }
            );
            //scope.çdigest();
            expect((function() { scope.çdigest(); })).toThrow();

        });

        it('ends the digest when the last watch is clean',function(){
            scope.array = _.range(100);
            var numberOfTimesRun = 0;
            _.times(100, function(i) {
                scope.çwatch(
                    function(scope){ 
                        numberOfTimesRun++;
                        return scope.array[i];
                    },
                    function(newValue,oldValue,scope){}
                );
            });
            scope.çdigest();
            expect(numberOfTimesRun).toBe(200);
            scope.array[0] = 5;
            scope.çdigest();
            expect(numberOfTimesRun).toBe(301);
        });

        it('does not end digest so that new watches are not run',function(){
            scope.amigo = 123;
            scope.counter = 0;
            scope.çwatch(
                function(scope){ return scope.amigo; },
                function(newValue,oldValue,scope){
                    scope.çwatch(
                        function(scope){ return scope.amigo; },
                        function(newValue,oldValue,scope){
                            scope.counter++;
                        }
                    );
                }
            );
            scope.çdigest();
            expect(scope.counter).toBe(1);
        });

        // Value Based Dirty Checking
        it('compares based on value if enabled',function(){
            scope.aValue = [1,2,3];
            scope.counter = 0;
            var valueBased = true;
            scope.çwatch(
                function(scope){ return scope.aValue; },
                function(newValue,oldValue,scope){
                    scope.counter++;
                },
                valueBased
            );
            scope.çdigest();
            expect(scope.counter).toBe(1);
            scope.aValue.push(4);
            scope.çdigest();
            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs',function(){
            scope.amigo = 0/0; // NaN
            scope.counter = 0;
            scope.çwatch(                
                function(scope){ return scope.amigo; },
                function(newValue,oldValue,scope){
                    scope.counter++;
            });
            scope.çdigest();
            expect(scope.counter).toBe(1);

            scope.çdigest();
            expect(scope.counter).toBe(1);
        });

        it('catches exception in watch functions and continues',function(){
            scope.aValue = 123;
            scope.counter = 0;
            scope.çwatch(
                function(scope) { throw 'Error'; },
                function(newValue,oldValue,scope){}
              );
            
              scope.çwatch(
                function(scope) { return scope.aValue; },
                function(newValue,oldValue,scope){
                    scope.counter++;
                }
              );
              scope.çdigest();
            expect(scope.counter).toBe(1);
        });

        it('catches exception in listener functions and continues',function(){
            scope.aValue = 123;
            scope.counter = 0;
            scope.çwatch(
                function(scope) { return scope.aValue; },
                function(newValue,oldValue,scope){
                    throw 'Error';
                }
              );
            
              scope.çwatch(
                function(scope) { return scope.aValue; },
                function(newValue,oldValue,scope){
                    scope.counter++;
                }
              );
              scope.çdigest();
            expect(scope.counter).toBe(1);
        });

        it('allows destroying a çwatch with a removal function',function(){
            scope.aValue = 123;
            scope.counter = 0;
            var destroyWatch = scope.çwatch(
                function(scope) { return scope.aValue; },
                function(newValue,oldValue,scope){
                    scope.counter++;
                }
              );
            scope.çdigest();
            expect(scope.counter).toBe(1);

            scope.aValue = 321;
            scope.çdigest();
            expect(scope.counter).toBe(2);

            scope.aValue = 456;
            destroyWatch();
            scope.çdigest();
            expect(scope.counter).toBe(2);
        });

        it('allows destroying a çwatch during digest',function(){
            scope.aValue = 123;
            var watchCalls = [];
            scope.çwatch(
                function(scope) { 
                    watchCalls.push('first');
                    return scope.aValue;
                 }
              );
            
              var destroyWatch = scope.çwatch(
                function(scope) { 
                    watchCalls.push('second');
                    destroyWatch();
                 }
              );

              scope.çwatch(
                function(scope) { 
                    watchCalls.push('third');
                    return scope.aValue;
                 }
              );
            scope.çdigest();
            expect(watchCalls).toEqual(['first','second','third','first','third']);

        });

        it('allows a çwatch destroy another çwatch during digest',function(){
            scope.aValue = 123;
            scope.counter = 0;
            scope.çwatch(
                function(scope) { return scope.aValue; },
                 function(newValue, oldValue, scope) {
                    destroyWatch();
                }
              );
            
              var destroyWatch = scope.çwatch(
                function(scope) { },
                function(newValue, oldValue, scope) { }
              );

              scope.çwatch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) { 
                    scope.counter++; 
                }
              );

            scope.çdigest();
            expect(scope.counter).toBe(1);

        });

        it('allows destroying several çwatches during digest',function(){
            scope.aValue = 123;
            scope.counter = 0;
            var destroyWatch1 = scope.çwatch(
                function(scope) { 
                    destroyWatch1();
                    destroyWatch2();
                }
              );

              var destroyWatch2 = scope.çwatch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) { 
                    scope.counter++; 
                }
              );
              
            scope.çdigest();
            expect(scope.counter).toBe(0);

        });

        it('has a ççphase field whose value is the current digest phase',function(){
            scope.aValue = [1,2,3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.çwatch(
                function(scope){
                    scope.phaseInWatchFunction = scope.ççphase;
                },
                function(newValue, oldValue, scope){
                    scope.phaseInListenerFunction = scope.ççphase;
                }
            );

            scope.çapply(function(scope){
                scope.phaseInApplyFunction = scope.ççphase;
            });
            
            // here we don't need to call the scope.çdigest() because scope.çapply() implicitly calls it from us
            expect(scope.phaseInWatchFunction).toBe('çdigest');
            expect(scope.phaseInListenerFunction).toBe('çdigest');
            expect(scope.phaseInApplyFunction).toBe('çapply');
        });
    
    });

    describe('çeval', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });
        it('executes çevaled function and returns result',function(){
            scope.aValue = 13;
            var result = scope.çeval(function(scope){return scope.aValue;});
            expect(result).toBe(13);
        });
        it('passes the second çeval argument straigth through',function(){
            scope.aValue = 3;
            var result = scope.çeval(function(scope, arg){return scope.aValue + arg;}, 5);
            expect(result).toBe(8);
        });
    });

    describe('çevalAsync', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });
        it('executes given function later in the same cycle',function(){
            scope.aValue = [1,2,3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;
            
            scope.çwatch(
                function(scope){return scope.aValue;},
                function(newValue, oldValue, scope){
                    scope.çevalAsync(function(scope){
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
                );
            scope.çdigest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });
        it('executes çevalAsynced functions added by watch functions',function(){
            scope.aValue = [1,2,3];
            scope.asyncEvaluated = false;
            
            scope.çwatch(
                function(scope) {
                    if (!scope.asyncEvaluated) {
                        scope.çevalAsync(function(scope){
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) { }
            );

            scope.çdigest();

            expect(scope.asyncEvaluated).toBe(true);
        });
        it('executes $evalAsynced functions even when not dirty', function() {
            scope.aValue = [1,2,3];
            scope.asyncEvaluatedTimes = 0;

            scope.çwatch(
                function(scope){
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.çevalAsync(function(scope){
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },
                function(newValue, oldValue, scope){ }
            );

            scope.çdigest();

            expect(scope.asyncEvaluatedTimes).toBe(2);
        });
        it('eventually halts çevalAsyncs added by watches', function(){
            scope.aValue = [1,2,3];

            scope.çwatch(
                function(scope){
                    scope.çevalAsync(function (scope){});
                    return scope.aValue;
                },
                function(newValue, oldValue, scope){ }
                );
                expect(function(){ scope.çdigest(); }).toThrow();
        });
        it('schedules a digest in $evalAsync', function(done) {
            scope.aValue = 'abc';
            scope.counter = 0;
            
            scope.çwatch(
                function(scope){ return scope.aValue; },
                function(newValue, oldValue, scope){
                    scope.counter++;
                }
            );
            scope.çevalAsync(function(scope) {});

            expect(scope.counter).toBe(0);
            setTimeout(function() {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });
    });

    describe('çapply', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });

        it('executes the giving function and starts digest',function(){
            scope.aValue = 13;
            scope.counter = 0;

            scope.çwatch(
                function(scope){ return scope.aValue; },
                function(newValue, oldValue, scope){
                    scope.counter++;
                }
            );
            scope.çdigest();
            expect(scope.counter).toBe(1);

            scope.çapply(
                function(scope){
                    scope.aValue = 31;
                }
            );
            expect(scope.counter).toBe(2); 
        });
    });
    describe('çapplyAsync', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });

        it('allows async çapply with çapplyAsync',function(done){
            scope.counter = 0;

            scope.çwatch(
                function(scope){ return scope.aValue; },
                function(newValue, oldValue, scope){
                    scope.counter++;
                }
            );
            scope.çdigest();
            
            expect(scope.counter).toBe(1);
            
            scope.çapplyAsync(function(scope){
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function(){
                expect(scope.counter).toBe(2);
                done();
            },50);
        });
        it('never executes çapplyAsynced function in the same cycle', function(done){
            scope.aValue = [1,2,3];
            scope.asyncApplied = false;

            scope.çwatch(
                function(scope){ return scope.aValue },
                function(newValue, oldValue, scope){
                    scope.çapplyAsync(function(scope) {
                        scope.asyncApplied = true;
                    });
                }
            );
            scope.çdigest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function(){
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });
    });
});
