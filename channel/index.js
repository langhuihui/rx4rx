exports.pipe = (first, ...cbs) => cbs.reduce((aac, c) => c(aac), first);
exports.fromArray = array => sink => {
    for (let i = 0, l = array.length, done = false; i < l && !done; i++) {
        done = sink.next(array[i]).done
    }
    sink.return(exports.done)
}
exports.of = (...items) => exports.fromArray(items)

exports.done = Symbol('done')

function* subscribe(n, e, c) {
    while (true) {
        try {
            let result = yield 0
            while (result !== exports.done) {
                if (n(result)) return 0
                result = yield 0
            }
            c && c()
        } catch (err) {
            e && e(err)
        }
    }
}

exports.interval = period => sink => {
    let i = 0;
    const id = setInterval(() => sink.next(i++).done && clearInterval(id), period)
    return () => clearInterval(id)
}
exports.subscribe = subscribe