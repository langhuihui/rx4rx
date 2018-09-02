const {
    Sink,
    deliver
} = require('./common')
const {
    MapSink
} = require('./fusion')
class Scan extends Sink {
    init(hasSeed, f, seed) {
        this.f = f
        this.aac = seed
        if (!hasSeed) {
            this.next = d => {
                delete this.next
                this.sink.next(this.aac = d)
            }
        }
    }
    next(data) {
        const f = this.f
        this.aac = f(this.aac, data)
        this.sink.next(this.aac)
    }
}
exports.scan = (...args) => source => sink => source(new Scan(sink, args.length == 2, ...args))

exports.map = f => source => sink => source(sink.fusionMap ? sink.fusionMap(f) : new MapSink(sink, f))

exports.pluck = s => exports.map(d => d[s])

class Pairwise extends Sink {
    init() {
        this.hasLast = false
    }
    next(data) {
        if (this.hasLast) {
            this.sink.next([this.last, data])
        } else {
            this.hasLast = true
        }
        this.last = data
    }
}
exports.pairwise = deliver(Pairwise)

class Repeat extends Sink {
    init(count) {
        this.buffer = []
        this.count = count
    }
    next(data) {
        this.buffer.push(data)
        this.sink.next(data)
    }
    complete(err) {
        if (err) super.complete(err)
        else {
            while (this.count--) {
                for (let i = 0, l = this.buffer.length; i < l; this.sink.next(this.buffer[i++])) {
                    if (this.disposed) return
                }
            }
            super.complete()
        }
    }
}

exports.repeat = deliver(Repeat)
class _SwitchMap extends Sink {
    init(data, context) {
        this.data = data
        this.context = context
    }
    next(data) {
        const combineResults = this.context.combineResults
        if (combineResults) {
            this.sink.next(combineResults(this.data, data))
        } else {
            this.sink.next(data)
        }
    }
    complete(err) {
        if (this.context.disposed) super.complete(err)
        else this.dispose(false)
    }
}
class SwitchMap extends Sink {
    init(makeSource, combineResults) {
        this.makeSource = makeSource
        this.combineResults = combineResults
    }
    next(data) {
        const makeSource = this.makeSource
        this.switch = new _SwitchMap(this.sink, data, this)
        makeSource(data)(this.switch)
    }
    complete(err) {
        if (!this.switch || this.switch.disposed) super.complete(err)
        else this.dispose(false)
    }
}

exports.switchMap = deliver(SwitchMap)

exports.switchMapTo = (innerSource, combineResults) => exports.switchMap(d => innerSource, combineResults)

class BufferTime extends Sink {
    init(miniseconds) {
        this.buffer = []
        this.id = setInterval(() => {
            this.sink.next(this.buffer.concat());
            this.buffer.length = 0
        }, miniseconds)
        this.defer([clearInterval, , this.id])
    }
    next(data) {
        this.buffer.push(data)
    }
    complete(err) {
        clearInterval(this.id)
        if (!err) this.sink.next(this.buffer)
        super.complete(err)
    }
}

exports.bufferTime = deliver(BufferTime)