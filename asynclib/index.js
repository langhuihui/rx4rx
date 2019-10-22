Object.assign(exports, require('./type'))
//将一个Observable函数的原型修改为具有所有operator的方法
const rx = f => Object.setPrototypeOf(f, exports.ObserablePrototype);
//提供动态添加Obserable以及operator的方法
rx.set = ext => {
    Object.assign(exports, ext)
    Object.assign(rx, ext)
    for (let key in ext) {
        const f = ext[key]
        exports.ObserablePrototype[key] = function (...args) { return f(...args)(this) }
    }
}
rx.set(require('./filtering'))
rx.set(require('./producer'))
rx.set(require('./combination'))
rx.set(require('./transformation'))
exports.rx = rx