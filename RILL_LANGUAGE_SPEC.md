# Rill 响应式语言规范（草案）

版本：0.1.0-draft  
文件扩展名：`.rill`

## 1. 定位

Rill 是一门用于描述响应式数据流的领域语言。它以缩进和管道作为表面语法，以统一的表达式树作为内部表示，并可编译到 RxJS、fastrx 或其他响应式运行时。

Rill 不试图替代 TypeScript、JavaScript 或宿主 UI 框架。它负责表达以下内容：

- 数据如何随时间产生；
- 数据如何被转换和组合；
- 异步任务何时启动、取消或重试；
- 错误如何进入和离开数据流；
- 订阅及其资源在什么作用域内存活；
- 数据流如何被可视化、调试和监控。

设计目标：

1. **语义少于语法**：少量核心概念承载大多数操作符。
2. **时间显式**：延迟、窗口、并发和取消不能隐藏在普通函数调用中。
3. **生命周期结构化**：离开词法作用域时自动释放订阅和资源。
4. **错误有类型**：错误通道是类型的一部分。
5. **代码即数据流图**：源码必须能够无损转换为可分析的图结构。
6. **运行时可替换**：语言语义不依赖某个具体 Rx 库。
7. **默认可观测**：编译产物保留调试和监控所需的稳定节点信息。

非目标：

- 提供通用系统编程能力；
- 隐式解决分布式一致性；
- 将所有异步 API 自动解释为响应式数据流；
- 保证任意外部副作用都可以确定性重放；
- 用最少字符进行代码高尔夫。

## 2. 核心概念

Rill 区分四类时序值：

```text
Task<T, E>       最多产生一个值，随后完成或失败
Stream<T, E>     随时间产生零到多个值，随后完成或失败
Signal<T>        始终拥有当前值，可产生变更事件
Channel<T, E>    共享的热事件源，是否有观察者都可能产生事件
```

其中：

- `Task` 默认是惰性的，每次求值启动一次任务；
- `Stream` 默认是冷流，每次观察建立独立执行；
- `Signal` 不完成也不失败，其 `changes` 属性是 `Stream<T, Never>`；
- `Channel` 是热流，必须显式声明，以防无意共享副作用。

`Never` 表示不可能出现的错误类型。

### 2.1 事件模型

流的事件定义为：

```text
Event<T, E> = Value(T) | Error(E) | Done
```

数学表示：

\[
Event(T,E)=T+E+1
\]

一个最小流可表示为：

\[
Stream(T,E)=(Event(T,E)\rightarrow Unit)\rightarrow Cancel
\]

其中：

\[
Cancel=Unit\rightarrow Unit
\]

所有运行时必须满足：

1. `Error` 和 `Done` 是终止事件；
2. 每个执行最多产生一个终止事件；
3. 终止后不得产生 `Value`；
4. `Cancel` 必须幂等；
5. 取消后不得向下游发送事件；
6. 取消必须沿依赖方向传播到仍然存活的上游；
7. 用户回调抛出的异常不得破坏运行时内部状态。

### 2.2 操作符

普通操作符是流之间的函数：

\[
Operator(A,B,E_1,E_2)=Stream(A,E_1)\rightarrow Stream(B,E_2)
\]

`|` 表示从上到下的函数应用：

```rill
source
| filter .active
| map .name
| distinct
```

等价于：

```text
distinct(map(.name, filter(.active, source)))
```

也等价于 Lisp 风格的内部形式：

```clojure
(pipe source
      (filter .active)
      (map .name)
      distinct)
```

## 3. 词法与布局

### 3.1 基本规则

- 源文件使用 UTF-8；
- 换行结束当前简单表达式；
- 缩进建立代码块，同一代码块必须使用一致的缩进宽度；
- 推荐使用两个空格，制表符不得与空格混用；
- `#` 开始单行注释；
- `:` 引入缩进块；
- `|` 只能出现在管道的后续行；
- 括号仅用于显式分组和与宿主语言互操作；
- 语言不定义运算符优先级；混合运算必须显式分组。

```rill
# 用户搜索数据流
stream results: Stream<Item[], HttpError>:
  query.changes
  | debounce 300ms
  | distinct
```

### 3.2 标识符

普通标识符使用 `camelCase`，类型使用 `PascalCase`：

```text
query
searchResults
HttpError
UserProfile
```

操作符名称可以包含中划线，以便定义接近自然语言的宏：

```text
drop-oldest
on-error-resume
```

