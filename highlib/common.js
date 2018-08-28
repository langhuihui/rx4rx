function noop() {}
exports.noop = noop
    //第一次调用有效
exports.once = f => (...args) => {
    if (f) {
        let r = f(...args)
        f = null
        return r
    }
}

class Sink {
    constructor(sink, ...args) {
        this.init(...args)
        this.sink = sink
    }
    init() {

    }
    next(data) {
        if (this.sink) this.sink.next(data)
    }
    complete(err) {
        if (this.sink) {
            this.sink.complete(err)
        }
        this.dispose()
    }
    error(err) {
        this.complete(err)
    }
    dispose() {
        this.complete = noop
        this.next = noop
        this.dispose = noop
        this.subscribe = noop
        this.subscribes = noop
        this.disposed = true
    }
    defer() {

    }
    subscribes(sources) {
        const defers = sources.map(source => source(this))
        return this.defer = () => defers.forEach(defer => defer())
    }
    subscribe(source) {
        return this.defer = source(this)
    }
    subspose() {
        this.defer = source(this)
        return () => this.dispose()
    }
}
exports.Sink = Sink
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

class Result extends Sink {
    init(f, aac) {
        this.f = f
        this.aac = aac
    }
    next(data) {
        this.aac = this.f(aac, data)
    }
    complete(err) {
        if (!err) this.sink.next(this.aac)
        this.sink.complete(err)
    }
}
exports.result = (f, aac, source) => sink => source(new Result(sink, f, aac))