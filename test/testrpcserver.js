const RPC_Server = require('../').RPC_Server;


let options = {
    port:8000,
    delay:5000,
    maxWaiting:1000,
    maxBatchExecute:50,
    keepAlive:3000
};

let arguments2 = process.argv.splice(2,1);
if (arguments2.length>0) {
    options.port = parseInt(arguments2[0]);
}

let rpc = new RPC_Server(options);

let add = function (a,b,delay,callback) {
    setTimeout(function () {
        callback(null,a+b);
    },delay)
}

let minus = function (a,b,delay,callback) {
    setTimeout(function () {
        callback(null,a-b);
    },delay)
}

rpc.registerMethod('add',add);
rpc.registerMethod('minus',minus);


