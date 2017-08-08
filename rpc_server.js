/*
*
* */

let net = require('net');

let add = function (a,b,callback) {
    callback(null,a+b);
}

let err = function (a,b,callback) {
    callback('这是测试错误',null);
}



let log = console.log;
let options = {
    port:8000
};

class RPCServer {
    constructor(options) { //构造函数
        options = {
            host:'127.0.0.1',
            port:8000,
            delay:5000,
            maxWaiting:1000
        };
        this.options = options;
        this.methods = {};
        this.connection = net.createServer(options);
        this.bindingServerEvent();
        this.connection.listen(this.options.port);
        this.registerService();
    };

    callService(reqJson) {
        let {seq, serviceName, args} = reqJson;
        let callback = function (err,data) {
            let respObj = {seq,err,data};
        }
        server.services[serviceName].apply(null,args)
        //{seq,err,data}
    };

    bindingServerEvent() {
        let self = this;
        this.connection.on('connection',function (sock) {
            log('server 已建立连接');
            //log(sock);
            self.bindingSocketEvent(sock);

        });

        this.connection.on('close',function (sock) {
            log('服务器关闭')
        });

        this.connection.on('error',function (err) {
            log('socket 服务器错误，将在1秒后重连');
            log(err);
            setTimeout(() => {
                this.connection.close();
                this.connection.listen(this.options.port);
            }, 1000);
        })
    }

    bindingSocketEvent(sock) {
        sock.on('connect', function (data) {
            log('sock connect')
        })

        sock.on('data', function (data) {
            /* if (data.length>1000)
                 log('sock data: ' + data.length)
             else
                 log('---------: ' + data.length)*/

            log(data.toString());
            //this.connection.callService(sock,JSON.parse(data.toString()));

            //let len = data.readInt16BE(0);
            //log(len.toString(10));
            //log(data.toString())
            //log(sock)

        })

        sock.on('close', function (data) {
            log('sock close')
        })

        sock.on('end', function (data) {
            log('sock end')
        })

        sock.on('error', function (data) {
            log('sock error')
        })

        sock.on('drain', function (data) {
            log('sock drain')
        })

        sock.on('timeout', function (data) {
            log('sock timeout')
        })
    }

    registerService() {
        this.methods['add'] = add;
        this.methods['err'] = err;
    }
}

let server = new RPCServer();

