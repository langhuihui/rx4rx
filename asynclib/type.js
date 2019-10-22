class Obserable {
    next(data) {
        this.push({ data })
    }
    push(event) {
        event.target = this
        if (this._next)
            this._next(event)
    }
    complete(err) {
        this.then = f => (f(err), this)
    }
    then(f) {
        this.complete = f
        return this
    }
    dispose() {
        if (this.disposed) return
        this.disposed = true
        if (this.defers)
            this.defers.forEach(observer => observer.dispose())
        if (this.onDispose)
            this.onDispose()
    }
    defer(...observers) {
        if (!this.defers) {
            this.defers = []
        }
        this.defers.push(...observers)
    }

}
exports.Obserable = Obserable
const ObserablePrototype = {
    pipe(...cbs) {
        return cbs.reduce((aac, c) => c(aac), this);
    },
    subscribe(next, error, complete) {
        const obs = this(next)
        return obs.then(err => {
            if (!obs.disposed) {
                if (err) error && error(err)
                else complete && complete()
            }
        })
    }
}
exports.ObserablePrototype = ObserablePrototype
Obserable.define = subClass => Object.setPrototypeOf(_next => {
    const obs = new subClass()
    obs._next = _next
    obs.onSubscribe()
    return obs
}, ObserablePrototype)
// exports.Obserable = f => Object.setPrototypeOf(sink => new Promise(f, sink), ObserablePrototype)