实现必须在模块边界检查中划线名称与宿主语言名称的映射冲突。

### 3.3 字面量

```rill
42
3.14
true
"hello"
[1, 2, 3]
{name: "Ada", active: true}
100ms
2s
5min
1h
```

时间字面量在内部统一转换为带单位的 `Duration`，不得直接退化为无类型整数。

### 3.4 成员选择器

以 `.` 开头的成员选择器是单参数函数：

```rill
map .name
filter .active
sort-by .createdAt
```

`.user.name` 等价于：

```rill
x => x.user.name
```

当字段不存在时，行为由静态类型决定，不允许默认返回 `undefined`。

## 4. 声明

### 4.1 模块

每个 `.rill` 文件都是一个模块：

```rill
import http from "@rill/http"
import {User, Item} from "./types"

export flow search(query: Signal<Text>) -> Stream<Item[], HttpError>:
  # ...
```

循环模块依赖是静态错误。

### 4.2 Signal

```rill
signal query: Text = ""
signal online: Bool = system.online
```

Signal 更新必须显式进行：

```rill
set query = input.value
```

派生 Signal 使用 `derive`：

```rill
signal canSubmit: Bool = derive:
  query.length > 0 and online
```

派生 Signal 不允许直接执行 IO。

### 4.3 Stream

```rill
stream clicks: Stream<Click, Never>:
  event "#save" "click"
```

冷流声明的主体在每次观察时执行。需要共享时必须使用 `share` 或声明 `channel`。

### 4.4 Channel

```rill
channel messages: Channel<Message, SocketError>:
  websocket "/events"
```

Channel 必须定义以下策略之一：

```rill
channel messages:
  websocket "/events"
  | retain none

channel currentUser:
  auth.userEvents
  | retain latest
```

这避免订阅者对历史值是否重放产生歧义。

### 4.5 Task

```rill
task loadUser(id: UserId) -> Task<User, HttpError>:
  http.get "/users/{id}" id=id
```

Task 可以通过 `await` 在 Task 内求值，也可以通过 `latest`、`concat` 或 `parallel` 提升为 Stream。

### 4.6 Flow

`flow` 定义可复用的数据流构造函数：

```rill
export flow search(query: Signal<Text>) -> Stream<Item[], SearchError>:
  query.changes
  | debounce 300ms
  | distinct
  | latest q:
      http.get "/search" query=q
  | retry 3 backoff: 200ms
  | map .items
```

Flow 本身不启动执行。只有 `watch`、宿主框架适配器或显式导出到外部订阅者时才建立执行。

### 4.7 Operator

```rill
operator activeNames:
  filter .active
  | map .name
  | distinct
```

带类型参数的形式：

```rill
operator nonEmpty<T>(source: Stream<T?, E>) -> Stream<T, E>:
  source
  | filter value => value is not null
```

普通操作符不能隐式订阅输入源。

## 5. 表达式

### 5.1 管道

```rill
source
| map transform
| filter predicate
| take 10
```

管道每一行只接受上一步的一个主输出。产生多个命名输出的操作符必须返回记录：

```rill
signal split:
  source
  | partition .valid

stream valid = split.pass
stream invalid = split.fail
```

### 5.2 Lambda

单表达式 Lambda：

```rill
map user => user.name
```

块 Lambda：

```rill
map user:
  let displayName = user.nickname ?? user.name
  {id: user.id, displayName}
```

### 5.3 模式匹配

```rill
map event:
  match event:
    UserCreated user: normalize user
    UserDeleted id:   tombstone id
```

对封闭联合类型的匹配必须穷尽所有分支。

### 5.4 条件

```rill
if online:
  remoteData
else:
  cachedData
```

当条件本身是 Signal 时，`if` 构造派生 Signal；当条件是普通 Bool 时，`if` 是普通表达式。编译器不得根据运行时值改变表达式种类。

## 6. 标准时序操作符

### 6.1 纯变换

```text
map<A, B, E>(A -> B)                    Stream<A, E> -> Stream<B, E>
filter<A, E>(A -> Bool)                 Stream<A, E> -> Stream<A, E>
scan<A, B, E>((B, A) -> B, B)          Stream<A, E> -> Stream<B, E>
distinct<A, E>(key?: A -> K)            Stream<A, E> -> Stream<A, E>
take<A, E>(Count)                       Stream<A, E> -> Stream<A, E>
```

连续的纯 `map`、`filter`、`scan` 可以由编译器融合，但融合不得改变：

