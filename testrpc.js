const rpc = require('./rpc_client');

let log = console.log;



setInterval(function () {
    rpc.writeMsg('time:' + new Date().getTime())
}, 20)


rpc.writeFile('time:' + new Date().getTime())