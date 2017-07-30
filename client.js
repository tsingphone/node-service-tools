var zmq = require('zeromq');
var requester = zmq.socket('req');

var log = console.log;

log('111111')
requester.connect('tcp://127.0.0.1:3000');

var i=0;
var t = Math.ceil(Math.random()*10);
t = t*50;

log('开始了：' + t)
setInterval(function(){
  log('send:' + i)
    requester.send(t +' msg request: ' +i);
  i++;
},t);

requester.on('message', function(msg){
    console.log('from server: %s', msg.toString());
});
