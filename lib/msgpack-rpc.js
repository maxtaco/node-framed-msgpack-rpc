var net = require('net'),
    events = require('events'),
    sys = require('util'),
    mpstream = require ('./msgpack-stream');

var REQUEST  = 0;
var RESPONSE = 1;
var NOTIFY   = 2;
var MAX_SEQID = Math.pow(2,32)-1;

function RPCResponse (stream, seqid) {
  this.stream = stream;
  this.seqid  = seqid;
}

RPCResponse.prototype.result = function(args) {
    this.stream.respond(this.seqid, null, args);
}

RPCResponse.prototype.error = function(error) {
  this.stream.respond(this.seqid, error, null);
}

//=======================================================================

// The heart of the beast, used for both server and client
var id = 0;
var MsgpackRPCStream = function(stream, handler) {

    events.EventEmitter.call(this);
    var self              = this;
    this.last_seqid       = undefined;
    this.stream           = stream;
    this.handler          = handler;
    this.cbs              = [];
    this.timeout          = undefined;
    this.id               = id++; 
    this.eofcb            = undefined;
    
    this.msgpack_stream = new mpstream.Stream(this.stream);

    //-------------------------------------------------------------

    // 
    // This stream is a packetized input stream, so we only get full
    // messages.  This callback is called when a new message arrives..
    //
    this.msgpack_stream.on('msg', function(msg) {

	if (!(msg instanceof Array) || msg.legnth < 2) {
	    self.emit ('error', new Error ('bad input packet'));
	    return;
	}

	var type = msg.shift();
	switch(type) { 
	case REQUEST:
            var seqid  = msg[0];
            var method = msg[1];
            var param = msg[2];
            var response = new RPCResponse(self, seqid); 
	    
            self.invokeHandler(method, param, response);
            self.emit('request', method, param, response);
            break;
	case RESPONSE:
            var seqid  = msg[0];
            var error  = msg[1];
            var result = msg[2];

            if(self.cbs[seqid]) {
		self.triggerCb(seqid, [error, result]);
            } else {
		var err = new Error("unexpected response with " +
				    "unrecognized seqid (" + seqid + ")" );
		self.emit('error', err);
            }
            break;
	case NOTIFY:
            var method = msg[0];
            var param = msg[1];
	    
            self.invokeHandler(method, param);
            self.emit('notify', method, param);
            break;
	}
    });

    //-------------------------------------------------------------

    this.stream.on('connect', function() { 
	self.emit('ready'); 
    });

    //-------------------------------------------------------------

    this.stream.on('end', function() { 
	
	self.stream.end(); 
	
	// For all of those people still waiting for a reply, it's now
	// hopelss.
	self.failCbs(new Error("connection closed by peer")); 
	
	if (self.eofcb) { self.eofcb (); }
    });
    
    //-------------------------------------------------------------

    this.stream.on('timeout', function() { 
	self.failCbs(new Error("connection timeout")); 
    });

    //-------------------------------------------------------------

    this.stream.on('close', function(had_error) {
	if(had_error) return; 
	self.failCbs(new Error("connection closed locally"));
    });

    //-------------------------------------------------------------

    this.stream.on('error', function(error) { 
	self.failCbs(error); 
    });
}

//=======================================================================

sys.inherits(MsgpackRPCStream, events.EventEmitter);

