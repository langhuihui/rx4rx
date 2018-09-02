function noop() {

}
exports.pipe = (first, ...cbs) => cbs.reduce((aac, c) => c(aac), first);
exports.fromArray = array => sink => {
    for (let i = 0, l = array.length, done = sink.next().done; i < l && !done; i++) {
        done = sink.next(array[i]).done
    }
    sink.next(exports.done)
    sink.return()
}
exports.of = (...items) => exports.fromArray(items)
const _done = exports.done = Symbol('done')

function* subscribe(n, e, c) {
    while (true) {
        try {
            let result = yield 0
            while (result !== _done) {
                if (n(result) === _done) return
                result = yield 0
            }
            c && c()
        } catch (err) {
            e && e(err)
        }
    }
}
exports.subscribe = subscribe

exports.interval = period => sink => {
    if (sink.next().done) return noop
    let i = 0;
    const id = setInterval(() => sink.next(i++).done && clearInterval(id), period)
    return () => clearInterval(id)
}

function* _tap(sink, f) {
    for (let done = sink.next().done; !done;) {
        let x = yield 0
        if (x === _done) break
        f(x)
        done = sink.next(x).done
    }
    sink.next(exports.done)
    sink.return()
}
exports.tap = f => source => sink => source(_tap(sink, f))

function* _filter(sink, f) {
    for (let done = sink.next().done; !done;) {
        let x = yield 0
        if (x === _done) break
        if (f(x)) done = sink.next(x).done
    }
    sink.next(exports.done)
    sink.return()
}
exports.filter = f => source => sink => source(_filter(sink, f))

function* _map(sink, f) {
    for (let done = sink.next().done; !done;) {
        let x = yield 0
        if (x === _done) break
        done = sink.next(f(x)).done
    }
    sink.next(exports.done)
    sink.return()
}
exports.map = f => source => sink => source(_map(sink, f))

function* _reduce(sink, hasSeed, f, seed) {
    let aac = seed
    if (!hasSeed) {
        // this.next = d => {
        //     delete this.next
        //     super.next(this.aac = d)
        // }
    }

    for (let done = sink.next().done; !done;) {
        let x = yield 0
        if (x === _done) break
        aac = f(aac, x)
    }
    sink.next(aac)
    sink.next(_done)
    sink.return()
}

exports.reduce = (...args) => source => sink => source(_reduce(sink, args.length === 2, ...args))


function* _scan(sink, hasSeed, f, seed) {
    let aac = seed
    if (!hasSeed) {
        // this.next = d => {
        //     delete this.next
        //     super.next(this.aac = d)
        // }
    }

    for (let done = sink.next().done; !done;) {
        let x = yield 0
        if (x === _done) break
        done = sink.next(aac = f(aac, x)).done
    }
    sink.next(_done)
    sink.return()
}

exports.scan = (...args) => source => sink => source(_scan(sink, args.length === 2, ...args))