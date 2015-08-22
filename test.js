/* globals describe, it */
'use strict'
var assert = require('assert')
var ok = require('./ok')
var Rx = ok.Rx
var Obs = ok.Obs
var Var = ok.Var
var caller = ok.caller
var startObserve = ok.startObserve

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
    mockLink: function(obs, cb) {
      startObserve(function() {
        caller.withValue(mockObserver)(function() {
          obs.apply()
        })
        cb()
      })
    }
  }

  it('should link observer', function(done) {
    var a = new Var(CONST1)
    mockObserver.getCalledTimes = 0
    mockObserver.observee = null
    mockObserver.mockLink(a, function() {
      assert(mockObserver.observee === a)
      done()
    })
  })
  it('should call observer when changes', function(done) {
    var a = new Var(CONST1)
    mockObserver.getCalledTimes = 0
    mockObserver.observee = null
    mockObserver.mockLink(a, function() {
      a.update(CONST2)
      assert(a.apply() === CONST2)
      assert(mockObserver.getCalledTimes === 1)
      done()
    })
  })

  it('should not call observer when no changes', function(done) {
    var a = new Var(CONST1)
    mockObserver.getCalledTimes = 0
    mockObserver.observee = null
    mockObserver.mockLink(a, function() {
      a.update(CONST1)
      assert(a.apply() === CONST1)
      assert(mockObserver.getCalledTimes === 0)
      done()
    })
  })
})

describe('Obs', function() {
  it('should make side effect', function(done) {
    var sideEffectDone = false
    var obs = new Obs(function() {
      sideEffectDone = true
    })
    setTimeout(function() {
      assert(sideEffectDone)
      obs = null
      done()
    }, 1)
  })

  it('should has observee', function(done) {
    var sig = new Var(123)
    var obs = new Obs(function() {
      sig.apply()
    })
    setTimeout(function() {
      assert(obs.observees.length === 1)
      done()
    }, 1)
  })

  it('should remove observee', function(done) {
    var sig = new Var(123)
    var isTracking = new Var(false)
    var obs = new Obs(function() {
      if (isTracking.apply()) {
        sig.apply()
      }
    })

    setTimeout(function() {
      assert(obs.observees.length === 1)
      isTracking.update(true)
      sig.update(456)
      assert(obs.observees.length === 2)
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

// var a = new Rx(() => b.apply())
// var b = new Rx(() => c.apply())
// var c = new Rx(() => a.apply())

// setImmediate(() => {
//   console.log(c.apply())
// })
