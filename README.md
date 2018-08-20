# rxlite-std
A standard for creating reactive program library faster and more lightweight than rxjs

-------

> * 轻量级,标准库实现使用了极小的代码
> * 高性能，标准库实现性能高于rxjs2倍多，略高于callbag
> * 没有核心库，只是一份**标准**，任何人可以基于此标准编写自己的库（标准库的实现可以参考[rxlite-stdlib](https://github.com/langhuihui/rxlite-std/tree/master/stdlib)）
> * 比callbag更容易理解和扩展自己的实用库

## 概述

* 数据源(Observable)、操作符(operator)、观察者(Observer)都是形如`(next:Function,complete:Function)=>Function`的一个函数
* 调用上述的函数，意味着激活，类似"subscribe" on Observables
* 在函数内部调用传入的next函数，意味着发送数据，类似"next" on Observers
* 在函数内部调用传入的complete函数，意味着完成，类似"complete" on Observers
* 调用函数返回的那个函数，意味着终止，类似"unsubscribe" on Subscriptions

## 详细说明

`(next:Function,complete:Function)=>Function`

### 概念

* Callbag:形如`(next:Function,complete:Function)=>Function`的一个函数
* Source: 是一个Callbag，负责产生数据
* Deliver:是数据传递者类似rxjs中数百个操作符，一般是形如`source:Callbag => Callbag`这样的函数
* Sink: 是数据消费者

### 协议

#### 激活Callbag
- 调用Callbag就是激活Callbag,调用Callbag的时候必须传入两个函数，且只能传入两个函数
- 第一个函数next，是形如`(data:any,stop:Function)=>void`的函数，data是传过来的数据，stop是传过来的终止函数，和Callbag返回的函数的功能一致，只是为了更方便在接收到数据时及时终止Callbag的数据发送
- Callbag每次调用都会激活一个新的数据流

#### 终止Callbag数据流
- Callbag一旦激活，就变成了一个终止函数（Callbag的返回值），调用该终止函数就会使得Callbag停止发送数据
- Callbag终止函数允许调用多次，但不会影响程序的行为
- Callbag一旦终止，就永远不会，且不能再发送数据
- Callbag发送数据的时候会带上stop函数，功能同终止函数

#### Callbag完成事件
- Callbag数据发送完成后，调用complete函数
- 如果数据传输出错，将错误信息传入complete函数
- 允许多次调用complete函数，但不能改变程序的行为（由subscribe封装，保证最终只调用一次外部传入的complete回调）
- 上一条的目的是为了使得扩展库代码更加简练，所以subscribe建议采用标准库的写法

### 实现示例

> 创建一个数据源Callbag 激活后发送数字1，2，3，然后完成
```js
const cb123 = (n,c)=>{
    const stop = ()=>c=null
    n(1,stop)
    c && n(2,stop)
    c && n(3,stop)
    c && c()
    return stop
}
```

> 激活cb123,然后打印接受的数字，完成后打印‘complete’
```js
const log123 = cb123((d,s)=>{
    console.log(d)
},err=>{
    console.log('complete')
})
```

> 编写一个Deliver,在收到2的时候终止source,并完成数据流
```js
const stop123 = source=>(n,c)=>{
   return source((d,s)=>{
       if(d===2){s();c()}
       else n(d,s)
   },c)
}
```

> 激活带有stop123的cb123,然后打印接受的数字，完成后打印‘complete’

```js
stop123(cb123)((d,s)=>{
    console.log(d)
},err=>{
    console.log('complete')
})
```


### 部分标准库源码实例

> 可以说充分利用了js的语法特性，做到了极致的精简

```js
const noop = () => {}

exports.pipe = (first, ...cbs) => cbs.reduce((aac, c) => c(aac), first);

exports.subscribe = (n, e = noop, c = noop) => source => source(n, once(err => err ? e(err) : c()))

exports.fromArray = array => (n, c) => {
    let pos = 0;
    const l = array.length;
    const close = () => (pos = l, c = noop);
    while (pos < l) n(array[pos++], close)
    c()
    return close;
}

exports.never = n => noop

exports.takeWhile = f => source => (n, c) => source((d, s) => f(d) ? n(d, s) : (s(), c()), c)

exports.filter = f => source => (n, c) => source((d, s) => f(d) && n(d, s), c)

exports.map = f => source => (n, c) => source((d, s) => n(f(d), s), c);

exports.tap = f => source => (n, c) => source((d, s) => (f(d), n(d, s)), c);
```

## 响应式编程的深层思考

从rxjs到[callbag](https://github.com/callbag/callbag)可以说是一次大的抽象，然而callbag的形式过于灵活，编写扩展库非常烧脑。rxlite采用折中策略
使得形式容易理解，功能更加明确，代码也是非常简洁。

这些得益于js可以用于函数式编程，又是弱类型语言所致，所有的中间状态均存放于函数定义时所处的作用域里面，即闭包。在使用面向对象的方式时，
本质上仍然是函数调用，只不过将状态变量存放于创建的Object中而已。

callbag的形式其实本质非常类似Promise，我们看到当我们创建一个Promise的时候`new Promise((resolve,reject)=>{})`
形式非常类似调用`(next,complete)=>{}`，当然promise只能接受一次数据，这就是区别了。

为了能在同步发送数据的过程中终止数据流，不得已在next函数中附带stop方法，否则整个标准库的形式将更加简练,性能也会更好。

为了整个库的轻量级，去掉Scheduler功能，在js的语境中，使用率非常低，如果真出现这种需求，可以自己编写扩展，也是分分钟的事情。

