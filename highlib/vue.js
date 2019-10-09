const { rx } = require('./index')
module.exports = {
    install(Vue, opt) {
        function render(h) {
            return h()
        }
        Vue.component('Pipe', {
            functional: true,
            render(h, ctx) {
                console.log(ctx.children)
                return h()
            }
        })
        Vue.component('Observable', {
            render
        })
        Vue.component('Subject', {
            props: ['source'],
            data() {
                return {
                    value
                }
            },
            created() {
                this.value = rx.subject(this.source)
            },
            render
        })
        Vue.component('Subscriber', {
            props: ['source', 'enabled'],
            data() {
                return {
                    disposble: null
                }
            },
            created() {
                this.$watch('enabled', v => {
                    if (!v) {
                        if (this.disposble) this.disposble.dispose()
                        this.disposble = null
                    } else {
                        this.disposble = this.source.subscribe(d => this.$emit('next', d), e => e ? this.$emit('error', e) : this.$emit('complete'))
                    }
                }, {
                        immediate: true
                    })
            },
            distroyed() {
                if (this.disposble) this.disposble.dispose()
            },
            render
        })
    }
}