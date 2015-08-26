/// <reference path="es6-collections.d.ts" />
import { Signal, ObsImp } from './ok';
export declare type _ = {};
export declare enum UpdatePolicy {
    FORCE = 0,
    BY_REFERENCE = 1,
}
export interface Var<T> {
    (): T;
    (t: T): void;
    (t: T, byRef: UpdatePolicy): void;
    (fn: (t: T) => boolean, byRef: UpdatePolicy): void;
}
export declare function Var<T>(initialValue: T): Var<T>;
export interface Rx<T, C> {
    (): T;
}
export declare function Rx<T, C>(fn: (c: C) => T): Rx<T, C>;
export declare function Obs<C>(fn: (c: C) => void): ObsImp<C>;
export declare function getSinalFromFunc(f: Function): Signal<_>;
export declare function dispose(f: Function): void;
