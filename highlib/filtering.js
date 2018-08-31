const {
    Sink,
    result
} = require('./common')
const {
    FusionSink,
    Filter
} = require('./fusion')

exports.filter = f => source => sink => source(sink instanceof FusionSink ? sink.fusionFilter(f) : new Filter(sink, f))

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
            super.complete()
        }
    }
}
exports.take = count => source => sink => new Take(sink, count).subscribe(source)

class TakeUntil extends Sink {
    init(defer) {
        this.defer = defer
    }
    complete(err) {
        this.defer()
        super.complete(err)
    }
}
class _TakeUntil extends Sink {
    next() {
        this.defer()
        this.defer2()
        this.complete()
    }
}
exports.takeUntil = sSrc => src => sink => {
    const _takeUntil = new _TakeUntil()
    const ssd = _takeUntil.subscribe(sSrc)
    const sd = _takeUntil.defer2 = src(new TakeUntil(sink, ssd))
    return () => (ssd(), sd())
}

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
exports.takeWhile = f => source => sink => new TakeWhile(sink, f).subscribe(source)

exports.takeLast = count => source => result((buffer, d) => {
    buffer.push(d)
    if (buffer.length > count) buffer.shift()
    return buffer
}, [], source)

class Skip extends Sink {
    init(count) {
        this.count = count
    }
    next(data) {
        if (--this.count === 0) {
            this.next = super.next
        }
    }
}
exports.skip = count => source => sink => source(new Skip(sink, count))

class SkipUntil extends Sink {
    init(defer) {
        this.defer = defer
    }
    next() {}
    complete(err) {
        this.defer()
        super.complete(err)
    }
}
class _SkipUntil extends Sink {
    next() {
        this.defer()
        delete this.sink.next
    }
    complete() {

    }
}

exports.skipUntil = sSrc => src => sink => {
    const ssd = new _SkipUntil().subscribe(sSrc)
    const sd = src(new SkipUntil(sink, ssd))
    return () => (ssd(), sd())
}

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
exports.skipWhile = f => source => sink => source(new SkipWhile(sink, f))

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
            this.defer = subscribe(this.durationSelector(data))
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
    init(durationSelector, config) {
        this.durationSelector = durationSelector
        this.leading = config.leading
        this.trailing = config.trailing
        this.hasValue = false
        this._defer = noop
    }

    throttle(data) {
        this._throttle.isComplete = false
        this._throttle.last = data
        this._throttle.hasValue = true
        this._throttled.subscribe(this.durationSelector(data))
    }
    next(data) {
        if (!this._throttle || this._throttle.isComplete) {
            if (!this._throttle) this._throttle = new _Throttle(this.sink, this.durationSelector, this.trailing)
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
        if (err) super.complete(err)
        else {
            if (this._throttle) this._throttle.complete()
        }
    }
    dispose() {
        this.defer()
        if (this._throttle) this._throttle.defer()
        super.dispose()
    }
}
exports.throttle = (durationSelector, config = defaultThrottleConfig) => source => sink => new Throttle(sink, durationSelector, config).subspose(source)
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
            this.sink.next(data)
            this.complete()
        }
    }
    complete(err) {
        if (!err && this.value === void 0) err = new Error('no elements in sequence')
        super.complete(err)
    }
}

exports.elementAt = (count, defaultValue) => source => new ElementAt(count, defaultValue).subscribe(source)
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

exports.findIndex = f => source => new FindIndex(f).subscribe(source)

class First extends Sink {
    init(source, f, defaultValue) {
        this.source = source
        this.f = f
        this.value = defaultValue
        this.count = 0
    }
    next(data) {
        const f = this.f
        if (!f || f(data, this.count++, this.source)) {
            this.value = data
            this.sink.next(data)
            this.complete()
        }
    }
    complete(err) {
        if (!err && this.value === void 0) err = new Error('no elements in sequence')
        super.complete(err)
    }
}

exports.first = (condition, defaultValue) => source => sink => new First(sink, source, condition, defaultValue).subscribe(source)

class Last extends Sink {
    init(source, f, defaultValue) {
        this.source = source
        this.f = f
        this.value = defaultValue
        this.count = 0
    }
    next(data) {
        const f = this.f
        if (!f || f(data, this.count++, this.source)) {
            this.value = data
            this.sink.next(data)
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

exports.last = (condition, defaultValue) => source => sink => new Last(sink, source, condition, defaultValue).subscribe(source)