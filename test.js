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

// let high = require('./highlib')
// const keys = Object.keys(high).filter(key => {
//     switch (key) {
//         case 'Sink':
//         case 'pipe':
//         case 'reusePipe':
//             return false
//         default:
//             return true
//     }
// })
// const prototype = keys.reduce((aac, c) =>
//     Object.defineProperty(aac, c, {
//         get() {
//             return (...args) => Object.setPrototypeOf(high[c](...args)(this), prototype)
//         }
//     }), {})

// const rx = f => Object.setPrototypeOf(f, prototype)
// keys.forEach(key => {
//         Object.defineProperty(rx, key, {
//             get() {
//                 return (...args) => Object.setPrototypeOf(high[key](...args), prototype)
//             }
//         })
//     })
const rx = require('./highlib').rx
rx.interval(1000).skipUntil(rx.of(1).delay(3000)).subscribe(console.log)
    // rx.fromArray([1, 2, 3, 4, 5]).filter(even).map(add1).reduce(sum, 0).subscribe(console.log)