- 回调调用顺序；
- 错误位置；
- 调试断点语义；
- 监控节点的逻辑身份。

### 6.2 组合

```rill
stream activity:
  merge mouse.clicks keyboard.keys

signal profile:
  combine user permissions:
    {name: user.name, canEdit: permissions contains "edit"}
```

标准组合语义：

- `merge`：任一输入产生值时立即向下游发送；
- `concat`：前一输入完成后再订阅后一输入；
- `zip`：按每个输入的序号配对；
- `combine`：所有输入至少产生一个值后，任一输入更新即重新计算；
- `race`：第一个产生值或终止事件的输入获胜，其余输入被取消。

### 6.3 高阶流

```rill
source
| latest value:
    request value

source
| serial value:
    save value

source
| parallel 4 value:
    transform value
```

- `latest`：新值到达时取消上一个内部执行，对应 `switchMap`；
- `serial`：等待上一个内部执行完成，对应 `concatMap`；
- `parallel n`：最多同时执行 `n` 个内部任务；
- `exhaust`：内部执行存活时忽略新的外部值。

禁止使用含义不明确的通用 `flatMap` 名称。

### 6.4 时间

```rill
source
| debounce 300ms
| timeout 2s
| window 1min
```

所有时间操作符接受可注入的 `Clock`。测试环境默认使用虚拟时钟，生产环境默认使用单调时钟。日历时间必须显式通过 `WallClock` 获取。

### 6.5 背压

```rill
socket.messages
| buffer 100 drop oldest
| parallel 4 message:
    persist message
```

有界缓冲区必须声明溢出策略：

```text
drop oldest
drop newest
fail BufferOverflow
block
```

`block` 仅适用于支持需求反馈的源；对 DOM 事件等不可暂停源使用 `block` 是静态错误或后端能力错误。

## 7. 错误

错误属于流类型：

```rill
Stream<User, HttpError>
```

错误处理：

```rill
source
| recover HttpError.NotFound:
    cachedUser
| recover error:
    fail AppError.from error
```

重试：

```rill
source
| retry 3 backoff: 200ms jitter: 20%
```

规则：

1. `retry` 重新建立上游执行，不重复使用已终止的订阅；
2. 具有副作用的任务默认不得自动重试；
3. 可重试任务必须声明 `@idempotent`，或提供幂等键；
4. 未处理错误可以保留在导出类型中；
5. `watch` 必须处理错误，除非错误类型为 `Never`；
6. 运行时缺陷和用户数据错误必须使用不同错误域。

## 8. 生命周期与资源

### 8.1 Watch

`watch` 是主要执行边界：

```rill
scope dashboard:
  watch results:
    value items: render items
    error err:   show-error err
    done:        hide-loading
```

离开 `scope dashboard` 时，内部所有 Watch、Task、定时器和已注册资源按后创建先释放的顺序取消。

### 8.2 Using

外部资源使用 `using`：

```rill
stream lines:
  using file = fs.open "/tmp/events.log"
  file.lines
```

资源必须实现：

```text
Resource.acquire() -> Handle
Resource.release(Handle) -> Unit
```

无论正常完成、失败还是取消，`release` 都必须执行一次。

### 8.3 取消传播

取消是结构化的：

```text
Scope
  └─ Watch
      ├─ Source
      ├─ Timer
      └─ Inner Task
```

父节点取消必须取消所有子节点。子节点完成不自动取消兄弟节点，除非组合操作符的语义明确要求这样做，例如 `race`。

## 9. 并发与执行上下文

Rill 不允许全局隐式 Scheduler。执行上下文在异步边界声明：

```rill
source
| run-on worker
| map expensiveTransform
| observe-on ui
```

运行时必须保证单个逻辑订阅内的事件序列化送达，除非类型显式标记为：

```text
UnorderedStream<T, E>
```

`parallel` 默认保持输入顺序；使用 `parallel unordered 4` 才允许按完成顺序输出。

跨线程或跨进程边界要求值满足 `Send` 能力。编译器必须拒绝传递 DOM 节点、文件句柄等不可传输对象。

## 10. 宿主语言互操作

首个标准宿主目标是 TypeScript。

```rill
import http from "@app/http"
import type {Item, HttpError} from "./types"
```

Rill 导出的 Flow 编译为普通函数：

```rill
export flow search(query: Signal<Text>) -> Stream<Item[], HttpError>:
  # ...
```

概念上生成：

```ts
export function search(
  query: Signal<string>
): Stream<Item[], HttpError>
```

