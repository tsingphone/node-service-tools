let net = require('net');
let fs = require('fs');

let log = console.log;

class SocketClient {
    constructor(options) {
        this.options = options;
        this.connected = false;
        this.authenticated = false;
        this.client = net.Socket();
        this.client.connect(options);
        this.client.setNoDelay(true);
        this.bindingEvent();
    }

    bindingEvent() {
        let self = this;
        this.client.on('connect',function () {
            log(arguments)
            self.connected = true;
            log('client 已建立连接');
            let msg = {
                type: 'auth',
                data: self.owner.id
            }
            self.client.write(JSON.stringify(msg))
        });

        this.client.on('close',function (had_error) {
            self.connected = false;
            log('服务器关闭')
            //log(err);
            if (had_error) {
                log('socket错误，将在1秒后重连');
                setTimeout(() => {
                    self.client.end();
                    self.client.connect(self.options);
                }, 1000);
            }
        });

        this.client.on('error',function (err) {
            log('error')
        })

        this.client.on('data',function (data) {
            //log('收到数据:   ' + data.toString());
            //log( '4  @  ' + new Date().getTime())
            self.handleMsgObject(JSON.parse(data.toString()));
            //log( '5  @  ' + new Date().getTime())
            //this.client.responseCall(JSON.parse(data.toString()))
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

    sendMsg(msgObj) {
        //  log( '3  @  ' + new Date().getTime())
        this.client.write(JSON.stringify(msgObj))
        //    let buf1 = Buffer.from(msg);
        /*        let buf1 = Buffer.alloc(810).fill('我');
         let len = buf1.length;
         let buf2 = Buffer.alloc(2);
         buf2.writeInt16BE(len,0)
         let buf = Buffer.concat([buf2, buf1],len + buf2.length)
         this.write(buf);*/
    }

    handleMsgObject(msgObj){
        if(msgObj.type==='auth') {
            if(msgObj.data && !msgObj.error) {
                log('连接授权认证成功')
                this.authenticated = true;
            } else {
                log('连接授权认证失败')
            }
        }
        else {  //计算结果返回
            this.owner.receivedQue.push(msgObj);
        }
    }
}


class RPCClient {
    constructor(options,services) { //构造函数
        this.options = options;

        this.id = Math.ceil(Math.random()*10000000000);  //??
        this.waitingQue = [];
        this.sendedRequest = {};  //Hash Object
        this.receivedQue = [];

        this.seq = 0;
        this.curConnIndex = 0;
        this.connections = [];
        this.setMethods();  //??
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
        //log(1)
        while (this.waitingQue.length>0) {
            //发送请求数据
            //log( '2  @  ' + new Date().getTime())
            let msg = this.waitingQue.shift();
            let conn = this.getConnection();
            if (!conn) {
                msg.callback('当前服务器连接不可用',null);
            }
            else {
                this.sendedRequest[msg.id.toString()] = msg;
                //id,serviceName,argsArray,callback
                conn.sendMsg({
                    id:msg.id,
                    serviceName:msg.serviceName,
                    argsArray:msg.argsArray
                });

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
                //log( '6  @  ' + new Date().getTime())
                req.state = 2;  //?
                req.callback && req.callback(resObj.error,resObj.data);
                delete this.sendedRequest[id];  //?
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
                break;
            };
        } while (true)
        this.curConnIndex = i;
        return this.connections[i];
    }

    //从服务器获取方法后，赋予成员方法
    setMethods() {
        let names = ['add','err'];
        let self = this;
        for(let m of names) {
            let f = function () {
                let serviceName = m;//this.serviceName;
                let args = [];
                let len = arguments.length;
                if(len==0) {
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
            }
            f.serviceName = m;
            this[m] = f;
        }

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