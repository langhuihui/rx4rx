declare namespace Rx {
    interface Observable {
        take(count: number): Observable
        takeUntil(source: Observable): Observable
        takeWhile(f: (d: any) => Boolean): Observable
        skip(count: number): Observable
        skipUntil(source: Observable): Observable
        skipWhile(f: (d: any) => Boolean): Observable
        map(f: (d: any) => any): Observable
        mapTo(target: Observable): Observable
        tap(f: (d: any) => any): Observable
        filter(f: (d: any) => Boolean): Observable
        share(source?: Observable): Observable
        shareReplay(bufferSize: number): (source?: Observable) => Observable
        startWith(...xs: Array<any>): Observable
        throttle(durationSelector: (d: any) => Observable, config?: object): Observable
        elementAt(count: number, defaultValue?: any): Observable
        find(f: (d: any) => Boolean): Observable
        findIndex(f: (d: any) => Boolean): Observable
        First(f?: (d: any) => Boolean, defaultValue?: any): Observable
        Last(f?: (d: any) => Boolean, defaultValue?: any): Observable
        delay(period: number): Observable
        scan(f: (d: any) => any, seed?: any): Observable
        repeat(count: number): Observable
        pluck(prop: string): Observable
        switchMap(source: (d: any) => Observable, combineResults?: (outter: any, inner: any) => any): Observable
        switchMapTo(source: Observable): Observable
        BufferTime(miniseconds: number): Observable
        toPromise(): Promise<any>
        subscribe(n: (d: any) => void, e: (d: Error) => void, c: () => void): Sink
    }
    interface Creator {
        of(...args: Array<any>): Observable
        fromArray(array: Array<any>): Observable
        create(f: (sink: Sink) => void): Observable
        bindCallback(f: Function, thisArg: any, ...args: Array<any>): Observable
        iif(condition: () => Boolean, trueSource: Observable, falseSource: Observable): Observable
        race(...sources: Array<Observable>): Observable
        merge(...sources: Array<Observable>): Observable
        mergeArray(sources: Array<Observable>): Observable
        concat(...sources: Array<Observable>): Observable
        combineLatest(...sources: Array<Observable>): Observable
    }
}
declare type Deferable = Sink | Function | Array<any>
declare type Observable = (sink: Sink) => void
declare type Observer<T> = (source: Observable) => T
export interface Sink {
    defers: Set<Deferable>;
    sink: Sink;
    constructor(sink: Sink, ...args: Array<any>);
    init();
    disposePass: Boolean;
    next(data: any);
    complete(err?: Error);
    dispose(defer?: Boolean | true);
    defer(add?: Deferable);
    subscribe(source: Observable);
    subscribes(sources: Array<Observable>);
}
declare type Deliver = (...args: Array<any>) => Observable
export function pipe<T>(...args: Array<Observable | Observer<T>>): Observable | T
export function deliver(Class: Function): Deliver;
export function create(f: (sink: Sink) => void): Observable
export function fromArray(array: Array<any>): Observable
export function bindCallback(f: Function, thisArg: any, ...args: Array<any>): Observable
export function iif(condition: () => Boolean, trueSource: Observable, falseSource: Observable): Observable
export function race(...sources: Array<Observable>): Observable
export function merge(...sources: Array<Observable>): Observable
export function mergeArray(sources: Array<Observable>): Observable
export function concat(...sources: Array<Observable>): Observable
export function combineLatest(...sources: Array<Observable>): Observable

export function take(count: number): Observable
export function takeUntil(source: Observable): Observable
export function takeWhile(f: (d: any) => Boolean): Observable
export function skip(count: number): Observable
export function skipUntil(source: Observable): Observable
export function skipWhile(f: (d: any) => Boolean): Observable
export function map(f: (d: any) => any): Observable
export function mapTo(target: Observable): Observable
export function tap(f: (d: any) => any): Observable
export function filter(f: (d: any) => Boolean): Observable
export function share(source?: Observable): Observable
export function shareReplay(bufferSize: number): (source?: Observable) => Observable
export function startWith(...xs: Array<any>): Observable
export function throttle(durationSelector: (d: any) => Observable, config?: object): Observable
export function elementAt(count: number, defaultValue?: any): Observable
export function find(f: (d: any) => Boolean): Observable
export function findIndex(f: (d: any) => Boolean): Observable
export function First(f?: (d: any) => Boolean, defaultValue?: any): Observable
export function Last(f?: (d: any) => Boolean, defaultValue?: any): Observable
export function delay(period: number): Observable
export function scan(f: (d: any) => any, seed?: any): Observable
export function repeat(count: number): Observable
export function pluck(prop: string): Observable
export function switchMap(source: (d: any) => Observable, combineResults?: (outter: any, inner: any) => any): Observable
export function switchMapTo(source: Observable): Observable
export function BufferTime(miniseconds: number): Observable
export const toPromise: Observer<Sink>
export function subscribe(n: (d: any) => void, e: (d: Error) => void, c: () => void): Observer<Sink>

export const rx: Rx.Creator