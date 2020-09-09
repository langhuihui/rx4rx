#rx4rx-fast
the fast rxjs implemention

#install

```bash
npm i fastrx
```

#usage

```js
import { rx } from 'fastrx';

rx.of(1,2,3).filter(x=>x<2).subscribe(console.log)
```

or

```js
import {pipe,fromArray,filter,subscribe} from 'fastrx';
pipe(fromArray([1,2,3]), filter(x=>x<2), subscribe(console.log))
```


dataflow for 1000000 source events
-----------------------------------------------

| lib   |      op/s      |  samples |
|----------|:-------------:|------:|
|rx4rx-lite  | 11.29 op/s ±  1.47%  | (56 samples)
|rx4rx-fast  | 22.56 op/s ±  1.77%  | (57 samples)
|cb-basics   |  9.56 op/s ±  1.73%  | (49 samples)
|xstream     | 5.37 op/s ±  0.68%   | (30 samples)
|most        | 17.32 op/s ±  1.93%  | (82 samples)
|rx 6        |  6.28 op/s ±  3.10%  | (35 samples)
-----------------------------------------------

#extensible

## Observable.create way

```js
import { rx } from 'fastrx';
const myObservable = rx(sink=>{
    sink.next('data')
    sink.complete()
})
myObservable.subscribe(console.log)
```
or

```js
import {pipe,subscribe} from 'fastrx';
const myObservable = ()=>sink=>{
    sink.next('data')
    sink.complete()
}
pipe(myObservable(), subscribe(console.log))
```

## add to library
```js
import { rx } from 'fastrx';
rx.myObservable = (args) => sink => {
    const id = setTimeout(()=>{
        sink.next(args)
        sink.complete()
    })
    sink.defer([clearTimeout,null,id])
    //or sink.defer(()=>clearTimeout(id))
}
```
then you can use your observable anywhere

```js
import { rx} from 'fastrx';
rx.myObservable('something').subscribe(console.log)
```
or

```js
import {pipe,myObservable} from 'fastrx';
pipe(myObservable('something'), subscribe(console.log))
```

## vue usage
```js
import { rx } from "fastrx";
import { vueHookEvent, vueDirective } from "fastrx/extention";
Vue.use(vueHookEvent);
Vue.use(vueDirective);
Vue.prototype.$rx = rx;

//in vue
this.$rx.interval(1000).takeUntil(this.$fromEvent("destroyed")).subscribe(()=>{})
```
```html
<template>
<div v-rx:btn.click="event"></div>
</template>
<script>
export default {
    data(){
        return {event:{}}
    },
    mounted(){
        this.event.btnclick.subscribe(()=>{
            
        })
    }
}
</script>
```