//const rpc = require('./rpc_client');

let log = console.log;

var f = function (a,b) {
    return (a + b);
}

log(f.apply(null,[2,3]))

/*

setInterval(function () {
    rpc.sendMsg('time:' + new Date().getTime())
}, 20)


rpc.writeFile('time:' + new Date().getTime())*/
