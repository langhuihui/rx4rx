const {
    Sink,
    deliver,
    noop
} = require('./common')
const {
    Filter
} = require('./fusion')
const {
    reduce
} = require('./mathematical')
exports.filter = f => source => sink => source(sink.fusionFilter ? sink.fusionFilter(f) : new Filter(sink, f))

class Ignore extends Sink {
    next() {}
}
exports.ignoreElements = source => sink => source(new Ignore(sink))

class Take extends Sink {
    init(count) {
        this.count = count
    }
    next(data) {
        this.sink.next(data)
        if (--this.count === 0) {
            this.defer()
            this.complete()
        }
    }
}
exports.take = deliver(Take)

class _TakeUntil extends Sink {
    init(sourceSink) {
        this.sourceSink = sourceSink
    }
    next() {
        //收到事件，终结两个sink
        this.sourceSink.dispose()
    }
}
class TakeUntil extends Sink {
    init(sSrc) {
        this._takeUntil = new _TakeUntil(null, this).subscribe(sSrc)
            //将开关事件sink纳入销毁链
        this.defer(this._takeUntil)
    }
    complete(err) {
        //完成事件，单方面终结开关sink
        this._takeUntil.dispose()
        super.complete(err)
    }
}

exports.takeUntil = deliver(TakeUntil)

class TakeWhile extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        if (f(data)) {
            this.sink.next(data)
        } else {
            this.defer()
            this.complete()
        }
    }
}
exports.takeWhile = deliver(TakeWhile)

exports.takeLast = count => reduce((buffer, d) => {
    buffer.push(d)
    if (buffer.length > count) buffer.shift()
    return buffer
}, [])

class Skip extends Sink {
    init(count) {
        this.count = count
    }
    next() {
        if (--this.count === 0) {
            this.next = super.next
        }
    }
}
exports.skip = deliver(Skip)

class _SkipUntil extends Sink {
    next() {
        this.dispose()
        delete this.sourceSink.next
    }
    init(sourceSink) {
        this.sourceSink = sourceSink
    }
}

class SkipUntil extends Sink {
    init(sSrc) {
        this._skipUntil = new _SkipUntil(null, this).subscribe(sSrc)
        this.defer(this._skipUntil)
        this.next = noop
    }
    complete(err) {
        this._skipUntil.dispose()
        super.complete(err)
    }
}
exports.skipUntil = deliver(SkipUntil)

class SkipWhile extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        if (!f(data)) {
            this.next = super.next
            this.next(data)
        }
    }
}
exports.skipWhile = deliver(SkipWhile)

const defaultThrottleConfig = {
    leading: true,
    trailing: false
}
class _Throttle extends Sink {
    init(durationSelector, trailing) {
        this.durationSelector = durationSelector
        this.trailing = trailing
        this.hasValue = true
        this.isComplete = false;
    }
    send(data) {
        if (this.hasValue) {
            this.sink.next(data)
            this.isComplete = false
            this.durationSelector(data)(this)
        }
        this.hasValue = false
    }
    next() {
        this.complete()
    }
    complete() {
        this.defer()
        this.isComplete = true
        if (this.trailing) {
            this.send(this.last)
        }
    }
}
class Throttle extends Sink {
    init(durationSelector, config = defaultThrottleConfig) {
        this.durationSelector = durationSelector
        this.leading = config.leading
        this.trailing = config.trailing
        this.hasValue = false
    }

    throttle(data) {
        this._throttle.isComplete = false
        this._throttle.last = data
        this._throttle.hasValue = true
        this.durationSelector(data)(this._throttled)
    }
    next(data) {
        if (!this._throttle || this._throttle.isComplete) {
            if (!this._throttle) {
                this._throttle = new _Throttle(this.sink, this.durationSelector, this.trailing)
                this.defer(this._throttle)
            }

            if (this.leading) {
                this.sink.next(data)
                this.throttle(data)
                this._throttled.hasValue = false
            } else {
                this.throttle(data)
            }
        } else {
            this._throttle.last = data
            this._throttle.hasValue = true
        }
    }
    complete(err) {
        if (err) {
            this._throttle && this._throttle.dispose()
            super.complete(err)
        } else {
            this._throttle && this._throttle.complete()
        }
    }
}
exports.throttle = deliver(Throttle)
const defaultAuditConfig = {
    leading: false,
    trailing: true
}
exports.audit = durationSelector => exports.throttle(durationSelector, defaultAuditConfig)

class ElementAt extends Sink {
    init(count, defaultValue) {
        this.count = count
        this.value = defaultValue
    }
    next(data) {
        if (this.count-- === 0) {
            this.value = data
            this.defer()
            this.complete()
        }
    }
    complete(err) {
        if (!err) {
            if (this.value === void 0) err = new Error('no elements in sequence')
            else this.sink.next(this.value)
        }
        super.complete(err)
    }
}

exports.elementAt = deliver(ElementAt)
exports.find = f => source => exports.take(1)(exports.skipWhile(d => !f(d))(source))

class FindIndex extends Sink {
    init(f) {
        this.f = f
        this.i = 0
    }
    next(data) {
        const f = this.f
        if (f(data)) {
            this.sink.next(this.i++)
            this.defer()
            this.complete()
        } else {
            ++this.i
        }
    }
}

exports.findIndex = deliver(FindIndex)

class First extends Sink {
    init(f, defaultValue) {
        this.f = f
        this.value = defaultValue
        this.count = 0
    }
    next(data) {
        const f = this.f
        if (!f || f(data, this.count++)) {
            this.value = data
            this.defer()
            this.complete()
        }
    }
    complete(err) {
        if (!err) {
            if (this.value === void 0) err = new Error('no elements in sequence')
            else this.sink.next(this.value)
        }
        super.complete(err)
    }
}

exports.first = deliver(First)

class Last extends Sink {
    init(f, defaultValue) {
        this.f = f
        this.value = defaultValue
        this.count = 0
    }
    next(data) {
        const f = this.f
        if (!f || f(data, this.count++)) {
            this.value = data
        }
    }
    complete(err) {
        if (!err) {
            if (this.value === void 0) err = new Error('no elements in sequence')
            else this.sink.next(this.value)
        }
        super.complete(err)
    }
}

exports.last = deliver(Last)