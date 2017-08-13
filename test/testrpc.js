const RPC = require('../').RPC_Client;

let log = console.log;

let options = {
    delay:5000,
    maxWaiting:1000,
    maxBatchExecute:50,
};
let services = [
    {
        host:'127.0.0.1',
        port:8000
    }
];
let rpc = new RPC(options,services);


setInterval(function () {

    let s = new Date().getTime();
    let a = Math.random()*100;
    let b = Math.random()*100;
    //log( '1  @  ' + new Date().getTime() + ' @ ' + a + ' @ ' + b)
    rpc.add(a,b,function (err,data) {
        let e = new Date().getTime();
        //log('99  @  ' + a + ' @ ' + b + ' @ 结果等于'  + ' @ ' + data)
        //log(e - s);
    })

/*    rpc.err(2,3,function (err,data) {
        log('88  @  ' + err + ' @ ' + new Date().getTime())
    })*/
    /*rpc.callService('add',[1,2],function (err,data) {
        log('99  @  ' + new Date().getTime())
        //log(err);
        //log(data);
    })*/
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
