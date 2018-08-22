(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

    var noop = function () {};
        //第一次调用有效
    var once = function (f) { return function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        if (f) {
            var r = f.apply(void 0, args);
            f = null;
            return r
        }
    }; };
    var Asap = function Asap() {
        this.asaps = [];
        this._asaps = [];
    };
    Asap.prototype.push = function push (task) {
        this.asaps.push(task);
    };
    Asap.prototype._push = function _push (task) {
        this._asaps.push(task);
    };
    Asap.prototype.run = function run (task) {
        this.run = this.push;
        if (task) { this.asaps.push(task); }
        Promise.resolve(this).then(function (_this) {
            _this.run = _this._push;
            for (var i = 0, l = _this.asaps.length; i < l; i++) {
                _this.asaps[i]();
            }
            _this.asaps = _this._asaps;
            _this._asaps = [];
            delete _this.run;
            if (_this.asaps.length) {
                _this.run();
            }
        });
    };

    var _asap = new Asap;

    function asap(task, defer) {
        _asap.run(task);
        return defer
    }
    exports.asap = asap;

    function getError(msg) {
        return new Error(msg)
    }
    //在完成时返回数据的一类
    function _result(f, aac, source) {
        return function (n, c) { return source(function (d) { return aac = f(aac, d); }, function (err) { return err ? c(err) : (n(aac), c()); }); }
    }
    exports.pipe = function (first) {
        var cbs = [], len = arguments.length - 1;
        while ( len-- > 0 ) cbs[ len ] = arguments[ len + 1 ];

        return cbs.reduce(function (aac, c) { return c(aac); }, first);
    };
    //在pipe的基础上增加了start和stop方法，方便反复调用
    exports.reusePipe = function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        var subsribe = args.pop();
        var source = pipe.apply(void 0, args);
        return {
            start: function start() {
                this.stop = once(subsribe(source));
            }
        }
    };

    //SUBSCRIBER
    exports.subscribe = function (n, e, c) {
        if ( e === void 0 ) e = noop;
        if ( c === void 0 ) c = noop;

        return function (source) { return source(n, once(function (err) { return err ? e(err) : c(); })); };
    };

    //CREATION
    exports.subject = function () {
        var next = noop;
        var complete = noop;
        var _subject = exports.share(function (n, c) {
            next = n;
            complete = c;
        });
        _subject.next = function (d) { return next(d, noop); };
        _subject.complete = function () { return complete(); };
        _subject.error = function (err) { return complete(err); };
        return _subject
    };

    exports.fromArray = function (array) { return function (n, c, pos, l) {
            if ( pos === void 0 ) pos = 0;
            if ( l === void 0 ) l = array.length;

            return asap(function () {
            while (pos < l) { n(array[pos++]); }
            c();
        }, function () { return (pos = l, c = noop); });
     }    };


    exports.of = function () {
        var items = [], len = arguments.length;
        while ( len-- ) items[ len ] = arguments[ len ];

        return exports.fromArray(items);
    };
    exports.interval = function (period) { return function (n) {
        var i = 0;
        var id = setInterval(function () { return n(i++); }, period);
        return function () { return clearInterval(id); }
    }; };
    exports.timer = function (delay, period) { return function (n) {
        var i = 0;
        var clear = clearTimeout;
        var id = setTimeout(function () {
            clear = clearInterval;
            id = setInterval(function () { return n(i++); }, period);
        }, delay);
        return function () { return clear(id); }
    }; };
    exports.fromEventPattern = function (add, remove) { return function (n) { return asap(function () { return add(n); }, function () { return remove(n); }); }; };
    exports.fromEvent = function (target, name) { return typeof target.on == 'function' ? exports.fromEventPattern(function (handler) { return target.on(name, handler); }, function (handler) { return target.off(name, handler); }) : exports.fromEventPattern(function (handler) { return target.addEventListener(name, handler); }, function (handler) { return target.removeEventListener(name, handler); }); };
    exports.range = function (start, count) { return function (n, c, pos, end) {
        if ( pos === void 0 ) pos = start;
        if ( end === void 0 ) end = count + start;

        return asap(function () {
        while (pos < end) { n(pos++); }
        c();
    }, function () { return (pos = end, c = noop); });
     }    };

    exports.fromPromise = function (source) { return function (n, c) {
        source.then(function (d) { return (c && n(d), c && c()); }).catch(function (e) { return c && c(e); });
        return function () { return c = null; }
    }; };
    exports.fromIterable = function (source) { return function (n, c) {
        var iterator = source[Symbol.iterator]();
        var value, rv;
        var done = false;
        asap(function () {
            var assign;

            try {
                while (!done) {
                    ((assign = iterator.next(rv), value = assign.value, done = assign.done));
                    rv = n(value);
                }
                c();
            } catch (e) {
                c(e);
            }
        });
        return function () { return (iterator.return(_), done = true, c = noop); }
    }; };
    exports.from = function (source) {
        switch (true) {
            case source instanceof Array:
                return exports.fromArray(source)
            case source instanceof Promise:
                return exports.fromPromise(source)
            case source[Symbol.iterator] && typeof source[Symbol.iterator] === 'function':
                return exports.fromIterable(source)
            default:
                return exports.of(source)
        }
    };
    exports.bindCallback = function (call, thisArg) {
        var args = [], len = arguments.length - 2;
        while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

        return function (n, c) { return asap(function () {
        var inArgs = args.concat(function () {
            var rargs = [], len = arguments.length;
            while ( len-- ) rargs[ len ] = arguments[ len ];

            return (c && n(rargs.length > 1 ? rargs : rargs[0]), c && c());
        });
        call.apply ? call.apply(thisArg, inArgs) : call.apply(void 0, inArgs);
    }, function () { return c = null; }); };
    };
    exports.bindNodeCallback = function (call, thisArg) {
        var args = [], len = arguments.length - 2;
        while ( len-- > 0 ) args[ len ] = arguments[ len + 2 ];

        return function (n, c) { return asap(function () {
        var inArgs = args.concat(function (err) {
            var rargs = [], len = arguments.length - 1;
            while ( len-- > 0 ) rargs[ len ] = arguments[ len + 1 ];

            return (c && err && c(err)) || (c && n(rargs.length > 1 ? rargs : rargs[0]), c && c());
        });
        call.apply ? call.apply(thisArg, inArgs) : call.apply(void 0, inArgs);
    }, function () { return c = null; }); };
    };
    exports.never = function (n) { return noop; };
    exports.throwError = function (e) { return function (n, c) { return (c(e), noop); }; };
    exports.empty = exports.throwError();

    //COMBINATION
    exports.iif = function (condition, trueS, falseS) { return function (n, c) { return condition() ? trueS(n, c) : falseS(n, c); }; };
    exports.race = function () {
        var sources = [], len = arguments.length;
        while ( len-- ) sources[ len ] = arguments[ len ];

        return function (n, c) {
        var close = function () { return defers.forEach(function (defer) { return defer(); }); };
        var _n = function (d) { return (close(), n(d), c()); };
        var nLife = sources.length;
        var _c = function (err) { return --nLife === 0 && c(err); };
        var defers = sources.map(function (source) { return source(_n, _c); });
        return close
    };
    };
    exports.concat = function () {
        var sources = [], len = arguments.length;
        while ( len-- ) sources[ len ] = arguments[ len ];

        return function (n, c, pos, sdefer, l, f) {
        if ( pos === void 0 ) pos = 0;
        if ( sdefer === void 0 ) sdefer = noop;
        if ( l === void 0 ) l = sources.length;
        if ( f === void 0 ) f = function (err) { return err ? c(err) : pos < l ? sdefer = sources[pos++](n, f) : c(); };

        return (f(), function () { return (pos = l, sdefer()); });
    }    };

    exports.merge = function () {
        var sources = [], len = arguments.length;
        while ( len-- ) sources[ len ] = arguments[ len ];

        return function (n, c) {
        var nTotal = sources.length;
        var nLife = nTotal;
        var _c = function (err) { return --nLife === 0 && c(); };
        var defers = sources.forEach(function (source) { return source(n, _c); });
        return function () { return defers.forEach(function (defer) { return defer(); }); }
    };
    };
    exports.combineLatest = function () {
        var sources = [], len = arguments.length;
        while ( len-- ) sources[ len ] = arguments[ len ];

        return function (n, c) {
        var nTotal = sources.length;
        var nLife = nTotal;
        var nRun = 0;
        var _c = function (err) { return (--nLife) === 0 && c(err); };
        var array = new Array(nTotal);
        var _n = function (i) {
            var $n = function (d) {
                array[i] = d;
                if (nRun === nTotal) { //所有源都激活了，可以组织推送数据了，切换到第三状态
                    n(array);
                    __n = function (d) { return (array[i] = d, n(array)); };
                }
            };
            var __n = function (d) { return (++nRun, __n = $n, __n(d)); }; //第一次数据达到后激活,切换到第二状态
            return function (d) { return __n(d); }
        };
        var defers = sources.forEach(function (source, i) { return source(_n(i), _c); });
        return function () { return defers.forEach(function (defer) { return defer(); }); }
    };
    };
    exports.startWith = function () {
        var xs = [], len = arguments.length;
        while ( len-- ) xs[ len ] = arguments[ len ];

        return function (inputSource) { return function (n, c, pos, defer, l) {
            if ( defer === void 0 ) defer = noop;
            if ( l === void 0 ) l = xs.length;

            return asap(function () {
            while (pos < l) { n(xs[pos++]); }
            if (c) { defer = inputSource(n, c); }
        }, function () { return (pos = l, defer(), c = null); });
     };
    }    };

    exports.share = function (source) {
        var sourceDefer = noop;
        var ns = [];
        var nc = [];
        var next = function (d) { return ns.forEach(function (n) { return n(d); }); };
        var complete = function (e) {
            nc.forEach(function (c) { return c(e); });
            ns.length = nc.length = 0;
            sourceDefer = noop;
        };
        return function (n, c) {
            ns.push(n);
            nc.push(c);
            if (sourceDefer === noop) { sourceDefer = source(next, complete); }
            return function () {
                ns.splice(ns.indexOf(n), 1);
                nc.splice(nc.indexOf(c), 1);
                if (nc.length === 0) { sourceDefer = (sourceDefer(), noop); }
            }
        }
    };

    //FILTERING
    exports.ignoreElements = function (source) { return function (n, c) { return source(noop, c); }; };
    exports.take = function (count) { return function (source) { return function (n, c, _count) {
        if ( _count === void 0 ) _count = count;

        var defer = source(function (d) { return (n(d), --_count === 0 && (defer(), c())); }, c);
        return defer
    }; }; };
    exports.takeUntil = function (sSrc) { return function (src) { return function (n, c) {
        var ssd = sSrc(function (d) { return (sd(), ssd(), c()); }, noop);
        var sd = src(n, function (err) { return (ssd(), c(err)); });
        return function () { return (ssd(), sd()); }
    }; }; };
    exports.takeWhile = function (f) { return function (source) { return function (n, c) {
        var defer = source(function (d) { return f(d) ? n(d) : (defer(), c()); }, c);
        return defer
    }; }; };
    exports.takeLast = function (count) { return function (source) { return _result(function (buffer, d) {
        buffer.push(d);
        if (buffer.length > count) { buffer.shift(); }
        return buffer
    }, [], source); }; };
    exports.skip = function (count) { return function (source) { return function (n, c) {
        var _count = count;
        var _n = function () { return (--_count === 0 && (_n = n)); };
        return source(function (d) { return _n(d); }, c)
    }; }; };
    exports.skipUntil = function (sSrc) { return function (src) { return function (n, c) {
        var _n = noop;
        var ssd = sSrc(function (d) { return ((_n = n), ssd()); }, noop);
        var sd = src(function (d) { return _n(d); }, function (err) { return (ssd(), c(err)); });
        return function () { return (ssd(), sd()); }
    }; }; };
    exports.skipWhile = function (f) { return function (source) { return function (n, c) {
        var _n = function (d) { return (f(d) || (_n = n, n(d))); };
        return source(function (d) { return _n(d); }, c)
    }; }; };
    var defaultThrottleConfig = { leading: true, trailing: false };

    exports.throttle = function (durationSelector, config) {
        if ( config === void 0 ) config = defaultThrottleConfig;

        return function (source) { return function (n, c) {
        var _throttled = false;
        var _defer = noop;
        var last = null;
        var hasValue = false;

        function send(d) {
            if (hasValue) {
                n(d);
                throttle(d);
            }
            hasValue = false;
        }

        function throttleDone() {
            if (_throttled) { _defer(); }
            _throttled = false;
            if (config.trailing) {
                send(last, noop);
            }
        }
        var throttle = function (d) { return (_throttled = true, _defer = durationSelector(d)(throttleDone, throttleDone)); };
        var defer = source(function (d) {
            last = d;
            hasValue = true;
            if (!_throttled) {
                if (config.leading) { send(d); }
                else { throttle(d); }
            }
        }, function (err) { return err ? c(err) : (throttleDone(), c()); });
        return function () { return (_defer(), defer()); }
    }; };
    };
    var defaultAuditConfig = { leading: false, trailing: true };
    exports.audit = function (durationSelector) { return exports.throttle(durationSelector, defaultAuditConfig); };
    exports.filter = function (f) { return function (source) { return function (n, c) { return source(function (d) { return f(d) && n(d); }, c); }; }; };
    exports.elementAt = function (count, defaultValue) { return function (source) { return function (n, c, result, _count) {
        if ( result === void 0 ) result = defaultValue;
        if ( _count === void 0 ) _count = count;

        var defer = source(function (d) { return _count-- === 0 && ((result = d), defer(), n(d), c()); }, function (err) { return err || last === void 0 && (err = getError('no elements in sequence')) ? c(err) : c(); });
        return defer
    }; }; };
    exports.find = function (f) { return function (source) { return exports.take(1)(exports.skipWhile(function (d) { return !f(d); })(source)); }; };
    exports.findIndex = function (f) { return function (source) { return function (n, c, i) {
        if ( i === void 0 ) i = 0;

        var defer = source(function (d) { return f(d) ? (n(i++), defer(), c()) : ++i; }, c);
        return defer
    }; }; };
    exports.first = function (condition, defaultValue) {
        if ( condition === void 0 ) condition = function () { return true; };

        return function (source) { return function (n, c, first, count) {
        if ( first === void 0 ) first = defaultValue;
        if ( count === void 0 ) count = 0;

        return source(function (d) { return condition(d, count++) && (first = d) && (n(first), c()); }, function (err) { return err || first === void 0 && (err = getError('no elements in sequence')) ? c(err) : c(); });
     };
    }    };
    exports.last = function (condition, defaultValue) {
        if ( condition === void 0 ) condition = function () { return true; };

        return function (source) { return function (n, c, last, count) {
        if ( last === void 0 ) last = defaultValue;
        if ( count === void 0 ) count = 0;

        return source(function (d) { return condition(d, count++) && (last = d); }, function (err) { return err || last === void 0 && (err = getError('no elements in sequence')) ? c(err) : (n(last), c()); });
     };
    }    };

    //MATHEMATICAL

    exports.count = function (f) { return function (source) { return _result(function (i, d) { return f(d) ? i++ : i; }, 0, source); }; };
    exports.max = function (source) { return _result(function (max, d) { return !(d < max) ? d : max; }, NaN, source); };
    exports.min = function (source) { return _result(function (min, d) { return !(d > min) ? d : min; }, NaN, source); };
    exports.reduce = function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        return function (source) { return _result(function (acc, d) { return d; }, void 0, exports.scan.apply(exports, args)(source)); };
    };

    //TRANSFORMATION
    exports.pluck = function (s) { return function (source) { return function (n, c) { return source(function (d) { return n(d[s]); }, c); }; }; };
    exports.repeat = function (count) { return function (source) { return function (n, c, buffer, _count) {
        if ( buffer === void 0 ) buffer = [];
        if ( _count === void 0 ) _count = count;

        return source(function (d) { return (buffer.push(d), n(d)); }, function (err) {
        if (err) { c(err); }
        else {
            var repeatSource = exports.fromArray(buffer);
            var again = function () { return --_count > 0 ? repeatSource(n, again) : c(); };
            again();
        }
    });
     }; }    };
    exports.pairwise = function (source) { return function (n, c, last, _n) {
        if ( _n === void 0 ) _n = function (d) { return (last = d, _n = function (d) { return (n([last, d]), last = d); }); };

        return source(function (d) { return _n(d); }, c);
     }    };
    exports.map = function (f) { return function (source) { return function (n, c) { return source(function (d) { return n(f(d)); }, c); }; }; };
    exports.switchMap = function (makeSource, combineResults) { return function (inputSource) { return function (n, c) {
        var currDisposable = null,
            sourceEnded = false,
            dispose = noop;
        dispose = inputSource(function (d, s) { return currDisposable = (currDisposable && currDisposable(),
                makeSource(d)(combineResults ? function ($d) { return n(combineResults(d, $d)); } : n,
                    function (err) {
                        currDisposable = null;
                        if (sourceEnded) { c(err); }
                    })); },
            function (err) {
                sourceEnded = true;
                if (!currDisposable) { c(err); }
            }
        );
        return function () {
            dispose();
            currDisposable = (currDisposable && currDisposable(), null);
        }
    }; }; };
    exports.switchMapTo = function (innerSource, combineResults) { return exports.switchMap(function (d) { return innerSource; }, combineResults); };
    exports.scan = function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        var reducer = args[0];
        var seed = args[1];
        var hasSeed = args.length === 2;
        return function (source) { return function (n, c) {
            var aac = seed;
            var $n = function (d) { return n(aac = reducer(aac, d)); };
            var _n = function (d) { return (n(aac = d), _n = $n); };
            return source(hasSeed ? $n : function (d) { return _n(d); }, c)
        }; }
    };
    exports.bufferTime = function (miniseconds) { return function (source) { return function (n, c) {
        var buffer = [];
        var id = setInterval(function () { return (n(buffer.concat()), buffer.length = 0); }, miniseconds);
        var defer = source(function (d) { return buffer.push(d); }, function (err) {
            clearInterval(id);
            if (!err) { n(buffer, close); }
            c(err);
        });
        return function () { return (clearInterval(id), defer()); }
    }; }; };

    // UTILITY 
    exports.tap = function (f) { return function (source) { return function (n, c) { return source(function (d) { return (f(d), n(d)); }, c); }; }; };
    exports.delay = function (delay) { return function (source) { return function (n, c) {
        var defer = function () { return clearTimeout(id); };
        var id = setTimeout(function () { return defer = source(n, c); }, delay);
        return function () { return defer(); }
    }; }; };

})));
//# sourceMappingURL=rxlite.js.map
