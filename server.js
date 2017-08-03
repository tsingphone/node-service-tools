console.log('00000000000000');
var zmq = require('zeromq');
var sender = zmq.socket('dealer');
sender.connect('tcp://127.0.0.1:5555');
console.log('222222222  rpc   server  222222222');
//sender.connect('tcp://127.0.0.1:6666');

sender.on('message', function(){
    var args = Array.apply(null, arguments);
    var msg = args[1]
    var msgObj = JSON.parse(msg);
    //var t = Math.ceil(Math.random()*200);
    msgObj.serverrandout = 0;//t;
    //console.log(msgObj.gid + '   :@rand= ' + t + ' @seq= ' + msgObj.seq);
    sender.send([args[0], '', JSON.stringify(msgObj)]);
    /*setTimeout(function () {
        sender.send([args[0], '', JSON.stringify(msgObj)]);
    },t);*/
  /*  setTimeout(function () {
        sender.send('reply1  ' + msg);
    },500)*/
});

sender.on('error', function(err){
    console.log(err)
});