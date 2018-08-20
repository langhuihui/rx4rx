const noop = () => {}
    //第一次调用有效
const once = f => (...args) => {
    if (f) {
        let r = f(...args)
        f = null
        return r
    }
}

function getError(msg) {
    return new Error(msg)
}
//在完成时返回数据的一类
function _result(f, aac, source) {
    return source(d => aac = f(aac, d), err ? c(err) : (n(aac, noop), c()))
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

//SUBSCRIBER
exports.subscribe = (n, e = noop, c = noop) => source => source(n, once(err => err ? e(err) : c()))

//CREATION
exports.subject = () => {
    let next = noop;
    let complete = noop;
    const _subject = exports.share((n, c) => {
        next = n;
        complete = c
    })
    _subject.next = d => next(d, noop)
    _subject.complete = () => complete()
    _subject.error = err => complete(err)
    return _subject
}

exports.fromArray = array => (n, c, pos = 0, l = array.length) => {
    const close = () => (pos = l, c = noop);
    while (pos < l) n(array[pos++], close)
    c()
    return close;
}

exports.of = (...items) => exports.fromArray(items)
exports.interval = period => n => {
    let i = 0;
    const close = () => clearInterval(id)
    const id = setInterval(() => n(i++, close), period)
    return close
}
exports.timer = (delay, period) => n => {
    let i = 0;
    let clear = clearTimeout
    const close = () => clear(id)
    let id = setTimeout(() => {
        clear = clearInterval
        id = setInterval(() => n(i++, close), period)
    }, delay)
    return close
}
exports.fromEventPattern = (add, remove) => n => {
    const handler = event => n(event, close)
    const close = () => remove(handler)
    add(handler)
    return close
}
exports.fromEvent = (target, name) => typeof target.on == 'function' ? exports.fromEventPattern(handler => target.on(name, handler), handler => target.off(name, handler)) : exports.fromEventPattern(handler => target.addEventListener(name, handler), handler => target.removeEventListener(name, handler))
exports.range = (start, count) => (n, c, pos = start, end = count + start) => {
    const close = () => c = null;
    while (c && pos < end) n(pos++, close)
    c && c()
    return close
}

exports.fromPromise = source => (n, c) => {
    const close = () => c = null
    source.then(d => (c && n(d, close), c && c())).catch(e => c && c(e))
    return close
}
exports.fromIterable = source => (n, c) => {
    const iterator = source[Symbol.iterator]()
    let value, rv;
    let done = false;
    const close = () => (iterator.return(_), done = true, c = noop)
    try {
        while (!done) {
            ({ value, done } = iterator.next(rv))
            rv = n(value, close)
        }
        c()
    } catch (e) {
        c(e)
    }
    return close
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
exports.bindCallback = (call, thisArg, ...args) => (n, c) => {
    const close = () => c = null
    const inArgs = args.concat((...rargs) => (c && n(rargs.length > 1 ? rargs : rargs[0], close), c && c()));
    call.apply ? call.apply(thisArg, inArgs) : call(...inArgs)
    return close
}
exports.bindNodeCallback = (call, thisArg, ...args) => (n, c) => {
    const close = () => c = null
    const inArgs = args.concat((err, ...rargs) => (c && err && c(err)) || (c && n(rargs.length > 1 ? rargs : rargs[0], close), c && c()));
    call.apply ? call.apply(thisArg, inArgs) : call(...inArgs)
    return close
}

exports.never = n => noop
exports.throwError = e => (n, c) => (c(e), noop)
exports.empty = exports.throwError()

//COMBINATION
exports.iif = (condition, trueS, falseS) => (n, c) => condition() ? trueS(n, c) : falseS(n, c)
exports.race = (...sources) => (n, c) => {
    const close = () => defers.forEach(defer => defer())
    const _n = d => (close(), n(d, () => c = noop), c())
    let nLife = sources.length;
    const _c = err => --nLife === 0 && c(err);
    const defers = sources.map(source => source(_n, _c))
    return close
}
exports.concat = (...sources) => (n, c) => {
    let pos = 0,
        sdefer = noop;
    const _n = (d, s) => n(d, () => (s(), pos = l));
    const l = sources.length;
    const f = err => {
        if (err) c(err)
        else if (pos < l)
            sdefer = sources[pos++](_n, f)
        else
            c();
    }
    f()
    return () => (pos = l, sdefer())
}
exports.merge = (...sources) => (n, c) => {
    const nTotal = sources.length;
    const defers = [];
    let nLife = nTotal;
    const _c = err => --nLife === 0 && c();
    const close = () => defers.forEach(defer => defer())
    const _n = (d, s) => n(d, () => (c = null, s(), close()))
    for (let i = 0; i < nTotal && c; ++i) {
        defers.push(sources[i](_n, _c))
    }
    return close
}
exports.combineLatest = (...sources) => (n, c) => {
    const nTotal = sources.length;
    let nLife = nTotal
    let nRun = 0;
    let _c = err => (--nLife) === 0 && c(err);
    const array = new Array(nTotal)
    const defers = [];
    const close = () => defers.forEach(defer => defer())
    const _n = i => {
        const $n = (d, s) => {
            array[i] = d;
            if (nRun === nTotal) { //所有源都激活了，可以组织推送数据了，切换到第三状态
                n(array, () => (c = null, s(), close()));
                __n = d => (array[i] = d, n(array, close));
            }
        }
        let __n = (d, s) => (++nRun, $n(d, s), __n = $n); //第一次数据达到后激活,切换到第二状态
        return (d, s) => __n(d, s)
    }
    for (let i = 0; i < nTotal && c; ++i) {
        defers.push(sources[i](_n(i), _c))
    }
    return close
}
exports.startWith = (...xs) => inputSource => (n, c) => {
    let pos = 0,
        defer = noop;
    const l = xs.length
    const close = () => (pos = l, defer(), c = null)
    while (pos < l) n(xs[pos++], close)
    if (c) defer = inputSource(n, c)
    return close
}
exports.share = source => {
    let sourceDefer = noop;
    const ns = []
    const nc = []
    const next = d => ns.forEach(n => n(d, n.close))
    const complete = e => {
        nc.forEach(c => c(e))
        ns.length = nc.length = 0
        sourceDefer = noop
    }
    return (n, c) => {
        ns.push(n)
        nc.push(c)
        const close = () => {
            ns.splice(ns.indexOf(n), 1)
            nc.splice(nc.indexOf(c), 1)
            if (nc.length === 0) sourceDefer = (sourceDefer(), noop);
        }
        n.close = close
        if (sourceDefer === noop) sourceDefer = source(next, complete)
        return close
    }
}

//FILTERING
exports.ignoreElements = source => (n, c) => source(noop, c)
exports.take = count => source => (n, c, _count = count) => source((d, s) => (n(d), --_count === 0 && s()), c)
exports.takeUntil = sSrc => src => (n, c) => {
    let sd = noop;
    const ssd = sSrc((d, s) => (sd(), s(), c(), c = null), noop)
    const close = () => (ssd(), sd())
    if (c) sd = src((d, s) => n(d, () => (close(), s())), err => (ssd(), c(err)))
    return close
}
exports.takeWhile = f => source => (n, c) => source((d, s) => f(d) ? n(d, s) : (s(), c()), c)
exports.takeLast = count => source => _result((buffer, d) => {
    buffer.push(d)
    if (buffer.length > count) buffer.shift()
    return buffer
}, [], source)
exports.skip = count => source => (n, c) => {
    let _count = count;
    let _n = () => (--_count === 0 && (_n = n));
    return source((d, s) => _n(d, s), c)
}
exports.skipUntil = sSrc => src => (n, c) => {
    let _n = noop
    const ssd = sSrc((d, s) => ((_n = n), s()), noop)
    const sd = src((d, s) => _n(d, s), err => (ssd(), c(err)))
    return () => (ssd(), sd())
}
exports.skipWhile = f => source => (n, c) => {
    let _n = (d, s) => (f(d) || (_n = n, n(d, s)));
    return source((d, s) => _n(d, s), c)
}
const defaultThrottleConfig = { leading: true, trailing: false }

exports.throttle = (durationSelector, config = defaultThrottleConfig) => source => (n, c) => {
    let _throttled = false;
    let _defer = noop
    let last = null
    let hasValue = false;

    function send(d, s) {
        if (hasValue) {
            n(d, s)
            throttle(d)
        }
        hasValue = false
    }

    function throttleDone(d, s) {
        if (_throttled) s && s()
        _throttled = false
        if (config.trailing) {
            send(last, noop)
        }
    }
    const throttle = d => (_throttled = true, _defer = durationSelector(d)(throttleDone, throttleDone))
    const defer = source((d, s) => {
        last = d
        hasValue = true
        if (!_throttled) {
            if (config.leading) send(d, s)
            else throttle(d)
        }
    }, err => err ? c(err) : (throttleDone(), c()))
    return () => (_defer(), defer())
}
const defaultAuditConfig = { leading: false, trailing: true }
exports.audit = durationSelector => exports.throttle(durationSelector, defaultAuditConfig)
exports.filter = f => source => (n, c) => source((d, s) => f(d) && n(d, s), c)
exports.elementAt = (count, defaultValue) => source => (n, c, result = defaultValue, _count = count) => source((d, s) => _count-- === 0 && ((result = d), s(), n(d, noop), c()), err => err || last === void 0 && (err = getError('no elements in sequence')) ? c(err) : c())
exports.find = f => source => exports.take(1)(exports.skipWhile(d => !f(d))(source))
exports.findIndex = f => source => (n, c, i = 0) => source((d, s) => f(d) ? (n(i++, noop), s(), c()) : ++i, c)
exports.first = (condition = () => true, defaultValue) => source => (n, c, first = defaultValue, count = 0) => source(d => condition(d, count++) && (first = d) && (n(first, noop), c()), err => err || first === void 0 && (err = getError('no elements in sequence')) ? c(err) : c())
exports.last = (condition = () => true, defaultValue) => source => (n, c, last = defaultValue, count = 0) => source(d => condition(d, count++) && (last = d), err => err || last === void 0 && (err = getError('no elements in sequence')) ? c(err) : (n(last, noop), c()))

//MATHEMATICAL

exports.count = f => source => _result((i, d) => f(d) ? i++ : i, 0, source)
exports.max = source => _result((max, d) => !(d < max) ? d : max, NaN, source)
exports.min = source => _result((min, d) => !(d > min) ? d : min, NaN, source)
exports.reduce = (...args) => source => _result((acc, d) => d, void 0, exports.scan(...args)(source))

//TRANSFORMATION
exports.pluck = s => source => (n, c) => source((d, s) => n(d[s], s), c)
exports.repeat = count => source => (n, c, buffer = [], _count = count) => source((d, s) => (buffer.push(d), n(d, s)), err => {
    if (err) c(err)
    else {
        const repeatSource = exports.fromArray(buffer)
        const again = () => --_count > 0 ? repeatSource(n, again) : c()
        again()
    }
})
exports.pairwise = source => (n, c, last, _n = d => (last = d, _n = (d, s) => n([last, d], s))) => source((d, s) => _n(d, s), c)
exports.map = f => source => (n, c) => source((d, s) => n(f(d), s), c);
exports.switchMap = (makeSource, combineResults) => inputSource => (n, c) => {
    let currDisposable = null,
        sourceEnded = false,
        dispose = noop
    const close = () => {
        dispose()
        currDisposable = (currDisposable && currDisposable(), null)
    }
    dispose = inputSource((d, s) =>
        currDisposable = (currDisposable && currDisposable(),
            makeSource(d)(combineResults ? ($d, $s) => n(combineResults(d, $d), () => (s(), $s(), close())) : n,
                err => {
                    currDisposable = null;
                    if (sourceEnded) c(err)
                })),
        err => {
            sourceEnded = true
            if (!currDisposable) c(err);
        }
    )
    return close
}
exports.switchMapTo = (innerSource, combineResults) => exports.switchMap(d => innerSource, combineResults)
exports.scan = (...args) => {
    const [reducer, seed] = args
    const hasSeed = args.length === 2
    return source => (n, c) => {
        let aac = seed
        const $n = (d, s) => n(aac = reducer(aac, d), s)
        let _n = (d, s) => (n(aac = d, s), _n = $n)
        return source(hasSeed ? $n : (d, s) => _n(d, s), c)
    }
}
exports.bufferTime = miniseconds => source => (n, c) => {
    const buffer = []
    const id = setInterval(() => (n(buffer.concat(), close), buffer.length = 0), miniseconds)
    const close = () => (clearInterval(id), defer())
    const defer = source(d => buffer.push(d), err => {
        close();
        if (!err) n(buffer, close)
        c(err)
    })
    return close
}

// UTILITY 
exports.tap = f => source => (n, c) => source((d, s) => (f(d), n(d, s)), c);
exports.delay = delay => source => (n, c) => {
    let defer = () => clearTimeout(id)
    const id = setTimeout(() => defer = source(n, c), delay)
    return () => defer()
}