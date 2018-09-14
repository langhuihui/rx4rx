function noop() {}
exports.noop = noop
exports.stop = Symbol('stop')
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
        this.defers = new Set()
        this.sink = sink
        this.init(...args)
        if (sink) sink.defers.add(this)
    }
    init() {

    }
    set disposePass(value) {
        if (!this.sink) return
        if (value)
            this.sink.defers.add(this)
        else this.sink.defers.delete(this)
    }
    next(data) {
        this.sink && this.sink.next(data)
    }
    complete(err) {
        this.sink && this.sink.complete(err)
        this.dispose(false)
    }
    error(err) {
        this.complete(err)
    }
    dispose(defer = true) {
        this.disposed = true
        this.complete = noop
        this.next = noop
        this.dispose = noop
        this.subscribes = this.subscribe = noop
        defer && this.defer() //销毁时终止事件源
    }
    defer(add) {
        if (add) {
            this.defers.add(add)
        } else {
            this.defers.forEach(defer => {
                switch (true) {
                    case defer.dispose != void 0:
                        defer.dispose()
                        break;
                    case typeof defer == 'function':
                        defer()
                        break
                    case defer.length > 0:
                        let [f, thisArg, ...args] = defer
                        if (f.call)
                            f.call(thisArg, ...args)
                        else f(...args)
                        break
                }
            })
            this.defers.clear()
        }
    }
    subscribe(source) {
        source(this)
        return this
    }
    subscribes(sources) {
        sources.forEach(source => source(this))
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

exports.deliver = Class => (...args) => source => sink => source(new Class(sink, ...args))