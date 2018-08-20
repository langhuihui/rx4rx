# rxlite 标准的实现库

> rxlite标准请访问[rxlite-std](https://github.com/langhuihui/rxlite-std#readme)

## 安装
```
npm i rxlite
```

## 在node中使用
```js
const {fromEvent,map,subscribe,pipe} = require('rxlite')
pipe(fromEvent(process,'uncaughtException'),map(event=>event.message),subscribe(message=>{
    console.log(message)
}))
```