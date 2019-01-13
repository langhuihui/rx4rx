const { Sink } = require('./common')
const { rx, fromEventSource } = require('./index.js')
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
/**
 * VUE EventSource Component
 * @description auto connect and close EventSource
 */
exports.vueEventSource = {
    install(Vue, opt = {}) {
        Vue.component(opt.id || 'EventSource', {
            name: opt.name || "EventSource",
            props: {
                src: {
                    type: String,
                    default: null,
                    required: true
                },
                value: {
                    type: Object
                },
                list: {
                    type: Array,
                    default: () => []
                },//use JSON.parse by default
                json: {
                    type: Boolean,
                    default: true
                },
                desc: {
                    type: Boolean,
                    default: true
                },//init fill the list use first incomeing array data
                init: {
                    type: Boolean,
                    default: true
                }
            },
            watch: {
                desc(v, o) {
                    if (v != o) {
                        this.list.reverse()
                    }
                }
            },
            data() {
                let srcChanged = null
                let destroyed = null
                rx(sink => srcChanged = sink).switchMap(fromEventSource)
                    .takeUntil(sink => destroyed = sink)
                    .subscribe(x => {
                        if (this.json) {
                            const data = JSON.parse(x);
                            if (this.init && data instanceof Array) {
                                if (this.desc) {
                                    this.list.unshift.apply(this.list, data)
                                } else {
                                    this.list.push.apply(this.list, data)
                                }
                                this.$emit('update:list', this.list)
                            }
                            else {
                                this.addData(data);
                            }
                        }
                        else {
                            this.addData(data);
                        }
                    }, e => this.$emit('error', e));
                this.$watch('src', v => srcChanged.next(v), {
                    immediate: true
                })
                return {
                    destroyed
                }
            },
            destroyed() {
                this.destroyed.next(this)
            },
            methods: {
                addData(data) {
                    this.value = data
                    this.$emit('input', data)
                    this.desc ? this.list.unshift(data) : this.list.push(data);
                    this.$emit('update:list', this.list)
                }
            },
            render() {
                return this.$scopedSlots.default(this.list)
            }
        })
    }
}