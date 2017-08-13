const RPC_Server = require('../').RPC_Server;
let rpc = new RPC_Server({})

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


