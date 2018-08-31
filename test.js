const {
    pipe,
    interval,
    subscribe
} = require('./channel')
const dispose = pipe(interval(1000))(subscribe(console.log))
setTimeout(dispose, 3400)