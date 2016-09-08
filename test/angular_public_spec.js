"use strict";

var publishExternalAPI = require('../src/angular_public');

describe('angular public', function () {
    it('sets up the angular object and the module loader', function() {
        publishExternalAPI();

        expect(window.angular).toBeDefined();
        expect(window.angular.module).toBeDefined();
    });

});