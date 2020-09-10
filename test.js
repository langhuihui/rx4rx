// const {
//     pipe,
//     interval,
//     subscribe,
//     filter,
//     map,
//     reduce,
//     fromArray
// } = require('./channel')

function add1(x) {
    return x + 1;
}

function even(x) {
    return x % 2 === 0;
}

function sum(x, y) {
    return x + y;
}

// pipe(fromArray([1, 2, 3, 4, 5]),
//     filter(even),
//     map(add1),
//     reduce(sum, 0))(subscribe(console.log))

let high = require('./highlib')
const prototype = {}
const rx = f => Object.setPrototypeOf(f, prototype)
rx.set = ext => {
    for (let key in ext) {
        const f = ext[key]
        switch (key) {
            case 'Sink':
            case 'pipe':
            case 'reusePipe':
                break
            case 'subscribe':
                prototype[key] = function(...args) { return f(...args)(this) }
                break
            case 'toPromise':
                prototype[key] = function() { return f(this) }
                break
            default:
                prototype[key] = function(...args) { return rx(f(...args)(this)) }
                rx[key] = (...args) => rx(f(...args))
        }
    }
}
rx.set(high)
rx.interval(1000).throttle(()=>rx.never()).subscribe(console.log)
    // const rx = require('./highlib').rx
//rx.interval(1000).skipUntil(rx.of(1).delay(3000)).subscribe(console.log)
    // rx.fromArray([1, 2, 3, 4, 5]).filter(even).map(add1).reduce(sum, 0).subscribe(console.log)