宿主值进入 Rill 前必须通过适配器：

```text
fromPromise
fromEvent
fromAsyncIterable
toObservable
toAsyncIterable
```

不得根据对象是否具有 `then`、`next` 等属性进行隐式鸭子类型转换。

## 11. 编译模型

标准编译流程：

```text
.rill 源码
  → 布局解析
  → 统一语法树
  → 名称与类型检查
  → 响应式图 IR
  → 优化
  → 后端代码
  → source map + graph map
```

### 11.1 响应式图 IR

每个声明生成一个有向图。节点至少包含：

```json
{
  "id": "search/results/debounce",
  "kind": "operator",
  "operator": "debounce",
  "inputType": "Stream<Text, Never>",
  "outputType": "Stream<Text, Never>",
  "temperature": "cold",
  "source": {
    "file": "search.rill",
    "start": [6, 5],
    "end": [6, 19]
  },
  "attributes": {
    "duration": "300ms"
  }
}
```

边至少包含：

```json
{
  "from": "search/query/changes",
  "to": "search/results/debounce",
  "channel": "value",
  "cancellable": true
}
```

节点 ID 必须在不改变声明名称和相对结构的普通格式化操作后保持稳定。需要跨重构维持监控连续性时，可以显式指定：

```rill
@id "search-api"
| latest q:
    http.get "/search" query=q
```

同一模块中重复的显式 ID 是编译错误。

### 11.2 后端

首选后端：

```text
rxjs       生产环境参考后端
fastrx     高性能实验后端
native     未来的极简原生后端
```

后端必须通过一致性测试，验证终止、错误、取消、时间和组合语义。未实现某项能力时必须在编译期报错，不得静默降级。

### 11.3 优化

允许的优化包括：

- 纯操作符融合；
- 常量折叠；
- 无效分支删除；
- Signal 依赖去重；
- 批量调度；
- 不跨越异步边界的内联。

优化后的物理节点必须保留逻辑节点映射，使断点、可视化和指标仍然对应源码。

## 12. IDE 可视化规范

IDE 插件应同时提供静态图和运行时图。

### 12.1 静态图

静态图来自 Graph IR，不需要启动应用。它应显示：

- Source、Operator、Task、Signal、Channel 和 Watch；
- 值、错误、完成及取消边；
- 冷流与热流；
- 异步边界和执行上下文；
- 缓冲区及溢出策略；
- 推断后的输入输出类型；
- 可能未处理的错误；
- 共享和重复订阅位置；
- 编译器融合后的物理执行组。

推荐视觉约定：

```text
圆角矩形   普通操作符
圆形       Source
双边框     Channel 或共享热流
菱形       分支、匹配或错误路由
六边形     外部副作用
实线       Value
红色虚线   Error
灰色虚线   Cancel
```

IDE 必须支持源码与图双向定位：

- 点击源码高亮节点；
- 点击节点跳转源码；
- 重命名声明同步更新节点；
- 展开宏或自定义 Operator；
- 在逻辑图和优化后物理图之间切换。

### 12.2 运行时覆盖层

应用连接调试协议后，静态图可叠加：

- 当前订阅数量；
- 每秒事件数；
- 最后一个事件的相对时间；
- 缓冲区占用；
- 当前活跃 Task；
- 最近错误和重试次数；
- 取消传播动画；
- 节点延迟的热力图。

运行时值默认只显示类型和摘要，用户必须主动展开具体值。敏感字段必须在进入 IDE 前完成脱敏。

### 12.3 大图处理

IDE 不应一次渲染所有节点。必须支持：

- 按模块、Scope 或 Flow 折叠；
- 隐藏纯映射节点；
- 只显示异步边界；
- 从一个节点向上游或下游追踪；
- 按错误、延迟、吞吐或订阅数量过滤；
- 将宏和融合组显示为单个复合节点。

## 13. 调试规范

### 13.1 调试事件

调试运行时以统一信封报告事件：

```json
{
  "traceId": "01J...",
  "subscriptionId": "sub-42",
  "nodeId": "search/results/debounce",
  "sequence": 17,
  "kind": "value",
  "monotonicTime": 15342.44,
  "wallTime": "2026-07-31T02:00:00Z",
  "payload": {"summary": "Text(12)", "ref": "value-91"}
}
```

`kind` 可以是：

```text
subscribe
value
error
done
cancel
task-start
task-end
buffer
retry
```

### 13.2 断点

IDE 应支持：

