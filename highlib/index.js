const {
    Sink,
    deliver
} = require('./common')
exports.pipe = (first, ...cbs) => cbs.reduce((aac, c) => c(aac), first);

class Reuse {
    constructor(subscribe, ...args) {
        this.subscribe = subscribe
        this.source = exports.pipe(...args)
    }
    start() {
        this.subscriber = this.subscribe(this.source)
    }
    stop() {
        this.subscriber && this.subscriber.dispose()
    }
}

//在pipe的基础上增加了start和stop方法，方便反复调用
exports.reusePipe = (...args) => new Reuse(...args)

exports.toPromise = source => new Promise((resolve, reject) => {
    const sink = new Sink()
    sink.next = d => sink.value = d
    sink.complete = err => err ? reject(err) : resolve(sink.value)
    source(sink)
})

//SUBSCRIBER
exports.subscribe = (n, e = noop, c = noop) => source => {
    const sink = new Sink()
    sink.next = n
    sink.complete = err => err ? e(err) : c()
    source(sink)
    return sink
}
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

exports.tap = deliver(Tap)

exports.delay = delay => source => sink => sink.defer([clearTimeout, , setTimeout(source, delay, sink)])

Object.assign(exports, require('./combination'), require('./filtering'), require('./mathematical'), require('./producer'), require('./transformation'))