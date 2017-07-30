console.log('00000000000000');
var zmq = require('zeromq');
var sender = zmq.socket('rep');

console.log('222222222222222222');
sender.bindSync('tcp://127.0.0.1:3000');

console.log('Producer bound to port 3000');

sender.on('message', function(msg){
    console.log('received : %s', msg.toString());
    setTimeout(function () {
        sender.send('reply2  ' + msg);
    },1000)
    setTimeout(function () {
        sender.send('reply1  ' + msg);
    },500)
});
