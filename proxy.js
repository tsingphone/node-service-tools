// Simple request-reply broker in Node.js

var zmq = require('zeromq')
    , serverEnd = zmq.socket('dealer')
    , clientEnd  = zmq.socket('router');

serverEnd.bindSync('tcp://*:5555');
clientEnd.bindSync('tcp://*:6666');

serverEnd.on('message', function() {
    // Note that separate message parts come as function arguments.
    var args = Array.apply(null, arguments);
    console.log(args[1].toString())
    // Pass array of strings/buffers to send multipart messages.
    clientEnd.send(args);
});

clientEnd.on('message', function() {
    var args = Array.apply(null, arguments);
    serverEnd.send(args);
});