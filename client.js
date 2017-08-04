var zmq = require('zeromq');
var requester = zmq.socket('dealer');
var receiver = zmq.socket('dealer');

var log = console.log;
requester.connect('tcp://127.0.0.1:6666');
receiver.connect('tcp://127.0.0.1:5555');

var i=0;
var t = Math.ceil(Math.random()*300);
t = t;

log('开始了：' + t)

/*while (true) {
    requester.send(t +' msg request: ' +i);
    i++
}*/

setInterval(function(){
    if (i < 1000000) {
        //log('send:' + i)
        var msg = {
            gid: t,
            start: new Date().getTime(),
            seq:i
        }
        requester.send(JSON.stringify(msg));
    }
  i++;
},20);

var lst = 0;
requester.on('message', function(){
    console.log('from server 6666');
    return;


    var args = Array.apply(null, arguments);
    var msg = args[1]
    var msgObj = JSON.parse(msg);
    var endt = new Date().getTime();
    lst += msgObj.serverrandout;
    console.log( msgObj.gid + ', @seq= ' + msgObj.seq + ', @serverRandTimeout= ' + msgObj.serverrandout + ', @lastTime= ' + lst +   ', @alltime= ' + (endt - msgObj.start));

});

receiver.on('message', function(){
    var args = Array.apply(null, arguments);
    var msg = args[1]
    var msgObj = JSON.parse(msg);
    var endt = new Date().getTime();
    lst += msgObj.serverrandout;
    console.log( msgObj.gid + ', @seq= ' + msgObj.seq + ', @serverRandTimeout= ' + msgObj.serverrandout + ', @lastTime= ' + lst +   ', @alltime= ' + (endt - msgObj.start));

});