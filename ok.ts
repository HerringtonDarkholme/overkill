/// <reference path='./es6-collections.d.ts' />
import 'es6-collections'

class Caller<T> {
  private callers: T[] = []
  constructor(init?: T) {
    if (init !== undefined) this.callers.push(init)
  }
  withValue(t: T): Function {
    if (this.callers.indexOf(t) >= 0) throw new Error('cyclic')
    return (fn: Function) => {
      this.callers.push(t)
      try {
        let ret = fn()
        return ret
      } finally {
        this.callers.pop()
      }
    }
  }
  value() {
    return this.callers[this.callers.length-1]
  }
}

type _ = {}
type Observer = ObsImp<_> | RxImp<_, _>
type Observee = VarImp<_> | RxImp<_, _>


abstract class Signal<T> {
  protected value: T
}

// a flag indicates whether to track dependency
// true when observer calls observee, otherwise false
var inWatch = false
export function mockInWatch(fn: Function) {
  inWatch = true
  fn()
  inWatch = false
}
/*
 * In dependency graph, we have three kinds of node
 * Var: the root of graph, the source of change. observed by Rx/Obs
 * Rx: interior node, it observes Var/Rx changes, and notify other Rx/Obs
 * Obs: leaf node, it should executes side effect,
 *
 * In dependency graph, we can define parent node as observee and child node as observer.
 * Child node will `watch` parent node. Parent node will notify child node when itself changes.
 *
 * Var & Rx are observees. Observee has its own value, and a set of observer.
 * When observees get called in watch phase, it will add the caller to its observer set,
 * and add itself to caller's observee list.
 *
 * Rx & Obs are observers. Observer has a list of observee. Obs is only for side effect.
 * Observer has a computeValue method in which observer calls observee.
 * Every time computeValue executes, observer will clean its observee list,
 * and remove itself from observee's observer set.
 */

export class VarImp<T> extends Signal<T> {
  private observers = new Set<Observer>()
  constructor(value: T) {
    super()
    this.update(value)
  }

  // observer is agnostic about its expression
  // so we register dependency when observee get called
  apply(): T {
    if (inWatch) {
      let callSig = caller.value()
      callSig.watch(this)
      this.observers.add(callSig)
    }
    return this.value
  }

  // when Var update, all its observers should re-watch
  update(newValue: T, force?: boolean) {
    if (this.value !== newValue || force) {
      inWatch = true
      this.value = newValue
      var obs = this.observers
      this.observers = new Set<any>()
      obs.forEach(o => o.computeValue())
      inWatch = false
    }
  }
  updateRef(func: (t: T) => boolean|void) {
    let skipUpdate = func(this.value)
    if (skipUpdate !== true) {
      inWatch = true
      var obs = this.observers
      this.observers = new Set<any>()
      obs.forEach(o => o.computeValue())
      inWatch = false
    }
  }

  retireFrom(obs: Observer) {
    this.observers.delete(obs)
  }
}

export class ObsImp<C> extends Signal<void> {
  private observees: Array<Observee> = []
  private expr: (ctx: C) => void
  public context: C
  constructor(expr: (ctx: C) => void) {
    super()
    this.expr = expr
    inWatch = true
    this.computeValue()
    inWatch = false
  }
  computeValue() {
    for (let sig of this.observees) {
      sig.retireFrom(this)
    }
    this.observees = []
    caller.withValue(this)(() => {
      return this.expr.call(this.context, this.context)
    })
  }
  watch(child: Observee) {
    this.observees.push(child)
  }
}

const UNINTIALIZE: any = {}
export class RxImp<T, C> extends Signal<T> {
  private observers = new Set<Observer>()
  private observees: Array<Observee> = []
  private expr: (ctx: C) => T
  public context: C
  constructor(expr: (ctx: C) => T) {
    super()
    this.expr = expr
    this.value = UNINTIALIZE
  }
  computeValue() {
    for (let sig of this.observees) {
      sig.retireFrom(this)
    }
    this.observees = []
    let newValue = caller.withValue(this)(() => {
        return this.expr.call(this.context, this.context)
      })
    if (this.value !== newValue) {
      this.value = newValue
      let obs = this.observers
      this.observers = new Set<any>()
      obs.forEach(o => o.computeValue())
    }
  }
  apply(): T {
    if (this.value === UNINTIALIZE) {
      this.computeValue()
      if (!inWatch) {
        let ret = this.value
        this.value = UNINTIALIZE
        return ret
      }
    }
    if (inWatch) {
      let callSig = caller.value()
      this.observers.add(callSig)
      callSig.watch(this)
    }
    return this.value
  }
  watch(child: Observee) {
    // only interior node will form cycle
    this.observees.push(child)
  }

  retireFrom(obs: Observer) {
    this.observers.delete(obs)
  }

}

var nilSig: any = {
  watch() {}
}
var caller = new Caller<Observer>(nilSig)

export var _caller = caller

export enum UpdatePolicy {
  FORCE, BY_REFERENCE
}

interface Var<T> {
  (): T
  (t: T): void
  (t: T, byRef: UpdatePolicy): void
  (fn: (t: T) => boolean, byRef: UpdatePolicy): void
}
var funcMap = new WeakMap<Function, Signal<_>>()

export function Var<T>(initialValue: T): Var<T> {
  var vImp = new VarImp(initialValue)
  var func = (t?: any, policy?: UpdatePolicy) => {
    switch (policy) {
    case UpdatePolicy.FORCE:
      vImp.update(t, true)
      break;
    case UpdatePolicy.BY_REFERENCE:
      if (typeof t !== 'function') {
        throw new Error('updateRef should use function')
      }
      vImp.updateRef(t)
      break
    default:
      if (t === undefined)  {
        return vImp.apply()
      } else {
        vImp.update(t)
      }
      break
    }
  }
  funcMap.set(func, vImp)
  return func
}

interface Rx<T, C> {
  (): T
}
export function Rx<T, C>(fn: (c: C) => T): Rx<T, C> {
  var rxImp = new RxImp(fn)
  var func = () => rxImp.apply()
  funcMap.set(func, rxImp)
  return func
}

export function Obs<C>(fn: (c: C) => void): ObsImp<C> {
  return new ObsImp(fn)
}
