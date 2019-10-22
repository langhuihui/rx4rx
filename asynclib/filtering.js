const { Obserable } = require('./type')
exports.filter = f => source => Obserable.define(class extends Obserable {
    onSubscribe() {
        this.defer(source(event => f(event.data) && this.push(event)).then(() => this.complete()))
    }
})
exports.take = count => source => Obserable.define(class extends Obserable {
    onSubscribe() {
        let _count = count
        this.defer(source(event => {
            sink.push(event)
            if (--_count === 0) {
                event.target.dispose()
            }
        }).then(() => this.complete()))
    }
})
exports.takeUntil = until => source => Obserable.define(class extends Obserable {
    onSubscribe() {
        const untilObserver = until(event => {
            event.target.dispose()
            obs.dispose()
        })
        const obs = source(this._next)
        this.defer(untilObserver, obs)
        obs.then(() => this.complete())
    }
})