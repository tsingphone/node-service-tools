const RPC_Server = require('../').RPC_Server;


let options = {
    port:8000,
    delay:5000,
    maxWaiting:1000,
    maxBatchExecute:50,
    keepAlive:3000
};

let rpc = new RPC_Server(options);

let add = function (a,b,callback) {
    //log('add :' + a + ' && ' + b)
    callback(null,a+b);
}

let err = function (a,b,callback) {
    //log('err :' + a + ' && ' + b)
    callback('这是测试错误',null);
}

rpc.registerMethod('add',add);
rpc.registerMethod('err',err);


