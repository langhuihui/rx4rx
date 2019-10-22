const { Observer, Obserable } = require('./type')

exports.combineLatest = (...sources) => Obserable.define(class extends Obserable {
    onSubscribe() {
        const buffer = []
        const observers = []
        const count = sources.length
        let life = count
        let runCount = 0
        for (let i = 0; i < count; i++) {
            observers[i] = sources[i](event => {
                if (buffer[i] === void 0)
                    runCount++
                buffer[i] = event.data
                if (runCount == count) {
                    this.next(buffer)
                }
            }).then(err => {
                if (--life == 0 || buffer[i] === void 0) {
                    this.complete()
                }
            })
        }
        this.defer(...observers)
    }
})
