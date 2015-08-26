/// <reference path="es6-collections.d.ts" />
export declare class Caller<T> {
    private callers;
    constructor(init?: T);
    withValue(t: T): Function;
    value(): T;
}
export declare type _ = {};
export declare type Observer = ObsImp<_> | RxImp<_, _>;
export declare type Observee = VarImp<_> | RxImp<_, _>;
export declare abstract class Signal<T> {
    protected value: T;
    abstract dispose(v?: Observer): void;
}
export declare function execInWatch(fn: Function): void;
export declare class VarImp<T> extends Signal<T> {
    private observers;
    constructor(value: T);
    apply(): T;
    update(newValue: T, force?: boolean): void;
    updateRef(func: (t: T) => boolean | void): void;
    retireFrom(obs: Observer): void;
    dispose(obs?: Observer): void;
}
export declare class ObsImp<C> extends Signal<void> {
    private observees;
    private expr;
    context: C;
    constructor(expr: (ctx: C) => void);
    computeValue(): void;
    watch(child: Observee): void;
    dispose(): void;
}
export declare class RxImp<T, C> extends Signal<T> {
    private observers;
    private observees;
    private expr;
    context: C;
    constructor(expr: (ctx: C) => T);
    computeValue(): void;
    apply(): T;
    watch(child: Observee): void;
    retireFrom(obs: Observer): void;
    dispose(obs?: Observer): void;
}
export declare var _caller: Caller<ObsImp<{}> | RxImp<{}, {}>>;
