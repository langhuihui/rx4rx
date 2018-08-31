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
    // UTILITY 
class Tap extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        f(data)
        this.sink.next(data)
    }
}

exports.tap = f => source => sink => source(new Tap(sink, f));

exports.delay = delay => source => sink => {
    let defer = () => clearTimeout(id)
    const id = setTimeout(() => defer = source(sink), delay)
    return () => defer()
}

Object.assign(exports, require('./combination'), require('./filtering'), require('./mathematical'), require('./producer'), require('./transformation'))