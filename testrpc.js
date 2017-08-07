const rpc = require('./rpc_client');

let log = console.log;

setInterval(function () {
    log('time:' + new Date().getTime())
    rpc.write('time:' + new Date().getTime())
}, 3000)