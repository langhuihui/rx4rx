const { Sink, noop, asap } = require('./common')
const { share } = require('./combination')

exports.subject = source => {
    const defer = share(sink => {
        defer.sink = sink
        return source ? source(defer) : noop
    })
    return Object.setPrototypeOf(defer, Sink.prototype)
}

exports.fromArray = array => sink => {
    let pos = 0,
        l = array.length
    asap(() => {
        while (pos < l) sink.next(array[pos++])
        if (sink) sink.complete()
    }, () => {
        pos = l;
        sink = null;
    })
}
exports.of = (...items) => exports.fromArray(items)
exports.interval = period => sink => {
    let i = 0;
    const id = setInterval(() => sink.next(i++), period)
    return () => clearInterval(id)
}
exports.timer = (delay, period) => sink => {
    let i = 0;
    let clear = clearTimeout
    let id = setTimeout(() => {
        clear = clearInterval
        id = setInterval(() => sink.next(i++), period)
    }, delay)
    return () => clear(id)
}
exports.fromEventPattern = (add, remove) => sink => {
    const n = d => sink.next(d);
    return asap(() => add(n), () => remove(n))
}
exports.fromEvent = (target, name) => typeof target.on == 'function' ? exports.fromEventPattern(handler => target.on(name, handler), handler => target.off(name, handler)) : exports.fromEventPattern(handler => target.addEventListener(name, handler), handler => target.removeEventListener(name, handler))
exports.range = (start, count) => (sink, pos = start, end = count + start) => asap(() => {
    while (pos < end) sink.next(pos++)
    sink && sink.complete()
}, () => (pos = end, sink = null))

exports.fromPromise = source => sink => {
    source.then(d => (sink && sink.next(d), sink && sink.complete())).catch(e => sink && sink.complete(e))
    return () => sink = null
}
exports.fromIterable = source => sink => {
    const iterator = source[Symbol.iterator]()
    let value, rv;
    let done = false;
    asap(() => {
        try {
            while (!done) {
                ({ value, done } = iterator.next(rv))
                rv = sink.next(value)
            }
            if (sink) sink.complete()
        } catch (e) {
            if (sink) sink.complete(e)
        }
    })
    return () => {
        iterator.return(_);
        done = true;
        sink = null
    }
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
exports.bindCallback = (call, thisArg, ...args) => sink => asap(() => {
    const inArgs = args.concat((...rargs) => (sink && sink.next(rargs.length > 1 ? rargs : rargs[0]), sink && sink.complete()));
    call.apply ? call.apply(thisArg, inArgs) : call(...inArgs)
}, () => sink = null)
exports.bindNodeCallback = (call, thisArg, ...args) => sink => asap(() => {
    const inArgs = args.concat((err, ...rargs) => (sink && err && sink.complete(err)) || (sink && sink.next(rargs.length > 1 ? rargs : rargs[0]), sink && sink.complete()));
    call.apply ? call.apply(thisArg, inArgs) : call(...inArgs)
}, () => sink = null)
exports.never = sink => noop
exports.throwError = e => sink => (sink.complete(e), noop)
exports.empty = exports.throwError()