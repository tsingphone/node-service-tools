let net = require('net');
let fs = require('fs');

let log = console.log;

class SocketClient {
    constructor(options) {
        this.counter = 0;
        this.seq = 0;
        this.calls = {};

        this.client = new net.connect(options);
        this.bindingClientEvent();
    }

    sendMsg(msg) {
        this.write(msg)
        //    let buf1 = Buffer.from(msg);
        /*        let buf1 = Buffer.alloc(810).fill('我');
                let len = buf1.length;
                let buf2 = Buffer.alloc(2);
                buf2.writeInt16BE(len,0)
                let buf = Buffer.concat([buf2, buf1],len + buf2.length)
                this.write(buf);*/
    }

    bindingClientEvent() {
        this.client.on('connection',function (sock) {
            log('client 已建立连接');
        });

        this.client.on('close',function (sock) {
            log('服务器关闭')
        });

        this.client.on('error',function (err) {
            log('socket连接错误，将在1秒后重连');
            //log(err);
            setTimeout(() => {
                this.client.end();
                this.client.connect(options);
            }, 1000);
        })

        this.client.on('data',function (data) {
            log('data')
            log(data)
            this.client.responseCall(JSON.parse(data.toString()))

        })

        this.client.on('end',function (data) {
            log('end')
        })


        this.client.on('drain',function (data) {
            log('drain')
        })

        this.client.on('timeout',function (data) {
            log('timeout')
        })

    }
}


class RPCClient {
    constructor(options,services) { //构造函数
        options = {
            host:'127.0.0.1',
            port:8000,
            delay:5000,
            maxWaiting:1000
        };
        services = [
            {
                host:'127.0.0.1',
                port:8000
            }
        ];
        this.services = services;
        this.options = options;
        this.waitingQue = [];
        this.sendedRequest = {};  //Hash Object
        this.receivedQue = [];

        this.counter = 0;
        this.seq = 0;
        this.curConnIndex = 0;
        this.connections = [];
        for(let s of this.services) {
            let sock = new SocketClient(this.options);
            this.connections.push(sock);
        }
    }  //结束构造器



    callService(serviceName,argsArray,callback) {
        if (this.waitingQue.length >= this.options.maxWaiting) {
            callback('服务器繁忙',null);
            return;
        }
        let s = {serviceName,argsArray,callback};
        s.id = ++this.seq;
        if(this.seq >= 9007199254740991) {
            this.seq = 0;
        }
        this.waitingQue.push(s)
        /*
        let seq = client.seq++;
        client.counter++;
        let obj = {
            seq:seq,
            serviceName:serviceName,
            args:args
        }
        let timeout = setTimeout(function () {
            if (client.calls[seq]) {
                client.calls[seq].callback('服务器调用超时',null);
                delete client.calls[seq];
                client.counter--;
            }
        },options.delay);
        client.calls[seq] = {timeout,callback};
        client.sendMsg(obj);
        */
    }

    loopSendMsg() {
        log(1)
        if (this.waitingQue.length>0) {
            //发送请求数据
            let conn = this.getConnection();
            if (!conn) {
                log('当前服务器连接不可用');
                return;
            }
            let msg = this.waitingQue.shift();
            this.sendedRequest[msg.id] = msg;
            conn.sendMsg(msg);
        }
        process.nextTick(this.loopSendMsg());
    }

    loopPullMsg() {
        log(2)
        n = this.receivedQue.length;
        for(let i=0; i<n; i++) {
            let resObj = this.receivedQue.shift();
            let id = resObj.id;
            if (typeof id !== 'string' ) {
                continue;  //直接丢弃
            }
            let req = this.sendedRequest[id];
            if (req) {
                req.state = 2;  //?
                req.callback && req.callback(resObj.error,resObj.data);
                delete this.sendedRequest[id];  //?
            }
        }
        process.nextTick(this.loopSendMsg());
    }

    getConnection() {  //在这里可以设计负载均衡算法； //按照依次发送
        let n = this.services.length;
        let i = this.curConnIndex;
        let c = 0;
        do{
            c++;
            i++;
            if (i>=n) i=0;
            if (this.services[i].isActive===1) break;
            if (c>n) {
                return null;
                break;
            };
        } while (true)
        this.curConnIndex = i;
        return this.services[i];
    }

    //从服务器获取方法后，赋予成员方法
    setMethods() {
        let names = ['add','err'];
        for(let m of names) {
            this[m] = function () {
                log(this)
            }
        }

    }



}

client.call = function (serviceName,args,callback) {
    //

}

/*
msg = {seq, err, data}
* */
/*
client.responseCall = function (msg) {
    let {seq,err,data} = msg;
    if (client.calls[seq]) {
        client.calls[seq].callback(err,data);
        delete client.calls[seq];
        client.counter--;
    }
}
*/

module.exports = RPCClient;