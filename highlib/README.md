#rx4rx-fast
the fast rxjs implemention

#install

```bash
npm i fastrx
```

#usage

```js
import {rx} from 'fastrx';

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