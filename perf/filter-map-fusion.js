var Benchmark = require('benchmark');
var callbagX = require('../highlib');
var callbag = require('callbag-basics')
var xs = require('xstream').default;
var most = require('most');
var rxOp = require('rxjs/operators');
var rxjs = require('rxjs')
var kefir = require('kefir');
var bacon = require('baconjs');
var lodash = require('lodash');
var highland = require('highland');

var runners = require('./runners');
var fromArray = require('./callbag-listenable-array');
var kefirFromArray = runners.kefirFromArray;

// Create a stream from an Array of n integers
// filter out odds, map remaining evens by adding 1, then reduce by summing
var n = runners.getIntArg(1000000);
var a = new Array(n);
for (var i = 0; i < a.length; ++i) {
    a[i] = i;
}

var suite = Benchmark.Suite('filter -> map -> fusion ' + n + ' integers');
var options = {
    defer: true,
    onError: function(e) {
        e.currentTarget.failure = e.error;
    }
};

suite.add('rxlite', function(deferred) {
        runners.runCallbagX(deferred,
            callbagX.pipe(
                callbagX.fromArray(a),
                callbagX.map(add1),
                callbagX.filter(odd),
                callbagX.map(add1),
                callbagX.map(add1),
                callbagX.filter(even),
                callbagX.scan(sum, 0)
            )
        );
    }, options)
    .add('cb-basics', function(deferred) {
        runners.runCallbag(deferred,
            callbag.pipe(
                fromArray(a),
                callbag.map(add1),
                callbag.filter(odd),
                callbag.map(add1),
                callbag.map(add1),
                callbag.filter(even),
                callbag.scan(sum, 0)
            )
        );
    }, options)
    .add('xstream', function(deferred) {
        runners.runXStream(deferred,
            xs.fromArray(a).map(add1).filter(odd).map(add1).map(add1).filter(even).fold(sum, 0).last());
    }, options)
    .add('most', function(deferred) {
        runners.runMost(deferred, most.from(a).map(add1).filter(odd).map(add1).map(add1).filter(even).reduce(sum, 0));
    }, options)
    .add('rx 6', function(deferred) {
        runners.runRx6(deferred,
            rxjs.from(a).pipe(
                rxOp.map(add1),
                rxOp.filter(odd),
                rxOp.map(add1),
                rxOp.map(add1),
                rxOp.filter(even),
                rxOp.scan(sum, 0))
        )
    }, options)
    .add('kefir', function(deferred) {
        runners.runKefir(deferred, kefirFromArray(a).map(add1).filter(odd).map(add1).map(add1).filter(even).scan(sum, 0).last());
    }, options)
    .add('highland', function(deferred) {
        runners.runHighland(deferred, highland(a).map(add1).filter(odd).map(add1).map(add1).filter(even).reduce(0, sum));
    }, options)
    .add('lodash', function() {
        return lodash(a).map(add1).filter(odd).map(add1).map(add1).filter(even).reduce(sum, 0);
    })
    .add('Array', function() {
        return a.map(add1).filter(odd).map(add1).map(add1).filter(even).reduce(sum, 0);
    })

runners.runSuite(suite);

function add1(x) {
    return x + 1;
}

function even(x) {
    return x % 2 === 0;
}

function odd(x) {
    return x % 2 !== 0;
}

function sum(x, y) {
    return x + y;
}