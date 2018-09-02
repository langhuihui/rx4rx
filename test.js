const {
    pipe,
    interval,
    subscribe,
    filter,
    map,
    reduce,
    fromArray
} = require('./channel')

function add1(x) {
    return x + 1;
}

function even(x) {
    return x % 2 === 0;
}

function sum(x, y) {
    return x + y;
}

pipe(fromArray([1, 2, 3, 4, 5]),
    filter(even),
    map(add1),
    reduce(sum, 0))(subscribe(console.log))