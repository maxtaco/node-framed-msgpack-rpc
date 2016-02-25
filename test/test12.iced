# Test connecting over TLS with a hardcoded CA cert.

fs = require 'fs'
path = require 'path'
{server,transport,client} = require '../src/main'

PORT = 8881

s = null

exports.init = (cb) ->
  tls_opts = {
    key: fs.readFileSync(path.join(__dirname, 'ca/good/server-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ca/good/server-crt.pem')),
    ca: fs.readFileSync(path.join(__dirname, 'ca/good/ca-crt.pem')),
  }
  # Similar to test1.iced, but over TLS this time.
  s = new server.Server {
    port : PORT
    programs :
      "P.1" :
        question : (arg, res) -> res.result "ANSWER!"
    tls_opts
  }
  await s.listen defer err
  cb err

exports.destroy = (cb) ->
  await s.close defer()
  s = null
  cb()

exports.test_good_hardcoded_CA_cert = (T, cb) ->
  tls_opts = {
    ca: fs.readFileSync(path.join(__dirname, 'ca/good/ca-crt.pem')),
  }
  # Similar to test1.iced, but over TLS this time.
  x = new transport.Transport { port : PORT, host : "-", tls_opts }
  await x.connect defer err
  if err?
    console.log "Failed to connect in Transport..."
    T.error(err)
  else
    c = new client.Client x, "P.1"
    await T.test_rpc c, "question", {} , "ANSWER!", defer()
    x.close()
  cb()

exports.test_bad_hardcoded_CA_cert = (T, cb) ->
  tls_opts = {
    ca: fs.readFileSync(path.join(__dirname, 'ca/bad/ca-crt.pem')),
  }
  # Similar to test1.iced, but over TLS this time.
  x = new transport.Transport { port : PORT, host : "-", tls_opts }
  await x.connect defer err
  T.assert(err?, "connect should return an error")
  if err?
    T.assert(err.code == 'CERT_SIGNATURE_FAILURE', "error should be because of the bad cert, found: " + err)
  x.close()
  cb()
