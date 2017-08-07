let net = require('net');


let log = console.log;
let options = {
    host:'127.0.0.1',
    port:8000
};


let client = new net.connect(options);

client.on('connection',function (sock) {
    log('client 已建立连接');
    log(sock);
});

client.on('close',function (sock) {
    log('服务器关闭')
});

client.on('error',function (err) {
    log('socket连接错误，将在1秒后重连');
    //log(err);
    setTimeout(() => {
        client.end();
        client.connect(options);
    }, 1000);
})

client.on('data',function (data) {
    log('data')
    log(data)

})

client.on('end',function (data) {
    log('end')
})


client.on('drain',function (data) {
    log('drain')
})

client.on('timeout',function (data) {
    log('timeout')
})


module.exports = client;