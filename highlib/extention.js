const { Sink } = require('./common')
const { rx } = require('./index.js')
exports.koaEventStream = async function (ctx, next) {
    const sink = new Sink
    const { res, req } = ctx;
    res.writeHead(200, {
        'Content-Type': 'text/event-stream', // <- Important headers
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    sink.next = data => res.write("data: " + JSON.stringify(data) + "\n\n");
    sink.complete = err => res.end();
    sink.defer([clearInterval, null, setInterval(() => res.write(':keep-alive\n\n'), 1000 * 30)]);
    (await next())(sink)
    ctx.respond = false
    req.on("close", () => sink.dispose())
}

exports.vueHookEvent = {
    install(Vue, opt) {
        Vue.mixin({
            destroyed() {
                this.$emit('destroyed')
            }
        })
        Vue.prototype.$fromEvent = function (name) {
            return rx.fromVueEvent(this, name)
        }
    }
}