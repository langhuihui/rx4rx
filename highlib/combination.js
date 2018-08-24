const { Sink, noop } = require('./common')
class Share extends Sink {
    constructor(source) {
        this.source = source
        this.sinks = []
    }
    sourceDefer() {

    }
    add(sink) {
        this.sinks.push(sink)
        if (this.sinks.length === 1) {
            this.sourceDefer = this.source(this)
        }
    }
    remove(sink) {
        this.sinks.splice(this.sinks.indexOf(sink), 1)
        if (this.sinks.length === 0) {
            this.sourceDefer()
            delete this.sourceDefer
        }
    }
    next(data) {
        this.sinks.forEach(s => s.next(data))
    }
    complete(err) {
        this.sinks.forEach(s => s.complete(err))
        this.sinks.length = 0
    }
}
exports.share = source => {
    const share = new Share(source)
    return sink => (share.add(sink), () => share.remove(sink))
}
exports.iif = (condition, trueS, falseS) => sink => condition() ? trueS(sink) : falseS(sink)
class Race extends Sink {
    constructor(nLife) {
        this.nLife = nLife;
    }
    next(data) {
        this.defer()
        this._next(data)
        this._complete()
    }
    complete(err) {
        if (--this.nLife === 0) this._complete(err)
    }
}
exports.race = (...sources) => sink => {
    const race = sink.warp(Race, sources.length)
    const defers = sources.map(source => source(race))
    return race.defer = () => defers.forEach(defer => defer())
}
class Concat extends Sink {
    constructor(sources) {
        this.sources = sources
        this.pos = 0
        this.sdefer = noop
        this.len = sources.length
    }
    complete(err) {
        if (err) this.sink.complete(err)
        if (this.pos < this.len) this.sdefer = this.sources[this.pos++](this)
        else this.sink.complete()
    }
    defer() {
        this.pos = this.len
        this.sdefer()
    }
}
exports.concat = (...sources) => sink => {
    const concat = sink.warp(Concat, sources)
    concat.complete()
    return () => concat.defer()
}

class Merge extends Sink {
    constructor(nLife) {
        super()
        this.nLife = nLife;
    }
    complete() {
        if (--this.nLife === 0) this._complete()
    }
}
exports.mergeArray = sources => sink => {
    const merge = sink.warp(Merge, sources.length)
    const defers = sources.forEach(source => source(merge))
    return () => defers.forEach(defer => defer())
}
exports.merge = (...sources) => sink => {
    const merge = sink.warp(Merge, sources.length)
    const defers = sources.forEach(source => source(merge))
    return () => defers.forEach(defer => defer())
}
class CombineLatest extends Sink {
    constructor(index, context) {
        super()
        this.index = index
        this.context = context
        this.next = function(data) {
            context.nRun++;
            this.next = function(data) {
                if (context.nRun === context.nTotal) {
                    delete this.next
                    this.next(data)
                } else this.context.array[this.index] = data
            }
            this.next(data)
        }
    }
    next(data) {
        this.context.array[this.index] = data
        this._next(this.context.array)
    }
    complete(err) {
        (--this.context.nLife) === 0 && this._complete(err)
    }
}
exports.combineLatest = (...sources) => sink => {
    const nTotal = sources.length;
    const context = {
        nTotal,
        nLife: nTotal,
        nRun: 0,
        array: new Array(nTotal)
    }
    const defers = sources.forEach((source, i) => source(sink.warp(CombineLatest, i, context)))
    return () => defers.forEach(defer => defer())
}
exports.startWith = (...xs) => inputSource => (sink, pos, defer = noop, l = xs.length) =>
    asap(() => {
        while (pos < l) sink.next(xs[pos++])
        if (sink) defer = inputSource(sink)
    }, () => (pos = l, defer(), sink = null))