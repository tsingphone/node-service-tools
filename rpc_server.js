/*
*
* */

let net = require('net');

let add = function (a,b,callback) {
    log('add :' + a + ' && ' + b)
    callback(null,a+b);
}

let err = function (a,b,callback) {
    log('err :' + a + ' && ' + b)
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

        this.waitingQue = [];
        this.callingRequest = {};  //Hash Object
        this.connections = {};

        this.server = net.createServer(options);
        this.bindingServerEvent();
        this.server.listen(this.options.port);
        this.registerService();
        this.loopDealMsg();

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
        this.server.on('connection',function (sock) {
            //sock.write('test from server')
            //log(sock);
            self.bindingSocketEvent(sock);

        });

        this.server.on('close',function (sock) {
            log('服务器关闭')
        });

        this.server.on('error',function (err) {
            log('socket 服务器错误，将在1秒后重连');
            log(err);
            setTimeout(() => {
                this.server.close();
                this.server.listen(this.options.port);
            }, 0);
        })
    }

    bindingSocketEvent(sock) {
        let self = this;
        sock.on('connect', function (data) {
            log('sock connect')
        })

        sock.on('data', function (data) {
            log( '1  @  ' + new Date().getTime())
            //log(data.toString())
            let msgObj = JSON.parse(data.toString());
            self.handleMsgObject(sock,msgObj);

            /* if (data.length>1000)
                 log('sock data: ' + data.length)
             else
                 log('---------: ' + data.length)*/
            //log(JSON.parse(data.toString()));
            //this.server.callService(sock,JSON.parse(data.toString()));

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

    handleMsgObject(sock,msgObj) {
        //log(msgObj);
        let self = this;
        if (msgObj.type === 'auth') {
            self.auth(function (err,result) {
                if(!err && result) {
                    sock.id = msgObj.data;
                    self.connections[sock.id] = sock;
                }
                let msgObj2 = {
                    type:'auth',
                    data:result,
                    error:err
                }
                sock.write(JSON.stringify(msgObj2));
            })
        }
        else {  //if (msgObj.type === 'call')
            msgObj.socketId = sock.id;
            this.waitingQue.push(msgObj);
            log( '2  @  ' + new Date().getTime())
        }
    }

/*    sendMsg(msgObj) {
        this.server.write(JSON.stringify(msgObj));
    }*/

    loopDealMsg() {
        //log(1)
        let self = this;
        while (this.waitingQue.length>0) {
            //log(3)
            log( '3  @  ' + new Date().getTime())
            //log(this.waitingQue)
            //  id,serviceName,argsArray
            let msgObj = this.waitingQue.shift();
            let {id,serviceName,argsArray} = msgObj;
            this.callingRequest[id] = msgObj;
            let m = this.methods[serviceName];
            if (!m) {  //方法不存在
                self.sendMsg(msgObj.socketId,{
                    id:msgObj.id,
                    error:'方法不存在',
                    data:null
                })
                continue;
            }
            let callback = function (err,data) {
                self.sendMsg(msgObj.socketId,{
                    id:msgObj.id,
                    error:err,
                    data:data
                })
            };
            argsArray.push(callback);
            m.apply(null,argsArray);
            log( '4  @  ' + new Date().getTime())
        }
        //process.nextTick(this.loopSendMsg());
        setTimeout(function (){
            self.loopDealMsg();
        },0)
    }

    sendMsg(socketId,msgObj) {
        let sock = this.connections[socketId];
        if (sock) { //??  && sock.isActive
           sock.write(JSON.stringify(msgObj));
            log( '99  @  ' + new Date().getTime())
        }
    }

    auth(callback) {
        return callback(null,true);
    }

    registerService() {
        this.methods['add'] = add;
        this.methods['err'] = err;
    }
}

let server = new RPCServer();

