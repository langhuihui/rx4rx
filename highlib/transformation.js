const {
    Sink
} = require('./common')
const {
    FusionSink,
    MapSink
} = require('./fusion')
class Scan extends Sink {
    init(hasSeed, f, seed) {
        this.f = f
        this.aac = seed
        if (!hasSeed) {
            this.next = d => {
                delete this.next
                this.aac = d
            }
        }
    }
    next(data) {
        const f = this.f
        this.aac = f(this.aac, data)
    }
    complete(err) {
        if (!err) super.next(this.aac)
        super.complete(err)
    }
}
exports.scan = (...args) => source => sink => source(new Scan(sink, args.length == 2, ...args))

exports.map = f => source => sink => source(sink instanceof FusionSink ? sink.fusionMap(f) : new MapSink(sink, f).fusion())

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
exports.pairwise = source => sink => source(new Pairwise(sink))

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
                for (let i = 0, l = this.buffer.length; i < l; ++i) {
                    if (this.disposed) return
                    this.sink.next(this.buffer[i])
                }
            }
            super.complete()
        }
    }
    dispose() {
        this.defer()
        super.dispose()
    }
}

exports.repeat = count => source => sink => new Repeat(sink, count).subspose(source)
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
        this.context.defer = null
        if (this.context.sourceEnded) super.complete(err)
    }
}
class SwitchMap extends Sink {
    init(makeSource, context) {
        this.makeSource = makeSource
        this.context = context
    }
    next(data) {
        const makeSource = this.makeSource
        this.context.defer = makeSource(data)(new _SwitchMap(this.sink, data, this.context))
    }
    complete(err) {
        this.context.sourceEnded = true
        if (!this.context.defer) super.complete(err)
    }
    dispose() {
        this.defer()
        if (this.context.defer) {
            this.context.defer()
            this.context.defer = null
        }
        super.dispose()
    }
}

exports.switchMap = (makeSource, combineResults) => inputSource => sink => new SwitchMap(sink, makeSource, { sourceEnded: false, combineResults }).subspose(inputSource)

exports.switchMapTo = (innerSource, combineResults) => exports.switchMap(d => innerSource, combineResults)

class BufferTime extends Sink {
    init(miniseconds) {
        this.buffer = []
        this.id = setInterval(() => {
            this.sink.next(this.buffer.concat());
            this.buffer.length = 0
        }, miniseconds)
    }
    next(data) {
        this.buffer.push(data)
    }
    complete(err) {
        clearInterval(this.id)
        if (!err) this.sink.next(this.buffer)
        super.complete(err)
    }
    dispose() {
        clearInterval(this.id)
        this.defer()
        super.dispose()
    }
}

exports.bufferTime = miniseconds => source => sink => new BufferTime(sink, miniseconds).subspose(source)