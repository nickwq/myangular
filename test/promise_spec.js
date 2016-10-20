var Promise = require('../src/promise');

describe('Promise', function () {

    var promise;
    var onSucceed = function(resolve) { resolve(10);};
    beforeEach(function () {
        promise = new Promise(onSucceed);
    });

    it('should call the callback function when then function is called', function (done) {
        var spy = jasmine.createSpy();
        promise.then(spy);
        setTimeout(function () {
            expect(spy).toHaveBeenCalledWith(10);
            done();
        }, 50);
    });
});