const { Observer, Obserable } = require('./type')
exports.map = f => source => Obserable.define(class extends Obserable {
    onSubscribe() {
        const observer = source(event => this.next(f(event.data)))
        this.defer(observer)
        observer.then(() => this.complete())
    }
})