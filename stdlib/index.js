const noop = () => {}
    //第一次调用有效
const once = f => (...args) => {
    if (f) {
        let r = f(...args)
        f = null
        return r
    }
}
class Asap {
    constructor() {
        this.asaps = []
        this._asaps = []
    }
    push(task) {
        this.asaps.push(task)
    }
    _push(task) {
        this._asaps.push(task)
    }
    run(task) {
        this.run = this.push
        if (task) this.asaps.push(task)
        Promise.resolve(this).then(_this => {
            _this.run = _this._push
            for (let i = 0, l = _this.asaps.length; i < l; i++) {
                _this.asaps[i]()
            }
            _this.asaps = _this._asaps
            _this._asaps = []
            delete _this.run;
            if (_this.asaps.length) {
                _this.run()
            }
        })
    }
}

const _asap = new Asap

function asap(task, defer) {
    _asap.run(task)
    return defer
}
exports.asap = asap;

function getError(msg) {
    return new Error(msg)
}
//在完成时返回数据的一类
function _result(f, aac, source) {
    return (n, c) => source(d => aac = f(aac, d), err => err ? c(err) : (n(aac), c()))
}
exports.pipe = (first, ...cbs) => cbs.reduce((aac, c) => c(aac), first);
//在pipe的基础上增加了start和stop方法，方便反复调用
exports.reusePipe = (...args) => {
    const subsribe = args.pop()
    const source = pipe(...args)
    return {
        start() {
            this.stop = once(subsribe(source))
        }
    }
}
exports.toPromise = n => source => new Promise((resolve, reject) => source(n, err => err ? reject(err) : resolve()))
    //SUBSCRIBER
exports.subscribe = (n, e = noop, c = noop) => source => source(n, once(err => err ? e(err) : c()))
const _subjectPrototype = {
    next: noop,
    complete: noop,
    error(err) {
        this.complete(err)
    },
    rx(n, c) {
        this.next = n
        this.complete = c
    }
}

//CREATION
exports.subject = source => {
    const _subject = Object.setPrototypeOf(exports.share((n, c) => _subject.rx(n, c)), _subjectPrototype)
    if (source) source(_subject.next, _subject.complete)
    return _subject
}

exports.fromArray = array => (n, c, pos = 0, l = array.length) =>
    asap(() => {
        while (pos < l) n(array[pos++])
        c()
    }, () => (pos = l, c = noop))


exports.of = (...items) => exports.fromArray(items)
exports.interval = period => n => {
    let i = 0;
    const id = setInterval(() => n(i++), period)
    return () => clearInterval(id)
}
exports.timer = (delay, period) => n => {
    let i = 0;
    let clear = clearTimeout
    let id = setTimeout(() => {
        clear = clearInterval
        id = setInterval(() => n(i++), period)
    }, delay)
    return () => clear(id)
}
exports.fromEventPattern = (add, remove) => n => asap(() => add(n), () => remove(n))
exports.fromEvent = (target, name) => typeof target.on == 'function' ? exports.fromEventPattern(handler => target.on(name, handler), handler => target.off(name, handler)) : exports.fromEventPattern(handler => target.addEventListener(name, handler), handler => target.removeEventListener(name, handler))
exports.range = (start, count) => (n, c, pos = start, end = count + start) => asap(() => {
    while (pos < end) n(pos++)
    c()
}, () => (pos = end, c = noop))

exports.fromPromise = source => (n, c) => {
    source.then(d => (c && n(d), c && c())).catch(e => c && c(e))
    return () => c = null
}
exports.fromIterable = source => (n, c) => {
    const iterator = source[Symbol.iterator]()
    let value, rv;
    let done = false;
    asap(() => {
        try {
            while (!done) {
                ({ value, done } = iterator.next(rv))
                rv = n(value)
            }
            c()
        } catch (e) {
            c(e)
        }
    })
    return () => (iterator.return(_), done = true, c = noop)
}
exports.from = source => {
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
}
exports.bindCallback = (call, thisArg, ...args) => (n, c) => asap(() => {
    const inArgs = args.concat((...rargs) => (c && n(rargs.length > 1 ? rargs : rargs[0]), c && c()));
    call.apply ? call.apply(thisArg, inArgs) : call(...inArgs)
}, () => c = null)
exports.bindNodeCallback = (call, thisArg, ...args) => (n, c) => asap(() => {
    const inArgs = args.concat((err, ...rargs) => (c && err && c(err)) || (c && n(rargs.length > 1 ? rargs : rargs[0]), c && c()));
    call.apply ? call.apply(thisArg, inArgs) : call(...inArgs)
}, () => c = null)
exports.never = n => noop
exports.throwError = e => (n, c) => (c(e), noop)
exports.empty = exports.throwError()

