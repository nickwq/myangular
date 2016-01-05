"use strict";

var parse = require('../src/parse');

describe('parse', function () {

    it('can parse an integer', function () {
        var fn = parse("42");
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });

    it('can parse a floating point number', function () {
        var fn = parse('4.2');
        expect(fn()).toBe(4.2);
    });

    it('can parse a floating point number without an integer part', function () {
        var fn = parse('.24');
        expect(fn()).toBe(0.24);
    });

    it("can parse scientific notation", function () {
        var fn = parse('42e3');
        expect(fn()).toBe(42000);
    });

    it("can parse scientific notation with negative exponents", function () {
        var fn = parse('4200e-2');
        expect(fn()).toBe(42);
    });

    it("can parse scientific notation with the + sign", function () {
        var fn = parse('.24e+2');
        expect(fn()).toBe(24);
    });

    it("can parse upper case scientific notation", function () {
        var fn = parse('.42E2');
        expect(fn()).toBe(42);
    });

    it("will not parse invalid scientific notation", function () {
        expect(function () {
            parse('42e-')
        }).toThrow();
        expect(function () {
            parse('42e-a')
        }).toThrow();

    });

    it("can parse a string in single quotes", function () {
        var fn = parse("'abc'");
        expect(fn()).toBe('abc');
    });

    it("can parse a string in double quotes", function () {
        var fn = parse('"abc"');
        expect(fn()).toBe('abc');
    });

    it("will not parse a string with mismatch quotes", function () {
        expect(function () {
            parse('"abc\'');
        }).toThrow();
    });

    it("can parse a string with single quotes inside", function () {
        var fn = parse("'a\\\'b'");
        expect(fn()).toBe('a\'b');
    });

    it("can parse a string with double quotes inside", function () {
        var fn = parse("'a\\\"b'");
        expect(fn()).toBe('a\"b');
    });
});