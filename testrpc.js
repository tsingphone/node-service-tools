const RPC = require('./rpc_client');

let log = console.log;

let rpc = new RPC();


setInterval(function () {
    rpc.callService('add',[1,2],function (err,data) {
        log(err);
        log(data);
    })
}, 1000)

/*var f = function (a,b) {
    return (a + b);
}

log(f.apply(null,[2,3]))*/

/*

setInterval(function () {
    rpc.sendMsg('time:' + new Date().getTime())
}, 20)


rpc.writeFile('time:' + new Date().getTime())*/