//COMBINATION
exports.iif = (condition, trueS, falseS) => (n, c) => condition() ? trueS(n, c) : falseS(n, c)
exports.race = (...sources) => (n, c) => {
    const close = () => defers.forEach(defer => defer())
    const _n = d => (close(), n(d), c())
    let nLife = sources.length;
    const _c = err => --nLife === 0 && c(err);
    const defers = sources.map(source => source(_n, _c))
    return close
}
exports.concat = (...sources) => (n, c, pos = 0, sdefer = noop, l = sources.length, f = err => err ? c(err) : pos < l ? sdefer = sources[pos++](n, f) : c()) => (f(), () => (pos = l, sdefer()))

exports.merge = (...sources) => (n, c) => {
    const nTotal = sources.length;
    let nLife = nTotal;
    const _c = err => --nLife === 0 && c();
    const defers = sources.forEach(source => source(n, _c))
    return () => defers.forEach(defer => defer())
}
exports.combineLatest = (...sources) => (n, c) => {
    const nTotal = sources.length;
    let nLife = nTotal
    let nRun = 0;
    let _c = err => (--nLife) === 0 && c(err);
    const array = new Array(nTotal)
    const _n = i => {
        const $n = d => {
            array[i] = d;
            if (nRun === nTotal) { //所有源都激活了，可以组织推送数据了，切换到第三状态
                n(array);
                __n = d => (array[i] = d, n(array));
            }
        }
        let __n = d => (++nRun, __n = $n, __n(d)); //第一次数据达到后激活,切换到第二状态
        return d => __n(d)
    }
    const defers = sources.forEach((source, i) => source(_n(i), _c))
    return () => defers.forEach(defer => defer())
}
exports.startWith = (...xs) => inputSource => (n, c, pos, defer = noop, l = xs.length) =>
    asap(() => {
        while (pos < l) n(xs[pos++])
        if (c) defer = inputSource(n, c)
    }, () => (pos = l, defer(), c = null))

exports.share = source => {
    let sourceDefer = noop;
    const ns = []
    const nc = []
    const next = d => ns.forEach(n => n(d))
    const complete = e => {
        nc.forEach(c => c(e))
        ns.length = nc.length = 0
        sourceDefer = noop
    }
    return (n, c) => {
        ns.push(n)
        nc.push(c)
        if (sourceDefer === noop) sourceDefer = source(next, complete)
        return () => {
            ns.splice(ns.indexOf(n), 1)
            nc.splice(nc.indexOf(c), 1)
            if (nc.length === 0) sourceDefer = (sourceDefer(), noop);
        }
    }
}

//FILTERING
exports.ignoreElements = source => (n, c) => source(noop, c)
exports.take = count => source => (n, c, _count = count) => {
    const defer = source(d => (n(d), --_count === 0 && (defer(), c())), c)
    return defer
}
exports.takeUntil = sSrc => src => (n, c) => {
    const ssd = sSrc(d => (sd(), ssd(), c()), noop)
    const sd = src(n, err => (ssd(), c(err)))
    return () => (ssd(), sd())
}
exports.takeWhile = f => source => (n, c) => {
    const defer = source(d => f(d) ? n(d) : (defer(), c()), c);
    return defer
}
exports.takeLast = count => source => _result((buffer, d) => {
    buffer.push(d)
    if (buffer.length > count) buffer.shift()
    return buffer
}, [], source)
exports.skip = count => source => (n, c) => {
    let _count = count;
    let _n = () => (--_count === 0 && (_n = n));
    return source(d => _n(d), c)
}
exports.skipUntil = sSrc => src => (n, c) => {
    let _n = noop
    const ssd = sSrc(d => ((_n = n), ssd()), noop)
    const sd = src(d => _n(d), err => (ssd(), c(err)))
    return () => (ssd(), sd())
}
exports.skipWhile = f => source => (n, c) => {
    let _n = d => (f(d) || (_n = n, n(d)));
    return source(d => _n(d), c)
}
const defaultThrottleConfig = { leading: true, trailing: false }

