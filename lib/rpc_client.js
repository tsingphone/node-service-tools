let net = require('net');
let fs = require('fs');

let log = console.log;
let logs = [];
let logt = function (msg,time) {
    logs.push({msg,time})
}

var encodeData = function (obj) {
    let buf1 = Buffer.from(JSON.stringify(obj));
    let len = buf1.length;
    let buf2 = Buffer.alloc(4);
    buf2.writeInt32BE(len,0);
    return Buffer.concat([buf2, buf1],len+4);
}

var decodeData = function (buf) {
    let start = 0, end = 0, total = buf.length, len = 0, objList = [];
    while (start < total) {
        len = buf.readInt32BE(start);
        end = start + 4 + len;
        objList.push(JSON.parse(buf.slice(start+4,end).toString()));
        start = end;
    }
    return objList;
}


class SocketClient {
    constructor(options) {
        this.options = options;
        this.connected = false;
        this.authenticated = false;
        this.connection = net.Socket();
        this.connection.connect(options);
        this.connection.setNoDelay(true);
        this.bindingEvent(this);
    }

    sendMsg(msgObj) {
        this.connection.write(encodeData(msgObj));
        logt( '3  sending  @  id=' + msgObj.data.id, new Date().getTime())
        //    let buf1 = Buffer.from(msg);
        /*        let buf1 = Buffer.alloc(810).fill('我');
                let len = buf1.length;
                let buf2 = Buffer.alloc(2);
                buf2.writeInt16BE(len,0)
                let buf = Buffer.concat([buf2, buf1],len + buf2.length)
                this.write(buf);*/
    }

    bindingEvent(self) {
        this.connection.on('connect',function () {
            log(arguments)
            self.connected = true;
            log('client 已建立连接');
            let msg = {
                type: 'init',
                data: {
                    connection_id : self.owner.id
                }
            };
            self.connection.write(encodeData(msg))
        });

        this.connection.on('close',function (had_error) {
            self.connected = false;
            log('服务器关闭')
            //log(err);
            if (had_error) {
                log('socket错误，将在1秒后重连');
                setTimeout(() => {
                    self.connection.end();
                    self.connection.connect(self.options);
                }, 1000);
            }
        });

        this.connection.on('error',function (err) {
            log('error')
        });

        this.connection.on('data',function (buf) {
            logt( '4  receiving  @  ', new Date().getTime())
            let objList = decodeData(buf);
            for(let obj of objList) {
                if (typeof self['on_' + obj.type] === 'function') {
                    self['on_' + obj.type](self, obj.data)
                }
            }
            //this.connection.responseCall(JSON.parse(data.toString()))
        });

        this.connection.on('end',function (data) {
            log('end')
        });


        this.connection.on('drain',function (data) {
            log('drain')
        });

        this.connection.on('timeout',function (data) {
            log('timeout')
        })

    }

    on_init(sock, data) {
        if(data.authenticated) {  //验证成功
            log('连接授权认证成功')
            this.authenticated = true;
            //
            if (!data.methods || data.methods.length===0) {
                log('服务器还没有暴露接口方法')
            }
            else {
                sock.owner.setMethods(data.methods)
            }
        }
        else {  //验证失败
            log('连接授权认证失败')
        }
    }

    on_call(sock, msgObj) {
        sock.owner.receivedQue.push(msgObj);
    }
}


class RPCClient {
    constructor(options,services) { //构造函数
        this.options = options;

        this.id = ''+ new Date().getTime() + Math.ceil(Math.random()*1000000000);  //??
        this.id = this.id.substr(5);
        this.waitingQue = [];
        this.sendedRequest = {};  //Hash Object
        this.receivedQue = [];
        this.methods = [];

        this.seq = 0;
        this.curConnIndex = 0;
        this.connections = [];
        for(let s of services) {
            let sock = new SocketClient(s);  //负责管理连接和调用
            sock.owner = this;
            this.connections.push(sock);
        }
        this.loopSendMsg();
        this.loopPullMsg();

    }  //结束构造器

    callService(serviceName,argsArray,callback) {
        //debugger
        if (this.waitingQue.length >= this.options.maxWaiting) {
            callback('请求过于频繁，请求队列已满',null);
            return;
        }
        let s = {serviceName,argsArray,callback};
        s.id = this.id + '_' + (++this.seq);
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
        //log(1)
        let i = 0;
        while (this.waitingQue.length>0 && (this.options.maxBatchExecute<=0 || i < this.options.maxBatchExecute)) {
            //发送请求数据
            logt( '2  @  ',new Date().getTime())
            let msg = this.waitingQue.shift();
            let conn = this.getConnection();
            if (!conn) {
                msg.callback('当前服务器连接不可用',null);
            }
            else {
                this.sendedRequest[msg.id.toString()] = msg;
                //id,serviceName,argsArray,callback
                conn.sendMsg({
                    type:'call',
                    data:{
                        id:msg.id,
                        serviceName:msg.serviceName,
                        argsArray:msg.argsArray
                    }
                });
                i++;
            }
        }
        //process.nextTick(this.loopSendMsg());
        let self = this;
        setImmediate(function (){
            self.loopSendMsg();
        })
    }

    loopPullMsg() {
        let n = this.receivedQue.length;
        for(let i=0; i<n; i++) {
            let resObj = this.receivedQue.shift();
            let id = resObj.id;
            /*if (typeof id !== 'string' ) {
                continue;  //直接丢弃
            }*/
            let req = this.sendedRequest[id.toString()];
            if (req) {
                logt( '6  pull result @  ', new Date().getTime())
                //req.state = 2;  //?
                req.callback && req.callback(resObj.error,resObj.data);
                delete this.sendedRequest[id];  //?
                let s = logs[0].time;
                let e = logs[logs.length-1].time;
                //log('kkkkkkkkkaaaaaaaaaaaaaaaaaaaaa')
                //log(logs)
                //log(logs)
                if(e-s>= 5) {
                    log(logs)
                }
                logs = [];
            }
        }
        //process.nextTick(this.loopPullMsg);
        let self = this;
        setImmediate(function (){
            self.loopPullMsg();
        })
    }

    getConnection() {  //在这里可以设计负载均衡算法； //按照依次发送
        let n = this.connections.length;
        let i = this.curConnIndex;
        let c = 0;
        do{
            c++;
            i++;
            if (i>=n) i=0;
            if (this.connections[i].connected && this.connections[i].authenticated) break;
            if (c>n) {
                return null;
            }
        } while (true);
        this.curConnIndex = i;
        return this.connections[i];
    }

    //从服务器获取方法后，赋予成员方法
    setMethods(names) {
        if (this.methods.length > 0) {
            return;
        }
        //let names = ['add','err'];
        let self = this;
        for(let m of names) {
            let f = function () {
                let serviceName = m;//this.serviceName;
                let args = [];
                let len = arguments.length;
                if(len===0) {
                    log('请传入正确的调用参数，至少需要包括一个回调函数')
                    return;
                }
                for(let i=0; i<len-1;i++) {
                    args.push(arguments[i])
                }
                let callback = arguments[len-1];
                if (typeof callback !== 'function') {
                    log('最后一个参数必须是回调函数')
                    return;
                }
                this.callService(m,args,callback)
            };
            f.serviceName = m;
            this[m] = f;
        }
        this.methods = names;
        log('已完成初始化，可用开始服务调用了')

    }



}






/*client.call = function (serviceName,args,callback) {
    //

}*/

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