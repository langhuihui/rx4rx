# rx4rx
Rxjs的4种实现方式


# 背景
本人自从读过一篇来自Info的[《函数式反应型编程(FRP) —— 实时互动应用开发的新思路》](http://www.infoq.com/cn/articles/functional-reactive-programming)后便迷恋上了Rx，甚至以当时的Rxjs库移植了一套适用于Flash的AS3.0的Rx库[ReactiveFl](https://www.oschina.net/p/reactivefl)，也在实际开发中不断实践体会其中的乐趣。最近在知乎上无意中看到有人提到了一个名为callbag的项目，引发了我很大的兴趣，甚至翻墙观看了作者的视频[Callback Heaven - Andre Staltz](https://www.youtube.com/watch?v=HssczgaY9BM)看完视频，我久久不能平静，这是多么的奇思妙想，然而当我运行了作者代码库里面的性能测试的时候，另一个不为人所知的库出现了，叫做Most。这个库性能了得，远远超过同类的库，然后我就想是否可以结合两者的优势，创造出性能高超，但设计巧妙又通俗易懂的Rx库呢？于是我做了如下的尝试：

# RxJs的四种实现方式
1. 实现代码最小的库（受callbag启发）
2. 性能最好的库（参考了Most）
3. 利用js的生成器实现的库（突发奇想）
4. 扩展Nodejs的Stream类实现的库（受Event-Stream的启发）
> 受到以上的启发，我又实现了Golang的Rx库
>	源码请关注我的github，https://github.com/langhuihui

# Rx实现的关键功能

要实现一个Rx库，关键在于实现数据的推送以及消费过程中的四个基本功能：
1. 订阅：即激活Rx数据流的每一个环节，生产者此时可以开始发送数据（某些生产者并不关心是否有人订阅）
2. 发送/接受 数据：生产和消费的核心功能
3. 完成/异常：由生产者发出的事件
4. 取消订阅： 由消费者触发终止数据流，回收所有资源

```bash
生产者
(*)-------------(o)--------------(o)---------------(x)----------------|>
 |               |                |                 |                 |
Start          value            value             error              Done
消费者
(*)-------------(o)--------------(o)---------------(x)----------------|>
 |               |                |                 |                 |
Subscribe      onNext           onNext            onError         onComplete
```

上述过程中，如果用户调用了unSubscribe/Disopse的方法，就可以中断，从而不再触发任何事件

# Rx的两种书写模式
1. 链式编程
2. 管道模式


