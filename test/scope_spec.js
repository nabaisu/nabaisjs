'use strict';

var Scope = require('../src/scope');

describe('Scope', function() {

    it('can be contructed and used as an object', function() {
        var scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

    describe('digest', function(){
        beforeEach(function(){
            var scope = new Scope();
        });

        it('calls the listener function of a watch on first ãdigest', function(){
            var watchFn = function() { return 'wat';};
            var listenerFn = jasmine.createSpy();
            scope.ãwatch(watchFn, listenerFn);

            scope.ãdigest();

            expect(listenerFn).toHaveBeenCalled();
        })
    })
});