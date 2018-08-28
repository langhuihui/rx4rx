const {
    Sink
} = require('./common')
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
class ToPromise extends Sink {
    init(resolve, reject) {
        this.resolve = resolve
        this.reject = reject
    }
    next(data) {
        this.data = data
    }
    complete(err) {
        err ? this.reject(err) : this.resolve(this.data)
    }
}
exports.toPromise = source => new Promise((resolve, reject) => source(new ToPromise(null, resolve, reject)))
class Subscribe extends Sink {
    init(n, e, c) {
        this.next = n
        this.complete = function(err) {
            err ? e(err) : c()
        }
    }
}
//SUBSCRIBER
exports.subscribe = (n, e = noop, c = noop) => source => source(new Subscribe(null, n, e, c))


//FILTERING




const defaultThrottleConfig = {
    leading: true,
    trailing: false
}

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
const defaultAuditConfig = {
    leading: false,
    trailing: true
}
exports.audit = durationSelector => exports.throttle(durationSelector, defaultAuditConfig)

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


// UTILITY 
exports.tap = f => source => (n, c) => source(d => (f(d), n(d)), c);
exports.delay = delay => source => (n, c) => {
    let defer = () => clearTimeout(id)
    const id = setTimeout(() => defer = source(n, c), delay)
    return () => defer()
}

Object.assign(exports, require('./combination'), require('./filtering'), require('./mathematical'), require('./producer'), require('./transformation'))