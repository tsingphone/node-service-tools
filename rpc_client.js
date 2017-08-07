let net = require('net');
let fs = require('fs');


let log = console.log;
let options = {
    host:'127.0.0.1',
    port:8000
};


let client = new net.connect(options);
client.bufferSize = 512;

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

client.writeFile = function (msg) {
    let fsr = fs.createReadStream('C:\\War3x.mpq');
    fsr.pipe(this);

/*//    let buf1 = Buffer.from(msg);
    let buf1 = Buffer.alloc(810).fill('我');
    let len = buf1.length;
    let buf2 = Buffer.alloc(2);
    buf2.writeInt16BE(len,0)
    let buf = Buffer.concat([buf2, buf1],len + buf2.length)
    this.write(buf);*/
}

client.writeMsg = function (msg) {
    log(msg);
    //    let buf1 = Buffer.from(msg);
        let buf1 = Buffer.alloc(810).fill('我');
        let len = buf1.length;
        let buf2 = Buffer.alloc(2);
        buf2.writeInt16BE(len,0)
        let buf = Buffer.concat([buf2, buf1],len + buf2.length)
        this.write(buf);
}

module.exports = client;