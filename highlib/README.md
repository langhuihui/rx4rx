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