- 节点收到值前断点；
- 节点发送值后断点；
- 错误断点；
- 第 N 个事件断点；
- 条件断点；
- 缓冲区达到阈值断点；
- Task 启动、完成或被取消时断点。

断点暂停的是所属逻辑 Scope，不应默认冻结整个进程。若后端无法局部暂停，IDE 必须明确提示其影响。

源码也可以声明临时探针：

```rill
source
| inspect "after-normalize"
| map normalize
```

`inspect` 在生产构建中默认移除，除非构建配置保留。

### 13.3 虚拟时间

测试和离线调试使用虚拟时钟：

```rill
test "debounces input" with clock virtual:
  let input = channel<Text> retain none
  let output = search input

  emit input "r"
  advance 100ms
  emit input "rx"
  advance 300ms

  expect output values ["rx"]
```

时间操作符必须只依赖注入的 Clock，禁止直接读取宿主的 `Date.now()`。

### 13.4 记录与重放

调试器可以记录：

- 外部 Source 输入；
- Signal 更新；
- Clock 变化；
- 随机数种子；
- 外部 Task 的结果摘要或替身引用；
- 订阅、终止和取消顺序。

重放只保证 Rill 图内部的确定性。网络、文件、数据库和 UI 等副作用必须由可重放 Adapter 替换，或标记为：

```text
@nonreplayable
```

调试器不得宣称能够无条件回滚真实世界副作用。

### 13.5 因果追踪

每个值携带不可见的因果上下文。IDE 可回答：

- 这个值来自哪个 Source？
- 哪些上游值参与了本次 `combine`？
- 哪个新值取消了 `latest` 中的旧 Task？
- 这个错误经过哪些 `recover` 或 `retry` 节点？
- 哪个 Scope 创建并最终取消了该订阅？

为避免无限增长，因果链允许采样和截断，但截断必须显式标记。

## 14. 运行时监控规范

调试面向单次开发会话，监控面向长期运行的生产系统。两者共享 Node ID 和 Graph IR，但采用不同的数据量和隐私策略。

### 14.1 指标

每个可监控节点可暴露：

```text
rill_subscriptions_active
rill_events_total{kind}
rill_errors_total{error_type}
rill_cancellations_total{reason}
rill_retries_total
rill_task_duration
rill_operator_latency
rill_buffer_size
rill_buffer_dropped_total
rill_event_lag
```

默认只在以下边界创建指标：

- Source；
- 外部 Task；
- Channel；
- 共享节点；
- 异步或线程边界；
- Watch；
- 显式 `@observe` 节点。

不应默认给每个 `map` 创建独立指标，以免产生性能和基数开销。

### 14.2 Trace

Rill 应支持 OpenTelemetry 上下文传播。

推荐策略：

- 一次外部输入建立根 Trace 或继承宿主 Trace；
- 外部 Task 建立 Span；
- `latest` 取消旧 Task 时记录取消事件；
- `retry` 的每次尝试建立链接或子 Span；
- `combine` 使用 Span Link 表达多个因果输入；
- 不为每个普通值自动建立 Span。

### 14.3 日志

结构化日志至少包含：

```text
service
module
flow
node_id
subscription_id
trace_id
event_kind
error_type
duration
```

事件载荷默认不进入日志。允许通过显式策略记录摘要：

```rill
@observe payload: fields(id, status)
| latest order:
    submit order
```

### 14.4 健康状态

Flow 可以声明服务级目标：

```rill
@health:
  error-rate < 1%
  p95-latency < 500ms
  buffer-usage < 80%
flow checkout(...):
  # ...
```

这些声明生成监控元数据，而不是改变业务执行语义。告警系统是否采用该目标由部署配置决定。

### 14.5 开销控制

监控实现必须支持：

- 全局开关；
- 按 Flow、节点和错误类型采样；
- 指标聚合；
- 调试载荷与生产指标分离；
- 有界内存队列；
- 导出失败时丢弃监控数据而非阻塞业务流；
- 对监控自身的丢弃数量进行计数。

运行时不得因为监控后端不可用而改变业务流的完成、错误或取消行为。

### 14.6 隐私与安全

类型可以标注敏感字段：

```rill
type User:
  id: UserId
  @sensitive email: Text
  @secret token: Text
```

规则：

- `@secret` 永远不得进入调试载荷、日志或 Trace；
- `@sensitive` 默认只显示类型和哈希摘要；
- IDE 请求展开敏感值时必须经过运行时策略授权；
- 自定义格式化器不得绕过字段策略；
- Graph IR 可以包含类型，不得包含运行时秘密。

