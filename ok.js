var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path='./es6-collections.d.ts' />
require('es6-collections');
var Caller = (function () {
    function Caller(init) {
        this.callers = [];
        if (init !== undefined)
            this.callers.push(init);
    }
    Caller.prototype.withValue = function (t) {
        var _this = this;
        return function (fn) {
            _this.callers.push(t);
            var ret = fn();
            _this.callers.pop();
            return ret;
        };
    };
    Caller.prototype.value = function () {
        return this.callers[this.callers.length - 1];
    };
    return Caller;
})();
var Signal = (function () {
    function Signal() {
    }
    return Signal;
})();
// a flag indicates whether to track dependency
// true when observer calls observee, otherwise false
var inWatch = false;
function mockInWatch(fn) {
    inWatch = true;
    fn();
    inWatch = false;
}
exports.mockInWatch = mockInWatch;
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
var Var = (function (_super) {
    __extends(Var, _super);
    function Var(value) {
        _super.call(this);
        this.observers = new Set();
        this.update(value);
    }
    // observer is agnostic about its expression
    // so we register dependency when observee get called
    Var.prototype.apply = function () {
        if (inWatch) {
            var callSig = caller.value();
            callSig.watch(this);
            this.observers.add(callSig);
        }
        return this.value;
    };
    // when Var update, all its observers should re-watch
    Var.prototype.update = function (newValue) {
        if (this.value !== newValue) {
            inWatch = true;
            this.value = newValue;
            var obs = this.observers;
            this.observers = new Set();
            obs.forEach(function (o) { return o.computeValue(); });
            inWatch = false;
        }
    };
    Var.prototype.retireFrom = function (obs) {
        this.observers.delete(obs);
    };
    return Var;
})(Signal);
exports.Var = Var;
var Obs = (function (_super) {
    __extends(Obs, _super);
    function Obs(expr) {
        _super.call(this);
        this.observees = [];
        this.expr = expr;
        inWatch = true;
        this.computeValue();
        inWatch = false;
    }
    Obs.prototype.computeValue = function () {
        for (var _i = 0, _a = this.observees; _i < _a.length; _i++) {
            var sig = _a[_i];
            sig.retireFrom(this);
        }
        this.observees = [];
        caller.withValue(this)(this.expr);
    };
    Obs.prototype.watch = function (child) {
        this.observees.push(child);
    };
    return Obs;
})(Signal);
exports.Obs = Obs;
var UNINTIALIZE = {};
var Rx = (function (_super) {
    __extends(Rx, _super);
    function Rx(expr) {
        _super.call(this);
        this.observers = new Set();
        this.observees = [];
        this.expr = expr;
        this.value = UNINTIALIZE;
    }
    Rx.prototype.computeValue = function () {
        for (var _i = 0, _a = this.observees; _i < _a.length; _i++) {
            var sig = _a[_i];
            sig.retireFrom(this);
        }
        this.observees = [];
        var newValue = caller.withValue(this)(this.expr);
        if (this.value !== newValue) {
            this.value = newValue;
            var obs = this.observers;
            this.observers = new Set();
            obs.forEach(function (o) { return o.computeValue(); });
        }
    };
    Rx.prototype.apply = function () {
        if (this.value === UNINTIALIZE) {
            inWatch = true;
            this.computeValue();
            inWatch = false;
        }
        if (inWatch) {
            var callSig = caller.value();
            this.observers.add(callSig);
            callSig.watch(this);
        }
        return this.value;
    };
    Rx.prototype.watch = function (child) {
        // only interior node will form cycle
        if (child instanceof Rx) {
            this.assertNoCyclic(child);
        }
        this.observees.push(child);
    };
    Rx.prototype.retireFrom = function (obs) {
        this.observers.delete(obs);
    };
    Rx.prototype.assertNoCyclic = function (child) {
        if (this.observers.has(child)) {
            throw new Error('cyclic error');
        }
        this.observers.forEach(function (p) {
            if (p instanceof Rx) {
                p.assertNoCyclic(child);
            }
        });
    };
    return Rx;
})(Signal);
exports.Rx = Rx;
var nilSig = {
    watch: function () { }
};
var caller = new Caller(nilSig);
exports._caller = caller;
