// Generated by IcedCoffeeScript 108.0.7
(function() {
  var Dispatch, Lock, RobustTransport, StreamWrapper, Timer, Transport, dbg, iced, log, net, __iced_k, __iced_k_noop,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  iced = require('iced-runtime');
  __iced_k = __iced_k_noop = function() {};

  net = require('net');

  Lock = require('./lock').Lock;

  Dispatch = require('./dispatch').Dispatch;

  log = require('./log');

  Timer = require('./timer').Timer;

  iced = require('./iced').runtime;

  dbg = require('./debug');

  StreamWrapper = (function() {
    function StreamWrapper(_net_stream, _parent) {
      this._net_stream = _net_stream;
      this._parent = _parent;
      this._generation = this._parent.next_generation();
      this._write_closed_warn = false;
    }

    StreamWrapper.prototype.close = function() {
      var ret, x;
      ret = false;
      if ((x = this._net_stream) != null) {
        ret = true;
        this._net_stream = null;
        this._parent._dispatch_reset();
        this._parent._packetizer_reset();
        x.end();
      }
      return ret;
    };

    StreamWrapper.prototype.write = function(msg, enc) {
      if (this._net_stream) {
        return this._net_stream.write(msg, enc);
      } else if (!this._write_closed_warn) {
        this._write_closed_warn = true;
        return this._parent._warn("write on closed socket...");
      }
    };

    StreamWrapper.prototype.stream = function() {
      return this._net_stream;
    };

    StreamWrapper.prototype.is_connected = function() {
      return !!this._net_stream;
    };

    StreamWrapper.prototype.get_generation = function() {
      return this._generation;
    };

    StreamWrapper.prototype.remote_address = function() {
      if (this._net_stream) {
        return this._net_stream.remoteAddress;
      } else {
        return null;
      }
    };

    StreamWrapper.prototype.remote_port = function() {
      if (this._net_stream) {
        return this._net_stream.remotePort;
      } else {
        return null;
      }
    };

    return StreamWrapper;

  })();

  exports.Transport = Transport = (function(_super) {
    __extends(Transport, _super);

    function Transport(_arg) {
      var connect_timeout, dbgr, net_stream;
      this.port = _arg.port, this.host = _arg.host, this.net_opts = _arg.net_opts, net_stream = _arg.net_stream, this.log_obj = _arg.log_obj, this.parent = _arg.parent, this.do_tcp_delay = _arg.do_tcp_delay, this.hooks = _arg.hooks, dbgr = _arg.dbgr, this.path = _arg.path, connect_timeout = _arg.connect_timeout;
      Transport.__super__.constructor.apply(this, arguments);
      if (!this.host || this.host === "-") {
        this.host = "localhost";
      }
      if (!this.net_opts) {
        this.net_opts = {};
      }
      this.net_opts.host = this.host;
      this.net_opts.port = this.port;
      this.net_opts.path = this.path;
      this._explicit_close = false;
      this._remote_str = [this.host, this.port].join(":");
      this.set_logger(this.log_obj);
      this._lock = new Lock();
      this._generation = 1;
      this._dbgr = dbgr;
      this._connect_timeout = connect_timeout || 10 * 1000;
      this._netw = null;
      if (net_stream) {
        this._activate_stream(net_stream);
      }
    }

    Transport.prototype.set_debugger = function(d) {
      return this._dbgr = d;
    };

    Transport.prototype.set_debug_flags = function(d) {
      return this.set_debugger(dbg.make_debugger(d, this.log_obj));
    };

    Transport.prototype.next_generation = function() {
      "To be called by StreamWrapper objects but not by\naverage users.";
      var ret;
      ret = this._generation;
      this._generation++;
      return ret;
    };

    Transport.prototype.get_generation = function() {
      if (this._netw) {
        return this._netw.get_generation();
      } else {
        return -1;
      }
    };

    Transport.prototype.remote_address = function() {
      if (this._netw != null) {
        return this._netw.remote_address();
      } else {
        return null;
      }
    };

    Transport.prototype.remote_port = function() {
      if (this._netw != null) {
        return this._netw.remote_port();
      } else {
        return null;
      }
    };

    Transport.prototype.set_logger = function(o) {
      if (!o) {
        o = log.new_default_logger();
      }
      this.log_obj = o;
      return this.log_obj.set_remote(this._remote_str);
    };

    Transport.prototype.get_logger = function() {
      return this.log_obj;
    };

    Transport.prototype.is_connected = function() {
      var _ref;
      return (_ref = this._netw) != null ? _ref.is_connected() : void 0;
    };

    Transport.prototype.connect = function(cb) {
      var err, ___iced_passed_deferral, __iced_deferrals, __iced_k;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      (function(_this) {
        return (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {
            parent: ___iced_passed_deferral,
            filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
            funcname: "Transport.connect"
          });
          _this._lock.acquire(__iced_deferrals.defer({
            lineno: 132
          }));
          __iced_deferrals._fulfill();
        });
      })(this)((function(_this) {
        return function() {
          (function(__iced_k) {
            if (!_this.is_connected()) {
              (function(__iced_k) {
                __iced_deferrals = new iced.Deferrals(__iced_k, {
                  parent: ___iced_passed_deferral,
                  filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
                  funcname: "Transport.connect"
                });
                _this._connect_critical_section(__iced_deferrals.defer({
                  assign_fn: (function() {
                    return function() {
                      return err = arguments[0];
                    };
                  })(),
                  lineno: 134
                }));
                __iced_deferrals._fulfill();
              })(__iced_k);
            } else {
              return __iced_k(err = null);
            }
          })(function() {
            _this._lock.release();
            if (cb) {
              cb(err);
            }
            if (typeof err !== "undefined" && err !== null) {
              return _this._reconnect(true);
            }
          });
        };
      })(this));
    };

    Transport.prototype.reset = function(w) {
      if (!w) {
        w = this._netw;
      }
      return this._close(w);
    };

    Transport.prototype.close = function() {
      this._explicit_close = true;
      if (this._netw) {
        this._netw.close();
        return this._netw = null;
      }
    };

    Transport.prototype._warn = function(e) {
      return this.log_obj.warn(e);
    };

    Transport.prototype._info = function(e) {
      return this.log_obj.info(e);
    };

    Transport.prototype._fatal = function(e) {
      return this.log_obj.fatal(e);
    };

    Transport.prototype._debug = function(e) {
      return this.log_obj.debug(e);
    };

    Transport.prototype._error = function(e) {
      return this.log_obj.error(e);
    };

    Transport.prototype._close = function(netw) {
      var _ref;
      if ((_ref = this.hooks) != null) {
        if (typeof _ref.eof === "function") {
          _ref.eof(netw);
        }
      }
      if (netw != null ? netw.close() : void 0) {
        return this._reconnect(false);
      }
    };

    Transport.prototype._handle_error = function(e, netw) {
      this._error(e);
      return this._close(netw);
    };

    Transport.prototype._packetize_error = function(err) {
      return this._handle_error("In packetizer: " + err, this._netw);
    };

    Transport.prototype._packetize_warning = function(w) {
      return this._warn("In packetizer: " + w);
    };

    Transport.prototype._handle_close = function(netw) {
      if (!this._explicit_close) {
        this._info("EOF on transport");
      }
      this._close(netw);
      if (this.parent) {
        return this.parent.close_child(this);
      }
    };

    Transport.prototype._reconnect = function(first_time) {
      return null;
    };

    Transport.prototype._activate_stream = function(x) {
      var w, _ref;
      this._info("connection established");
      w = new StreamWrapper(x, this);
      this._netw = w;
      if ((_ref = this.hooks) != null) {
        _ref.connected(w);
      }
      x.on('error', (function(_this) {
        return function(err) {
          return _this._handle_error(err, w);
        };
      })(this));
      x.on('close', (function(_this) {
        return function() {
          return _this._handle_close(w);
        };
      })(this));
      return x.on('data', (function(_this) {
        return function(msg) {
          return _this.packetize_data(msg);
        };
      })(this));
    };

    Transport.prototype._connect_critical_section = function(cb) {
      var CLS, CON, ERR, TMO, err, ok, rv, rv_id, x, ___iced_passed_deferral, __iced_deferrals, __iced_k, _ref;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      x = net.connect(this.net_opts);
      if (!this.do_tcp_delay) {
        x.setNoDelay(true);
      }
      _ref = [0, 1, 2, 3], CON = _ref[0], ERR = _ref[1], CLS = _ref[2], TMO = _ref[3];
      rv = new iced.Rendezvous;
      x.once('connect', rv.id(CON).defer({
        lineno: 249,
        context: __iced_deferrals
      }));
      x.once('error', rv.id(ERR).defer({
        assign_fn: (function(_this) {
          return function() {
            return function() {
              return err = arguments[0];
            };
          };
        })(this)(),
        lineno: 250,
        context: __iced_deferrals
      }));
      x.once('close', rv.id(CLS).defer({
        lineno: 251,
        context: __iced_deferrals
      }));
      setTimeout(rv.id(TMO).defer({
        lineno: 255,
        context: __iced_deferrals
      }), this._connect_timeout);
      ok = false;
      (function(_this) {
        return (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {
            parent: ___iced_passed_deferral,
            filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
            funcname: "Transport._connect_critical_section"
          });
          rv.wait(__iced_deferrals.defer({
            assign_fn: (function() {
              return function() {
                return rv_id = arguments[0];
              };
            })(),
            lineno: 258
          }));
          __iced_deferrals._fulfill();
        });
      })(this)((function(_this) {
        return function() {
          switch (rv_id) {
            case CON:
              ok = true;
              break;
            case ERR:
              _this._warn(err);
              break;
            case CLS:
              _this._warn("connection closed during open");
              break;
            case TMO:
              _this._warn("connection timed out after " + _this._connect_timeout + "s");
          }
          if (ok) {
            _this._activate_stream(x);
            err = null;
          } else if (err == null) {
            err = new Error("error in connection");
          }
          return cb(err);
        };
      })(this));
    };

    Transport.prototype._raw_write = function(msg, encoding) {
      if (this._netw == null) {
        return this._warn("write attempt with no active stream");
      } else {
        return this._netw.write(msg, encoding);
      }
    };

    return Transport;

  })(Dispatch);

  exports.RobustTransport = RobustTransport = (function(_super) {
    __extends(RobustTransport, _super);

    function RobustTransport(sd, d) {
      var x;
      if (d == null) {
        d = {};
      }
      RobustTransport.__super__.constructor.call(this, sd);
      this.queue_max = d.queue_max, this.warn_threshhold = d.warn_threshhold, this.error_threshhold = d.error_threshhold;
      this.reconnect_delay = (x = d.reconnect_delay) ? x : 1;
      if (this.queue_max == null) {
        this.queue_max = 1000;
      }
      this._time_rpcs = (this.warn_threshhold != null) || (this.error_threshhold != null);
      this._waiters = [];
    }

    RobustTransport.prototype._reconnect = function(first_time) {
      if (!this._explicit_close) {
        return this._connect_loop(first_time);
      }
    };

    RobustTransport.prototype._flush_queue = function() {
      var tmp, w, _i, _len, _results;
      tmp = this._waiters;
      this._waiters = [];
      _results = [];
      for (_i = 0, _len = tmp.length; _i < _len; _i++) {
        w = tmp[_i];
        _results.push(this.invoke.apply(this, w));
      }
      return _results;
    };

    RobustTransport.prototype._connect_loop = function(first_time, cb) {
      var err, first_through_loop, go, i, prfx, s, ___iced_passed_deferral, __iced_deferrals, __iced_k, _next;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      if (first_time == null) {
        first_time = false;
      }
      prfx = first_time ? "" : "re";
      i = 0;
      (function(_this) {
        return (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {
            parent: ___iced_passed_deferral,
            filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
            funcname: "RobustTransport._connect_loop"
          });
          _this._lock.acquire(__iced_deferrals.defer({
            lineno: 348
          }));
          __iced_deferrals._fulfill();
        });
      })(this)((function(_this) {
        return function() {
          go = true;
          first_through_loop = true;
          (function(__iced_k) {
            var _while;
            _while = function(__iced_k) {
              var _break, _continue;
              _break = __iced_k;
              _continue = function() {
                return iced.trampoline(function() {
                  return _while(__iced_k);
                });
              };
              _next = _continue;
              if (!go) {
                return _break();
              } else {
                (function(__iced_k) {
                  if (_this.is_connected() || _this._explicit_close) {
                    return __iced_k(go = false);
                  } else {
                    (function(__iced_k) {
                      if (first_through_loop && !first_time) {
                        first_through_loop = false;
                        _this._info("reconnect loop started, initial delay...");
                        (function(__iced_k) {
                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                            parent: ___iced_passed_deferral,
                            filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
                            funcname: "RobustTransport._connect_loop"
                          });
                          setTimeout(__iced_deferrals.defer({
                            lineno: 359
                          }), _this.reconnect_delay * 1000);
                          __iced_deferrals._fulfill();
                        })(__iced_k);
                      } else {
                        i++;
                        _this._info("" + prfx + "connecting (attempt " + i + ")");
                        (function(__iced_k) {
                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                            parent: ___iced_passed_deferral,
                            filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
                            funcname: "RobustTransport._connect_loop"
                          });
                          _this._connect_critical_section(__iced_deferrals.defer({
                            assign_fn: (function() {
                              return function() {
                                return err = arguments[0];
                              };
                            })(),
                            lineno: 363
                          }));
                          __iced_deferrals._fulfill();
                        })(function() {
                          (function(__iced_k) {
                            if (typeof err !== "undefined" && err !== null) {
                              (function(__iced_k) {
                                __iced_deferrals = new iced.Deferrals(__iced_k, {
                                  parent: ___iced_passed_deferral,
                                  filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
                                  funcname: "RobustTransport._connect_loop"
                                });
                                setTimeout(__iced_deferrals.defer({
                                  lineno: 365
                                }), _this.reconnect_delay * 1000);
                                __iced_deferrals._fulfill();
                              })(__iced_k);
                            } else {
                              return __iced_k(go = false);
                            }
                          })(__iced_k);
                        });
                      }
                    })(__iced_k);
                  }
                })(_next);
              }
            };
            _while(__iced_k);
          })(function() {
            if (_this.is_connected()) {
              s = i === 1 ? "" : "s";
              _this._warn("" + prfx + "connected after " + i + " attempt" + s);
              _this._flush_queue();
            }
            _this._lock.release();
            if (cb) {
              return cb();
            }
          });
        };
      })(this));
    };

    RobustTransport.prototype._timed_invoke = function(arg, cb) {
      var OK, TIMEOUT, dur, et, flag, m, meth, rpc_res, rv, tm, to, which, wt, ___iced_passed_deferral, __iced_deferrals, __iced_k, _next, _ref;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      _ref = [0, 1], OK = _ref[0], TIMEOUT = _ref[1];
      tm = new Timer({
        start: true
      });
      rv = new iced.Rendezvous;
      meth = this.make_method(arg.program, arg.method);
      et = this.error_threshhold ? this.error_threshhold * 1000 : 0;
      wt = this.warn_threshhold ? this.warn_threshhold * 1000 : 0;
      if (et) {
        to = setTimeout(rv.id(TIMEOUT).defer({
          lineno: 390,
          context: __iced_deferrals
        }), et);
      }
      Dispatch.prototype.invoke.call(this, arg, rv.id(OK).defer({
        assign_fn: (function(_this) {
          return function() {
            return function() {
              return rpc_res = __slice.call(arguments, 0);
            };
          };
        })(this)(),
        lineno: 393,
        context: __iced_deferrals
      }));
      (function(_this) {
        return (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {
            parent: ___iced_passed_deferral,
            filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
            funcname: "RobustTransport._timed_invoke"
          });
          rv.wait(__iced_deferrals.defer({
            assign_fn: (function() {
              return function() {
                return which = arguments[0];
              };
            })(),
            lineno: 396
          }));
          __iced_deferrals._fulfill();
        });
      })(this)((function(_this) {
        return function() {
          flag = true;
          (function(__iced_k) {
            var _while;
            _while = function(__iced_k) {
              var _break, _continue;
              _break = __iced_k;
              _continue = function() {
                return iced.trampoline(function() {
                  return _while(__iced_k);
                });
              };
              _next = _continue;
              if (!flag) {
                return _break();
              } else {
                (function(__iced_k) {
                  if (which === TIMEOUT) {
                    _this._error("RPC call to '" + meth + "' is taking > " + (et / 1000) + "s");
                    (function(__iced_k) {
                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                        parent: ___iced_passed_deferral,
                        filename: "/Users/max/src/iced/node-framed-msgpack-rpc/src/transport.iced",
                        funcname: "RobustTransport._timed_invoke"
                      });
                      rv.wait(__iced_deferrals.defer({
                        assign_fn: (function() {
                          return function() {
                            return which = arguments[0];
                          };
                        })(),
                        lineno: 404
                      }));
                      __iced_deferrals._fulfill();
                    })(__iced_k);
                  } else {
                    clearTimeout(to);
                    return __iced_k(flag = false);
                  }
                })(_next);
              }
            };
            _while(__iced_k);
          })(function() {
            dur = tm.stop();
            m = et && dur >= et ? _this._error : wt && dur >= wt ? _this._warn : null;
            if (m) {
              m.call(_this, "RPC call to '" + meth + "' finished in " + (dur / 1000) + "s");
            }
            return cb.apply(null, rpc_res);
          });
        };
      })(this));
    };

    RobustTransport.prototype.invoke = function(arg, cb) {
      var meth;
      meth = this.make_method(arg.program, arg.method);
      if (this.is_connected()) {
        if (this._time_rpcs) {
          return this._timed_invoke(arg, cb);
        } else {
          return RobustTransport.__super__.invoke.call(this, arg, cb);
        }
      } else if (this._explicit_close) {
        this._warn("invoke call after explicit close");
        return cb("socket was closed", {});
      } else if (this._waiters.length < this.queue_max) {
        this._waiters.push([arg, cb]);
        return this._info("Queuing call to " + meth + " (num queued: " + this._waiters.length + ")");
      } else if (this.queue_max > 0) {
        return this._warn("Queue overflow for " + meth);
      }
    };

    return RobustTransport;

  })(Transport);

  exports.createTransport = function(opts) {
    if (opts.robust) {
      return new RobustTransport(opts, opts);
    } else {
      return new Transport(opts);
    }
  };

}).call(this);
