const { take, takeUntil, fromArray, timeout, interval, Observer, rx, combineLatest, map, filter } = require('./asynclib')
// pipe(fromArray([1, 2, 3, 4]), take(2), subscribe(console.log, null, () => console.log('complete')))
// let x = interval(1000).pipe(takeUntil(timeout(3400))).subscribe(console.log, null, () => console.log('complete'))
// rx.interval(1000).takeUntil(rx.timeout(3400)).subscribe(console.log, null, () => console.log('complete'))
// setTimeout(() => x.dispose(), 1500)
function even(x) {
    return x % 2 === 0;
}
function add3Arr(arr) {
    return arr[0] + arr[1] + arr[2];
}
var a = new Array(10);
for (var i = 0; i < a.length; ++i) {
    a[i] = i;
}
var asyncLib1 = fromArray(a)
var asyncLib2 = fromArray(a)
var asyncLib3 = fromArray(a)
combineLatest(asyncLib1, asyncLib2, asyncLib3).pipe(map(add3Arr), filter(even)).subscribe(event => { console.log(event.data) }, console.error, () => console.log('complete'))