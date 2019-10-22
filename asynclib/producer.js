const { Obserable } = require('./type')
exports.fromArray = array => Obserable.define(class extends Obserable {
    onSubscribe() {
        const l = array.length
        for (let i = 0; i < l; i++) {
            this.next(array[i])
            if (this.disposed) {
                return this.complete()
            }
        }
    }
})
exports.interval = period => Obserable.define(class extends Obserable {
    onDispose() {
        clearInterval(this.id)
        this.complete()
    }
    onSubscribe() {
        let index = 0
        this.id = setInterval(() => this.next(index++), period)
    }
})
exports.timeout = period => Obserable.define(class extends Obserable {
    onDispose() {
        clearTimeout(this.id)
        this.complete()
    }
    onSubscribe() {
        this.id = setTimeout(() => {
            this.next(new Date())
            this.complete()
        }, period)
    }
})