MsgpackRPCStream.prototype.triggerCb = function(seqid, args) {
    this.cbs[seqid].apply (this, args);
    delete this.cbs[seqid];
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.setErrorHandlers = function () {
    var self = this;
    this.stream.on ('error', function (err) { self.failCbs (err); });
};

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.failCbs = function(error) {
    for(var seqid in this.cbs) { 
	this.triggerCb(seqid, [error]) 
    }
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.invokeHandler = function(method, param, response) 
{
    if (this.handler) {
	this.handler.dispatch (method, param, response);
    }
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.nextSeqId = function() {
    if(this.last_seqid == undefined) {
	return this.last_seqid = 0;
    } else if(this.last_seqid > MAX_SEQID ) {
	return this.last_seqid = 0;
    } else {
	return this.last_seqid += 1;
    }
}

//-----------------------------------------------------------------------

// End of the stream, not necessarily a failure....
MsgpackRPCStream.prototype.setEofCb = function (c) { this.eofcb = c; }

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.invoke = function(method, arg, cb) {
    var self   = this;
    var seqid  = this.nextSeqId();

    this.cbs[seqid] = cb;
    if(this.timeout) {
	setTimeout(
	    function() { if(self.cbs[seqid]) 
		self.triggerCb(seqid, ["timeout"]); }, 
	    this.timeout
	);
    }

    if(this.stream.writable) { 
	return this.msgpack_stream.send([REQUEST, seqid, method, arg]) 
    };
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.respond = function(seqid, error, result) {
    if(this.stream.writable) { 
	return this.msgpack_stream.send([RESPONSE, seqid, error, result]) 
    };
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.notify = function(method, param) {
    if(this.stream.writable) { 
	return this.msgpack_stream.send([NOTIFY, method, param]) 
    };
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.setTimeout = function(timeout) {
    this.timeout = timeout;
}

//-----------------------------------------------------------------------

MsgpackRPCStream.prototype.close = function() {
    this.stream.end();
}

//=======================================================================

var Transport = function (hostname, port) {
    
    if (!hostname || hostname.length == 0 || hostname == "-") {
	hostname = null;
    }

    this.hostname = hostname;
    this.port = port;
    this._connect_cb = null;
    this.tcp_stream = null;
    this.rpc_stream = null;

    //-----------------------------------------

    this._trigger = function (ok, msg) {

	if (this._connect_cb) {
	    var cb = this._connect_cb;
	    this._connect_cb = null;
	    if (ok) {
		this.rpc_stream.setErrorHandlers ();
	    }
	    cb (ok, msg);
	}
    };

    //-----------------------------------------

    this.setEofCb = function (cb) { this.rpc_stream.setEofCb (cb); };

    //-----------------------------------------

    this.connect = function (cb) {
	var self = this;
	this._connect_cb = cb;
	this.tcp_stream = new net.createConnection (port, hostname);
       this.tcp_stream.setNoDelay(true);
	this.rpc_stream = new MsgpackRPCStream (this.tcp_stream);
	this.rpc_stream.on ('ready', 
			    function () { self._trigger (true, null); });
	this.tcp_stream.on ('error', 
			    function (err) { self._trigger (false, err); });
    };

    //-----------------------------------------

    this.notify = function () {
	this.rpc_stream.notify.apply (this.rpc_stream, arguments);
    };

    //-----------------------------------------

    this.invoke = function () {
	this.rpc_stream.invoke.apply (this.rpc_stream, arguments);
    };

    //-----------------------------------------

    this.close = function () {
	this.tcp_stream.end ();
    };

    //-----------------------------------------

    return this;
};

//=======================================================================

exports.Transport = Transport;
exports.createTransport = function (hostname, port) {
    return new Transport (hostname, port);
};

//=======================================================================

function Client (transport, program) {
    this.transport = transport;
    this.program = program;

    //--------------------------------------------------

    this.invoke = function () {
	if (this.program) {
	    arguments[0] = this.program + "." + arguments[0];
	}
	this.transport.invoke.apply (this.transport, arguments);
    };

    //--------------------------------------------------

    this.notify = function () {
	if (this.program) {
	    arguments[0] = this.program + "." + arguments[0];
	}
	this.transport.notify.apply (this.transport, arguments);
    };

    //--------------------------------------------------

    return this;
};

//=======================================================================

exports.Client = Client;

//=======================================================================

exports.createClient = function (hostname, port, cb) {

    if (hostname && (!hostname.length || hostname == "-")) {
	hostname = null;
    }

    var conn = new net.createConnection (port, hostname);
    conn.setNoDelay(true);
    var s = new MsgpackRPCStream (conn);
    if (cb) { s.on ('ready', cb); }
    return s;
};

//=======================================================================

var ServerConnection = function (server, tcpStream) {

    var self = this;
    this._tcpStream = tcpStream;
    this._tcpStream.setNoDelay(true);
    this._remote = tcpStream.remoteAddress + ":" + tcpStream.remotePort;
    this._server = server;
    this._verbose = false;
    this._name = "";
    this._program = null;
    this._dispatch = {};
    this._alive = true;
    
    //-----------------------------------------

    this._msg = function (m, important) {
	if (this._verbose || important) {
	    var s = "";
	    if (this._name) {
		s = this._name + ": ";
	    }
	    s += m;
	    console.log (s);
	}
	return s;
    };

    //-----------------------------------------

    this.setProgram = function (p) { this._program = p; }

    //-----------------------------------------

    this.addPrograms = function (progs) {
	for (var prog in progs) {
	    this.addProgram (prog, progs[prog]);
	}
    };

    //-----------------------------------------

    this.addProgram = function (progname, methods) {
	for (var method in methods) {
	    this.addHandler (method, methods[method], progname);
	}
    };

    //-----------------------------------------

    this.addHandler = function (nm, fn, prog) {
	if (!prog) { prog = this._program; }
	if (prog && prog.length) {
	    nm = prog + "." + nm;
	}
	this._dispatch[nm] = fn;
    };

    //-----------------------------------------

    this.dispatch = function (method, param, response) {
	var handler = this._dispatch[method];
	if (handler) {
	    handler.call (this, param, response);
	} else if (response) {
	    response.error(new Error("unknown method")); 
	}
    };

    //-----------------------------------------

    this.serve = function () {
	self._connected ();
	tcpStream.on ('end', function () {
	    self._eof ();
	});
	this._rpcStream = new MsgpackRPCStream(tcpStream, self);
	this._rpcStream.on ('error', function (e) {
	    self._msg ("Error from " + self._remote + ": " + e, true);
	    self._eof ();
	});
    };

    //-----------------------------------------

    // Virtual methods that the subclasses can override if they want to.

    this._connected = function () {
	this._alive = true;
	self._msg ("new connection from " + self._remote);
    };

    //-----------------------------------------

    this._eof = function () {
	if (this._alive) {
	    this._alive = false;
	    self._msg ("EOF from " + self._remote)
	    tcpStream.end ();
	}
    };
};

exports.ServerConnection = ServerConnection;

//=======================================================================

var Server = function (newConnectionHook) {
    net.Server.call(this);
    var self = this;
    
    this.on('connection', function(tcpStream) {
	var con = newConnectionHook (this, tcpStream);
	con.serve ();
    });
}

//-----------------------------------------------------------------------

sys.inherits(Server, net.Server);

//-----------------------------------------------------------------------

exports.createServer = function (newConnectionHook) {
    return new Server (newConnectionHook);
}

//=======================================================================

