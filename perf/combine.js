var Benchmark = require('benchmark');
var callbag = require('callbag-basics');
var callbagX = require('../highlib')
var xs = require('xstream').default;
var most = require('most');
var rxjs = require('rxjs')
var rxjsOperators = require('rxjs/operators')
var kefir = require('kefir');
var bacon = require('baconjs');
var lodash = require('lodash');

var runners = require('./runners');
var fromArray = require('./callbag-listenable-array');
var kefirFromArray = runners.kefirFromArray;

// Create a stream from an Array of n integers
// filter out odds, map remaining evens by adding 1, then reduce by summing
var n = runners.getIntArg(500000);
var a = new Array(n);
for (var i = 0; i < a.length; ++i) {
    a[i] = i;
}

var suite = Benchmark.Suite('combine(add3) -> filter ' + n + ' x 3 integers');
var options = {
    defer: true,
    onError: function(e) {
        e.currentTarget.failure = e.error;
    }
};

function add3(a, b, c) {
    return a + b + c;
}

function add3Arr(arr) {
    return arr[0] + arr[1] + arr[2];
}

var cbag1 = fromArray(a);
var cbag2 = fromArray(a);
var cbag3 = fromArray(a);

var cbagX1 = callbagX.fromArray(a);
var cbagX2 = callbagX.fromArray(a);
var cbagX3 = callbagX.fromArray(a);

var xs1 = xs.fromArray(a);
var xs2 = xs.fromArray(a);
var xs3 = xs.fromArray(a);

var m1 = most.from(a);
var m2 = most.from(a);
var m3 = most.from(a);

var rx1 = rxjs.from(a);
var rx2 = rxjs.from(a);
var rx3 = rxjs.from(a);

suite.add('rxlite', function(deferred) {
        runners.runCallbagX(deferred, callbagX.pipe(
            callbagX.combineLatest(cbagX1, cbagX2, cbagX3),
            callbagX.map(add3Arr),
            callbagX.filter(even)))
    }, options)
    .add('cb-basics', function(deferred) {
        runners.runCallbag(deferred,
            callbag.pipe(
                callbag.combine(cbag1, cbag2, cbag3),
                callbag.map(add3Arr),
                callbag.filter(even)
            )
        );
    }, options)
    .add('xstream', function(deferred) {
        runners.runXStream(deferred,
            xs.combine(xs1, xs2, xs3).map(add3Arr).filter(even));
    }, options)
    .add('most', function(deferred) {
        runners.runMost(deferred,
            most.combineArray(add3, [m1, m2, m3]).filter(even).drain());
    }, options)
    .add('rx 6', function(deferred) {
        runners.runRx6(deferred,
            rxjs.combineLatest(rx1, rx2, rx3).pipe(rxjsOperators.map(add3Arr), rxjsOperators.filter(even)));
    }, options)

runners.runSuite(suite);

function add1(x) {
    return x + 1;
}

function even(x) {
    return x % 2 === 0;
}

function sum(x, y) {
    return x + y;
}