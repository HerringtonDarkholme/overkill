/* globals describe, it */
'use strict'
var assert = require('assert')
var ok = require('./ok')
var Rx = ok.Rx
var Obs = ok.Obs
var Var = ok.Var
var caller = ok._caller
var mockInWatch = ok.mockInWatch

describe('Var', function() {
  var CONST1 = 42
  var CONST2 = 24

  it('should return inital value', function() {
    var a = new Var(CONST1)
    assert(a.apply() === CONST1)
  })

  it('should update value', function () {
    var a = new Var(CONST1)
    a.update(CONST2)
    assert(a.apply() === CONST2)
  })

  var mockObserver = {
    observee: null,
    getCalledTimes: 0,
    watch: function(v) { this.observee = v },
    computeValue: function() {
      this.getCalledTimes++
    },
    mockLink: function(obs) {
      mockInWatch(function() {
        caller.withValue(mockObserver)(function() {
          obs.apply()
        })
      })
    }
  }

  it('should link observer', function() {
    var a = new Var(CONST1)
    mockObserver.getCalledTimes = 0
    mockObserver.observee = null
    mockObserver.mockLink(a)
    assert(mockObserver.observee === a)
  })

it('should call observer when changes', function() {
  var a = new Var(CONST1)
  mockObserver.getCalledTimes = 0
  mockObserver.observee = null
  mockObserver.mockLink(a)
  a.update(CONST2)
  assert(a.apply() === CONST2)
  assert(mockObserver.getCalledTimes === 1)
})

it('should not call observer when no changes', function() {
  var a = new Var(CONST1)
  mockObserver.getCalledTimes = 0
  mockObserver.observee = null
  mockObserver.mockLink(a)
  a.update(CONST1)
  assert(a.apply() === CONST1)
  assert(mockObserver.getCalledTimes === 0)
})
})

describe('Obs', function() {
  it('should make side effect', function() {
    var sideEffectDone = false
    var obs = new Obs(function() {
      sideEffectDone = true
    })
    assert(sideEffectDone)
    obs = null
  })

  it('should has observee', function() {
    var sig = new Var(123)
    var obs = new Obs(function() {
      sig.apply()
    })
    assert(obs.observees[0] === sig)
    assert(sig.observers.has(obs))
  })

  it('should add observee', function() {
    var sig = new Var(123)
    var isTracking = new Var(false)
    var obs = new Obs(function() {
      if (isTracking.apply()) {
        sig.apply()
      }
    })
    assert(obs.observees.length === 1)
    assert(sig.observers.size === 0)
    isTracking.update(true)
    sig.update(456)
    assert(obs.observees.length === 2)
    assert(sig.observers.size === 1)
  })

  it('should remove observee', function(done) {
    var sig = new Var(123)
    var isTracking = new Var(true)
    var obs = new Obs(function() {
      if (isTracking.apply()) {
        sig.apply()
      }
    })

    setTimeout(function() {
      assert(obs.observees.length === 2)
      assert(sig.observers.size === 1)
      isTracking.update(false)
      sig.update(456)
      assert(obs.observees.length === 1)
      assert(sig.observers.size === 0)
      done()
    }, 1)
  })

  it('should get called when update', function(done) {
    var sig = new Var(123)
    var count = 0
    var obs = new Obs(function() {
      sig.apply()
      count++
    })
    setTimeout(function() {
      sig.update(456)
      assert(obs.observees.length === 1)
      assert(count === 2)
      done()
    }, 1)
  })

})

describe('Rx', function() {
  it('should propagate', function() {
    var calledTimes = 0
    var a = new Var(123)
    var b = new Rx(function() {
      return a.apply() + 123
    })
    var c = new Obs(function() {
      b.apply()
      calledTimes++
    })
    a.update(456)
    assert(calledTimes === 2)
  })
})

// var a = new Rx(() => b.apply())
// var b = new Rx(() => c.apply())
// var c = new Rx(() => a.apply())

// setImmediate(() => {
//   console.log(c.apply())
// })
