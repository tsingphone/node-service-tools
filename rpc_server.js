let net = require('net');


let log = console.log;
let options = {
    port:8000
};


let server = net.createServer(options);

server.on('connection',function (sock) {

});

server.on('error',function (err) {
    log('socket 服务器错误，将在1秒后重连');
    log(err);
    setTimeout(() => {
        server.close();
        server.listen(options.port);
    }, 1000);
})