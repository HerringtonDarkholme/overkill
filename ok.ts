/// <reference path='./es6-collections.d.ts' />
import 'es6-collections'

class Caller<T> {
  private callers: T[] = []
  constructor(init?: T) {
    if (init !== undefined) this.callers.push(init)
  }
  withValue(t: T): Function {
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
type Observer = Obs | Rx<_>
type Observee = Var<_> | Rx<_>


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

export class Var<T> extends Signal<T> {
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
  update(newValue: T) {
    if (this.value !== newValue) {
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

export class Obs extends Signal<void> {
  private observees: Array<Observee> = []
  private expr: () => void
  constructor(expr: () => void) {
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
    caller.withValue(this)(this.expr)
  }
  watch(child: Observee) {
    this.observees.push(child)
  }
}

const UNINTIALIZE: any = {}
export class Rx<T> extends Signal<T> {
  private observers = new Set<Observer>()
  private observees: Array<Observee> = []
  private expr: () => T
  constructor(expr: () => T) {
    super()
    this.expr = expr
    this.value = UNINTIALIZE
  }
  computeValue() {
    for (let sig of this.observees) {
      sig.retireFrom(this)
    }
    this.observees = []
    let newValue = caller.withValue(this)(this.expr)
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
    if (child instanceof Rx) {
      this.assertNoCyclic(child)
    }
    this.observees.push(child)
  }

  retireFrom(obs: Observer) {
    this.observers.delete(obs)
  }

  assertNoCyclic(child: Rx<_>) {
    if (this.observers.has(child)) {
      throw new Error('cyclic error')
    }
    this.observers.forEach(p => {
      if (p instanceof Rx) {
        p.assertNoCyclic(child)
      }
    })
  }
}

var nilSig: any = {
  watch() {}
}
var caller = new Caller<Observer>(nilSig)

export var _caller = caller
