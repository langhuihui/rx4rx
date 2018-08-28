const {
    Sink,
    noop
} = require('./common')
class Share extends Sink {
    init(source) {
        this.source = source
        this.sinks = []
    }
    add(sink) {
        this.sinks.push(sink)
        if (this.sinks.length === 1) {
            this.subscribe(this.source)
        }
    }
    remove(sink) {
        this.sinks.splice(this.sinks.indexOf(sink), 1)
        if (this.sinks.length === 0) {
            this.defer()
            this.defer = noop
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
    const share = new Share(null, source)
    return sink => (share.add(sink), () => share.remove(sink))
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
        this.defer = noop
        this.len = sources.length
    }
    complete(err) {
        if (err) this.sink.complete(err)
        if (this.pos < this.len) this.subscribe(this.sources[this.pos++])
        else this.sink.complete()
    }
    dispose() {
        this.pos = this.len
        this.defer()
        super.dispose()
    }
}
exports.concat = (...sources) => sink => {
    const concat = new Concat(sink, sources)
    concat.complete()
    return () => concat.dispose()
}

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
        (--this.context.nLife) === 0 && super.complete(err)
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
    const defers = new Array(nTotal)
    for (let i = 0; i < nTotal; ++i) defers[i] = sources[i](new CombineLatest(sink, i, array, context))
    // const defers = sources.forEach((source, i) => source(new CombineLatest(sink, i, array, context)))
    return () => defers.forEach(defer => defer())
}
exports.startWith = (...xs) => inputSource => (sink, pos, l = xs.length) =>
    asap(() => {
        while (pos < l) sink.next(xs[pos++])
        sink.subscribe(inputSource)
    }, () => (pos = l, sink.defer(), sink.dispose()))