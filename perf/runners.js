var kefir = require('kefir');
const inspector = require('inspector');
const fs = require('fs');
const session = new inspector.Session();
session.connect();
kefir.DEPRECATION_WARNINGS = false;

exports.runSuite = runSuite;
exports.runRx6 = runRx6;
exports.runMost = runMost;
exports.runCallbag = runCallbag;
exports.runCallbagX = runCallbagX;
exports.runXStream = runXStream;
exports.runKefir = runKefir;
exports.kefirFromArray = kefirFromArray;
exports.runBacon = runBacon;
exports.runHighland = runHighland;

exports.getIntArg = getIntArg;
exports.getIntArg2 = getIntArg2;
exports.logResults = logResults;

function noop() {}

function _getIntArg(defaultValue, index) {
    var n = parseInt(process.argv[index]);
    return isNaN(n) ? defaultValue : n;
}

function getIntArg(defaultValue) {
    return _getIntArg(defaultValue, process.argv.length - 1);
}

function getIntArg2(default1, default2) {
    var m = _getIntArg(default1, process.argv.length - 2);
    var n = _getIntArg(default2, process.argv.length - 1);
    return [m, n];
}

function logResults(e) {
    var t = e.target;

    if (t.failure) {
        console.error(padl(10, t.name) + 'FAILED: ' + e.target.failure);
    } else {
        var result = padl(10, t.name) +
            padr(13, t.hz.toFixed(2) + ' op/s') +
            ' \xb1' + padr(7, t.stats.rme.toFixed(2) + '%') +
            padr(15, ' (' + t.stats.sample.length + ' samples)');

        console.log(result);
    }
}


function logStart() {
    console.log(this.name);
    console.log('-----------------------------------------------');
    session.post('Profiler.enable', () => {
        session.post('Profiler.start', () => {
          // invoke business logic under measurement here...
      
        });
      });
}

function logComplete() {
    console.log('-----------------------------------------------');
     // some time later...
     session.post('Profiler.stop', (err, { profile }) => {
        // write profile to disk, upload, etc.
        if (!err) {
          fs.writeFileSync('./profile.cpuprofile', JSON.stringify(profile));
        }
      });
}

function runSuite(suite) {
    return suite
        .on('start', logStart)
        .on('cycle', logResults)
        .on('complete', logComplete)
        .run();
}

function runMost(deferred, mostPromise) {
    mostPromise.then(function() {
        deferred.resolve();
    }, function(e) {
        deferred.benchmark.emit({ type: 'error', error: e });
        deferred.resolve(e);
    });
}

function runCallbagX(deferred, rxStream) {
    require('../highlib').subscribe(noop, error => {
            deferred.benchmark.emit({ type: 'error', error });
            deferred.resolve(error);
        }, () => {
            deferred.resolve();
        })(rxStream)
        // rxStream(noop, error => {
        //     if (error) {
        //         deferred.benchmark.emit({ type: 'error', error });
        //         deferred.resolve(e);
        //     } else {
        //         deferred.resolve();
        //     }
        // })
}

function runRx6(deferred, rxStream) {
    rxStream.subscribe(
        noop,
        function(e) {
            deferred.benchmark.emit({ type: 'error', error: e });
            deferred.resolve(e);
        },
        function() {
            deferred.resolve();
        }
    );
}

function runXStream(deferred, xstream) {
    xstream.addListener({
        next: noop,
        complete: function() {
            deferred.resolve();
        },
        error: function(e) {
            deferred.benchmark.emit({ type: 'error', error: e });
            deferred.resolve(e);
        }
    });
}

function runCallbag(deferred, source) {
    function sink(t, d) {
        if (t === 2 && !d) {
            deferred.resolve();
        } else if (t === 2) {
            deferred.benchmark.emit({ type: 'error', error: e });
            deferred.resolve(e);
        }
    }
    source(0, sink);
}

function runKefir(deferred, kefirStream) {
    kefirStream.onValue(noop);
    kefirStream.onEnd(function() {
        deferred.resolve();
    });
}

function kefirFromArray(array) {
    return kefir.stream(function(emitter) {
        for (var i = 0; i < array.length; ++i) {
            emitter.emit(array[i]);
        }
        emitter.end();
    });
}

function runBacon(deferred, baconStream) {
    try {
        baconStream.onValue(noop);
        baconStream.onEnd(function() {
            deferred.resolve();
        });
        baconStream.onError(function(e) {
            deferred.benchmark.emit({ type: 'error', error: e });
            deferred.resolve(e);
        });
    } catch (e) {
        deferred.benchmark.emit({ type: 'error', error: e });
        deferred.resolve(e);
    }
}

// Using pull() seems to give the fastest results for highland,
// but will only work for test runs that reduce a stream to a
// single value.
function runHighland(deferred, highlandStream) {
    highlandStream.pull(function(err, z) {
        if (err) {
            deferred.reject(err);
            return;
        }

        deferred.resolve(z);
    });
}

function padl(n, s) {
    while (s.length < n) {
        s += ' ';
    }
    return s;
}

function padr(n, s) {
    while (s.length < n) {
        s = ' ' + s;
    }
    return s;
}