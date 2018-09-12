const { subscribe, fromArray, filter, pipe, reduce, map, interval } = require('./nodelib')

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
//     reduce(sum, 0),
//     subscribe(console.log))
pipe(fromArray([1, 23, 3]), filter(d => d < 4), reduce(sum, 0), subscribe(console.log, console.error, () => console.log('c')))
    // fromArray([1, 23, 3]).pipe(filter(d => d < 4)).pipe(subscribe(console.log))