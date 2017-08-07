let net = require('net');


let log = console.log;
let options = {
    port:8000
};


let server = net.createServer(options);

server.on('connection',function (sock) {
    log('server 已建立连接');
    //log(sock);

    sock.on('connect',function (data) {
        log('sock connect')
    })

    sock.on('data',function (data) {
        if (data.length>1000)
            log('sock data: ' + data.length)
        else
            log('---------: ' + data.length)

        server.call(JSON.parse(data.toString()));

        //let len = data.readInt16BE(0);
        //log(len.toString(10));
        //log(data.toString())
        //log(sock)

    })

    sock.on('close',function (data) {
        log('sock close')
    })

    sock.on('end',function (data) {
        log('sock end')
    })

    sock.on('error',function (data) {
        log('sock error')
    })

    sock.on('drain',function (data) {
        log('sock drain')
    })

    sock.on('timeout',function (data) {
        log('sock timeout')
    })


});

server.on('close',function (sock) {
    log('服务器关闭')
});

server.on('error',function (err) {
    log('socket 服务器错误，将在1秒后重连');
    log(err);
    setTimeout(() => {
        server.close();
        server.listen(options.port);
    }, 1000);
})

server.callService = function (reqJson) {
    let {seq, serviceName, args} = reqJson;
    let callback = function (err,data) {
        
    }
    server.services[serviceName].apply(null,args)
    //{seq,err,data}
}

server.services = {};
server.services.add = function (a,b,callback) {
    callback(null,a+b);
}

server.services.err = function (a,b,callback) {
    callback('这是测试错误',null);
}

server.listen(options.port);