## 15. 测试

Rill 测试以事件序列和虚拟时间为核心：

```rill
test "latest cancels stale request" with clock virtual:
  let query = channel<Text> retain none
  let api = fake task<Text, Result>

  let results:
    query
    | latest q:
        api q

  emit query "first"
  advance 10ms
  emit query "second"
  resolve api("first") with oldResult
  resolve api("second") with newResult

  expect results values [newResult]
  expect api("first") cancelled
```

一致性测试还应覆盖：

- 终止后无事件；
- 重复取消无副作用；
- `race` 取消失败者；
- `using` 始终释放资源；
- 热流重放策略；
- 缓冲区溢出；
- 调试模式与优化模式的可观察行为一致。

## 16. 框架集成

React、Vue 等框架通过 Adapter 使用 Rill，不在语言核心中加入框架关键字。

概念 API：

```ts
const results = useRill(() => search(query))
```

Adapter 必须：

- 将组件生命周期映射为 Rill Scope；
- 组件卸载时取消 Scope；
- 避免渲染期间隐式启动副作用；
- 支持服务端渲染时禁用不安全 Source；
- 将框架状态显式转换为 Signal；
- 保留 Node ID、Trace 和 source map。

## 17. 宏与扩展

Rill 的统一语法树允许宏扩展，但宏不能直接接触运行时值：

```rill
macro resilient-request(source, attempts=3):
  source
  | timeout 2s
  | retry attempts backoff: 200ms
```

宏展开必须：

- 生成合法的 Graph IR；
- 保留调用点和展开定义的双重 source map；
- 避免名称捕获；
- 可在 IDE 中折叠或展开；
- 不能绕过错误和能力检查。

首版编译器可以暂不开放用户宏，但内部表示不得阻碍未来支持。

## 18. 能力与静态诊断

后端通过能力集合声明支持范围：

```text
time
backpressure
threads
record-replay
hot-stream
otel
local-breakpoint
```

典型静态诊断：

```text
RILL1001  Watch 未处理 HttpError
RILL1102  对不可暂停 Source 使用 block 背压
RILL1201  Channel 未声明 retain 策略
RILL1304  非幂等 Task 被 retry
RILL1402  值不能跨 worker 边界发送
RILL1501  运行时后端不支持局部断点
RILL1603  监控标签可能产生无界基数
```

诊断必须包含源码位置、相关图节点及可执行的修复建议。

## 19. 最小实现范围

可用于真实项目验证的最小版本包括：

1. `.rill` 布局解析器；
2. `Task`、`Stream`、`Signal` 和 `Channel` 类型；
3. 管道、Lambda、Flow、Watch 和 Scope；
4. `map`、`filter`、`merge`、`combine`、`latest`、`debounce`、`retry`；
5. TypeScript/RxJS 后端；
6. source map 和 Graph IR；
7. IDE 静态图预览；
8. 虚拟时钟测试；
9. 订阅、事件、错误和取消调试协议；
10. OpenTelemetry 边界追踪与基础指标。

在语义和一致性测试稳定前，不应优先实现独立高性能运行时。首个实现应借助成熟运行时验证语言设计，再决定哪些操作符需要原生实现。

## 20. 完整示例

```rill
import http from "@rill/http"
import ui from "@app/ui"
import type {Item, SearchError} from "./types"

signal query: Text = ""

flow search(input: Signal<Text>) -> Stream<Item[], SearchError>:
  input.changes
  | debounce 300ms
  | distinct
  | filter text => text.length >= 2
  @id "search-request"
  @observe
  | latest text:
      http.get "/search" query=text
      | timeout 2s
  | retry 3 backoff: 200ms jitter: 20%
  | map .items
  | recover SearchError.NotFound:
      []

scope searchPage:
  watch search(query):
    value items:
      ui.render items
    error error:
      ui.showError error
    done:
      ui.hideLoading
```

对应的静态图：

```text
query: Signal<Text>
        │ changes
        ▼
    debounce ── distinct ── filter
                              │
                              ▼
                     search-request
                    latest + http.get
                              │
                    timeout / retry
                              │
                              ▼
                         map .items
                              │
                      recover NotFound
                              │
                              ▼
                         watch UI
```

该图、生成代码、调试事件和生产指标必须使用同一组逻辑 Node ID。这是 Rill 从源码设计延伸到 IDE、调试和运行时监控的基础。
