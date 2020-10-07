exports.eventHandler = (once = true) => {
    const observers = new Set()
    const observable = sink => {
        observers.add(sink)
        sink.defer([observers.delete, observers, sink])
    }
    if (once)
        observable.handler = (...args) => {
            const arg = args.length > 1 ? args : args[0]
            observers.forEach(observer => {
                observer.next(arg)
                observer.complete()
            })
        }
    else
        observable.handler = (...args) => {
            const arg = args.length > 1 ? args : args[0]
            observers.forEach(observer => observer.next(arg))
        }
    return observable
}
exports.fromLifeHook = (hook, once = true) => hook(exports.eventHandler(once).handler)