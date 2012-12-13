
net = require 'net'
{Transport} = require './transport'
{List} = require './list'
log = require './log'

iced = require('./iced').runtime

##=======================================================================

exports.Listener = class Listener

  ##-----------------------------------------

  constructor : ({@port, @host, @TransportClass, log_obj}) ->
    @TransportClass = Transport unless @TransportClass
    @set_logger log_obj
    @_children = new List

  ##-----------------------------------------

  _default_logger : ->
    l = log.new_default_logger()
    l.set_prefix "RPC-Server"
    h = @host or "0.0.0.0"
    l.set_remote "#{h}:#{@port}"
    return l
   
  ##-----------------------------------------

  set_logger : (o) ->
    o = @_default_logger() unless o?
    @log_obj = o
   
  ##-----------------------------------------

  # Feel free to change this for your needs (if you want to wrap a connection
  # with something else)...
  make_new_transport : (c) ->
    x = new @TransportClass
      tcp_stream : c
      host : c.remoteAddress
      port : c.remotePort
      parent : @
      log_obj : @make_new_log_object c
    @_children.push x
    return x

  ##-----------------------------------------
  
  make_new_log_object : (c) ->
    a = c.address()
    r = [ c.address, c.port ].join ":"
    @log_obj.make_child { prefix : "RPC", remote : r }
    
  ##-----------------------------------------

  walk_children : (fn) -> @_children.walk fn
 
  ##-----------------------------------------

  close_child : (c) -> @_children.remove c
   
  ##-----------------------------------------

  set_port : (p) ->
    @port = p
   
  ##-----------------------------------------

  _got_new_connection : (c) ->
    # Call down to a subclass
    x = @make_new_transport c
    @got_new_connection x

  ##-----------------------------------------

  _make_server : () ->
    @_tcp_server = net.createServer (c) => @_got_new_connection c

  ##-----------------------------------------

  _warn : (err) -> @log_obj.warn err
  _err  : (err) -> @log_obj.error err

  ##-----------------------------------------

  close : (cb) ->
    await @_tcp_server.close defer() if @_tcp_server
    @_tcp_server = null
    cb()
 
  ##-----------------------------------------

  handle_close : () ->
    ## closing down
   
  ##-----------------------------------------

  listen : (cb) ->
    @_make_server()
    
    [ OK, ERR ] = [0..1]
    rv = new iced.Rendezvous
    x = @_tcp_server
    x.listen @port, @host
    
    x.on 'error',     rv.id(ERR).defer err
    x.on 'listening', rv.id(OK).defer()
    
    await rv.wait defer which
    if which is OK
      err = null
      x.on 'error', (err) => @handle_error err
      x.on 'close', (err) => @handle_close()
    else
      @_err err
      @_tcp_server = null
      
    cb err

  ##-----------------------------------------

  listen_retry : (delay, cb) ->
    go = true
    err = null
    while go
      await @listen defer err
      if err?.code == 'EADDRINUSE'
        @_warn err
        await setTimeout defer(), delay*1000
      else go = false
    cb err
      

