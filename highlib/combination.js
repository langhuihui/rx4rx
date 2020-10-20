const {
    Sink,
    deliver
} = require('./common')
class Share extends Sink {
    init(source) {
        this.source = source
        this.sinks = new Set()
    }
    add(sink) {
        this.sinks.add(sink)
        if (this.sinks.size === 1) {
            this.source(this)
        }
    }
    remove(sink) {
        this.sinks.delete(sink)
        if (this.sinks.size === 0) {
            this.defer()
        }
    }
    next(data) {
        this.sinks.forEach(s => s.next(data))
    }
    complete(err) {
        this.sinks.forEach(s => s.complete(err))
        this.sinks.clear()
    }
}
exports.share = () => source => {
    const share = new Share(null, source)
    return sink => {
        sink.defer([share.remove, share, sink])
        share.add(sink);
    }
}
exports.shareReplay = bufferSize => source => {
    const share = new Share(null, source)
    const buffer = []
    share.next = function (data) {
        buffer.push(data)
        if (buffer.length > bufferSize) {
            buffer.shift()
        }
        this.sinks.forEach(s => s.next(data))
    }
    return sink => {
        sink.defer([share.remove, share, this])
        buffer.forEach(cache => sink.next(cache))
        share.add(sink);
    }
}
exports.iif = (condition, trueS, falseS) => sink => condition() ? trueS(sink) : falseS(sink)
class Race extends Sink {
    init(nLife) {
        this.nLife = nLife;
    }
    next(data) {
        this.defer()
        this.sink.next(data)
        super.complete()
    }
    complete(err) {
        if (--this.nLife === 0) super.complete(err)
    }
}
exports.race = (...sources) => sink => new Race(sink, sources.length).subscribes(sources)
class Concat extends Sink {
    init(sources) {
        this.sources = sources
        this.pos = 0
        this.len = sources.length
    }
    complete(err) {
        if (err) {
            super.complete(err)
            return
        }
        if (this.pos < this.len && !this.disposed) this.sources[this.pos++](this)
        else super.complete()
    }
}
exports.concat = (...sources) => sink => new Concat(sink, sources).complete()

class Merge extends Sink {
    init(nLife) {
        this.nLife = nLife;
    }
    complete() {
        if (--this.nLife === 0) super.complete()
    }
}
exports.mergeArray = sources => sink => new Merge(sink, sources.length).subscribes(sources)
exports.merge = (...sources) => sink => new Merge(sink, sources.length).subscribes(sources)
class CombineLatest extends Sink {
    init(index, array, context) {
        this.index = index
        this.context = context
        this.state = 0
        this.array = array
    }
    next(data) {
        switch (this.state) {
            case 0:
                ++this.context.nRun;
                this.state = 1
            case 1:
                if (this.context.nRun === this.context.nTotal) {
                    this.state = 2
                } else {
                    this.array[this.index] = data
                    break
                }
            case 2:
                this.array[this.index] = data
                this.sink.next(this.array)
                break
        }
    }
    complete(err) {
        if (err || (--this.context.nLife) === 0) super.complete(err)
    }
}
exports.combineLatest = (...sources) => sink => {
    const nTotal = sources.length;
    const context = {
        nTotal,
        nLife: nTotal,
        nRun: 0
    }
    const array = new Array(nTotal)
    // const defers = new Array(nTotal)
    // for (let i = 0; i < nTotal; ++i) defers[i] = sources[i](new CombineLatest(sink, i, array, context))
    sources.forEach((source, i) => source(new CombineLatest(sink, i, array, context)))
}
class Zip extends Sink {
    init(index, array, context) {
        this.index = index
        this.context = context
        this.array = array
        this.buffer = []
        array[index] = this.buffer
    }
    next(data) {
        this.buffer.push(data)
        if (this.array.every(x => x.length)) {
            this.sink.next(this.array.map(x => x.shift()))
        }
    }
    complete(err) {
        if (err || (--this.context.nLife) === 0) super.complete(err)
    }
}
exports.zip = (...sources) => sink => {
    const nTotal = sources.length;
    const context = {
        nTotal,
        nLife: nTotal
    }
    const array = new Array(nTotal)
    sources.forEach((source, i) => source(new Zip(sink, i, array, context)))
}

exports.startWith = (...xs) => inputSource => (sink, pos = 0, l = xs.length) => {
    while (pos < l) {
        if (sink.disposed) return
        sink.next(xs[pos++])
    }
    sink.disposed || inputSource(sink)
}