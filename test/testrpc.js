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
        port:8080
    }
];
let rpc = new RPC(options,services);

let stat = {
    total:0,
    success:0,
    wrong:0,
    error:0,
    times:new Array(1000)
}  //


let ints = setInterval(function () {
    if (!rpc.add) {
        return
    }
   /* if (!rpc.authenticated || !rpc.connected) {
        log(rpc.authenticated)
        log(rpc.connected)
        log('还未建立连接')
        return;
    }*/
    let s = new Date().getTime();
    let a = Math.random()*100;
    let b = Math.random()*100;
    let t = Math.ceil(Math.random()*2000);
    let f = Math.random();
    //log( '1  @  ' + new Date().getTime() + ' @ ' + a + ' @ ' + b)
    stat.total++;
/*    cnt++;
    if (cnt > 1000) {
        clearInterval(ints)
    }*/
    if (f > 0.5) {
        rpc.add(a,b,t,function (err,data) {
            let e = new Date().getTime();
            if(err) {
                log(err)
                stat.error++;
                return;
            }
            if (Math.abs(a+b-data) < 0.00000000001) {
                stat.success++
            }
            else {
                stat.wrong++
            }
            let dd = e - s - t;
            if (stat.times[dd]){
                stat.times[dd] = stat.times[dd] + 1
            }
            else{
                stat.times[dd] = 1
            }
        })
    }
    else {
        rpc.minus(a,b,t,function (err,data) {
            let e = new Date().getTime();
            if(err) {
                log(err)
                stat.error++;
                return;
            }
            if (Math.abs(a-b-data) < 0.00000000001) {
                stat.success++
            }
            else {
                stat.wrong++
            }
            let dd = e - s - t;
            if (stat.times[dd]){
                stat.times[dd] = stat.times[dd] + 1
            }
            else{
                stat.times[dd] = 1
            }
        })
    }
}, 500)


setInterval(function () {
    //输出结果
    log('total req:        ',  stat.total)
    log('total ok :        ',  stat.success)
    log('total err:        ',  stat.error)
    log('total not return: ',  stat.total - stat.success - stat.error)
    log('pool length:      ',  rpc.waitingQue.length)

/*    log('times-----------------------')
    for (let i=0; i<stat.times.length;i++) {
        if (stat.times[i]) {
            log(i + '  @   ' + stat.times[i])
        }
    }*/

},3000)

/*var f = function (a,b) {
    return (a + b);
}

log(f.apply(null,[2,3]))*/

/*

setInterval(function () {
    rpc.sendMsg('time:' + new Date().getTime())
}, 20)


rpc.writeFile('time:' + new Date().getTime())*/
