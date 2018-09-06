const {
    Sink,
    deliver,
    noop
} = require('./common')
exports.Sink = Sink
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

class Delay extends Sink {
    init(delay) {
        this.delayTime = delay
        this.buffer = []
        this.timeoutId = [clearTimeout, , ]
        this.defer(this.timeoutId)
    }
    delay(delay) {
        this.timeoutId[2] = setTimeout(this.pop, delay, this)
    }
    pop(_this) {
        const { time: lastTime, data } = _this.buffer.shift()
        _this.sink.next(data)
        if (_this.buffer.length) {
            _this.delay(_this.buffer[0].time - lastTime)
        }
    }
    next(data) {
        if (!this.buffer.length) {
            this.delay(this.delayTime)
        }
        this.buffer.push({ time: new Date, data })
    }
    complete(err) {
        if (err) this.sink.complete(err)
        else {
            this.timeoutId[2] = setTimeout(() => this.sink.complete(), this.delayTime)
        }
    }
}
exports.delay = deliver(Delay)

Object.assign(exports, require('./combination'), require('./filtering'), require('./mathematical'), require('./producer'), require('./transformation'))

//该代理可以实现将pipe模式转成链式编程
function createProxy(source) {
    const result = new Proxy((...args) => source(...args), {
        get(target, prop) {
            if (prop == 'subscribe') return (...args) => exports.subscribe(...args)(source)
            if (!source) {
                return (...args) => createProxy(exports[prop](...args))
            } else {
                return (...args) => {
                    source = exports[prop](...args)(source)
                    return result
                }
            }
        }
    })
    return result
}
exports.rx = createProxy()