exports.throttle = (durationSelector, config = defaultThrottleConfig) => source => (n, c) => {
    let _throttled = false;
    let _defer = noop
    let last = null
    let hasValue = false;

    function send(d) {
        if (hasValue) {
            n(d)
            throttle(d)
        }
        hasValue = false
    }

    function throttleDone() {
        if (_throttled) _defer()
        _throttled = false
        if (config.trailing) {
            send(last, noop)
        }
    }
    const throttle = d => (_throttled = true, _defer = durationSelector(d)(throttleDone, throttleDone))
    const defer = source(d => {
        last = d
        hasValue = true
        if (!_throttled) {
            if (config.leading) send(d)
            else throttle(d)
        }
    }, err => err ? c(err) : (throttleDone(), c()))
    return () => (_defer(), defer())
}
const defaultAuditConfig = { leading: false, trailing: true }
exports.audit = durationSelector => exports.throttle(durationSelector, defaultAuditConfig)
exports.filter = f => source => (n, c) => source(d => f(d) && n(d), c)
exports.elementAt = (count, defaultValue) => source => (n, c, result = defaultValue, _count = count) => {
    const defer = source(d => _count-- === 0 && ((result = d), defer(), n(d), c()), err => err || last === void 0 && (err = getError('no elements in sequence')) ? c(err) : c());
    return defer
}
exports.find = f => source => exports.take(1)(exports.skipWhile(d => !f(d))(source))
exports.findIndex = f => source => (n, c, i = 0) => {
    const defer = source(d => f(d) ? (n(i++), defer(), c()) : ++i, c)
    return defer
}
exports.first = (condition = () => true, defaultValue) => source => (n, c, first = defaultValue, count = 0) => source(d => condition(d, count++) && (first = d) && (n(first), c()), err => err || first === void 0 && (err = getError('no elements in sequence')) ? c(err) : c())
exports.last = (condition = () => true, defaultValue) => source => (n, c, last = defaultValue, count = 0) => source(d => condition(d, count++) && (last = d), err => err || last === void 0 && (err = getError('no elements in sequence')) ? c(err) : (n(last), c()))

//MATHEMATICAL

exports.count = f => source => _result((i, d) => f(d) ? i++ : i, 0, source)
exports.max = source => _result((max, d) => !(d < max) ? d : max, NaN, source)
exports.min = source => _result((min, d) => !(d > min) ? d : min, NaN, source)
exports.reduce = (...args) => {
    const [reducer, seed] = args
    const hasSeed = args.length === 2
    return source => (n, c) => {
        const $n = d => $n.aac = reducer($n.aac, d)
        $n.aac = seed
        let _n = d => ($n.aac = d, _n = $n)
        return source(hasSeed ? $n : d => _n(d), err => err ? c(err) : (n($n.aac), c()))
    }
}

//TRANSFORMATION
exports.pluck = s => source => (n, c) => source(d => n(d[s]), c)
exports.repeat = count => source => (n, c, buffer = [], _count = count) => source(d => (buffer.push(d), n(d)), err => {
    if (err) c(err)
    else {
        const repeatSource = exports.fromArray(buffer)
        const again = () => --_count > 0 ? repeatSource(n, again) : c()
        again()
    }
})
exports.pairwise = source => (n, c, last, _n = d => (last = d, _n = d => (n([last, d]), last = d))) => source(d => _n(d), c)
exports.map = f => source => (n, c) => source(d => n(f(d)), c);
exports.switchMap = (makeSource, combineResults) => inputSource => (n, c) => {
    let currDisposable = null,
        sourceEnded = false,
        dispose = noop
    dispose = inputSource((d, s) =>
        currDisposable = (currDisposable && currDisposable(),
            makeSource(d)(combineResults ? $d => n(combineResults(d, $d)) : n,
                err => {
                    currDisposable = null;
                    if (sourceEnded) c(err)
                })),
        err => {
            sourceEnded = true
            if (!currDisposable) c(err);
        }
    )
    return () => {
        dispose()
        currDisposable = (currDisposable && currDisposable(), null)
    }
}
exports.switchMapTo = (innerSource, combineResults) => exports.switchMap(d => innerSource, combineResults)
exports.scan = (...args) => {
    const [reducer, seed] = args
    const hasSeed = args.length === 2
    return source => (n, c) => {
        const $n = d => n($n.aac = reducer($n.aac, d))
        $n.aac = seed
        let _n = d => (n($n.aac = d), _n = $n)
        return source(hasSeed ? $n : d => _n(d), c)
    }
}
exports.bufferTime = miniseconds => source => (n, c) => {
    const buffer = []
    const id = setInterval(() => (n(buffer.concat()), buffer.length = 0), miniseconds)
    const defer = source(d => buffer.push(d), err => {
        clearInterval(id)
        if (!err) n(buffer)
        c(err)
    })
    return () => (clearInterval(id), defer())
}

// UTILITY 
exports.tap = f => source => (n, c) => source(d => (f(d), n(d)), c);
exports.delay = delay => source => (n, c) => {
    let defer = () => clearTimeout(id)
    const id = setTimeout(() => defer = source(n, c), delay)
    return () => defer()
}