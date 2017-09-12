let net = require('net');
let fs = require('fs');

let log = console.log;
let logs = [];
let logt = function (msg,time) {
    logs.push({msg,time})
}

var getRand = function(arr) {
    let sum = 0, len = arr.length;
    for (let i = 0; i < len; i++) {
        sum += arr[i];
    }
    let r = Math.random()*sum;

    i = 0; sum = 0;
    for (let i = 0; i < len; i++) {
        sum += arr[i];
        if (sum >= r) break;
    }
    return i;
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
    constructor(url) {
        let lst = url.split(':');
        let len = lst.length;
        if(len < 2 || parseInt(lst[len-1])!==lst[len-1]) {
            log('连接地址解析错误')
        }
        this.options = {
            host: lst[len-2],
            port: parseInt(lst[len-1]),
            retrySeconds: 5
        };
        this.connected = false;
        this.authenticated = false;
        this.connection = net.Socket();
        this.connection.connect(this.options);
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
                let s = self.options.retrySeconds;
                log('socket错误，将在 ' + s + ' 秒后重连');
                setTimeout(() => {
                    self.connection.end();
                    self.connection.connect(self.options);
                }, s*1000);
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
                    self['on_' + obj.type](self, obj)
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

    on_init(sock, resObj) {
        if(!resObj.error) {  //验证成功
            log('连接授权认证成功')
            this.authenticated = true;
            //
            if (!resObj.result || !resObj.result.methods || resObj.result.methods.length===0) {
                log('服务器还没有暴露接口方法')
            }
            else {
                sock.owner.setMethods(resObj.result.methods)
            }
        }
        else {  //验证失败
            log('连接授权认证失败')
        }
    }

    on_call(sock, resObj) {
        if(resObj.error && resObj.error.code === '408') {
            //sock.
        }
        sock.weight = resObj.weight;
        delete resObj.weight;
        sock.owner.receivedQue.push(resObj);
    }
}

/*
* let options = {
    taskTimeoutSeconds:30,  //任务超时时间
    maxWaiting:200, //最大等待发送队列长度
    maxBatchExecute:20,  //每次事件循环发送任务数
};*/
class RPCClient {
    constructor(options,services) { //构造函数
        //log(111)
        options.taskTimeoutSeconds = options.taskTimeoutSeconds || 30;
        options.maxWaiting = options.maxWaiting || 200;
        options.maxBatchExecute = options.maxBatchExecute || 20;
        this.options = options;

        this.id = this.genId();
        //this.id = this.id.substr(5);
        this.waitingQue = [];
        this.sendedRequestHash = {};  //Hash Object
        this.sendedRequestQue = [];
        this.receivedQue = [];
        this.methods = [];

        this.seq = 0;
        this.curConnIndex = 0;
        this.connections = [];
        for(let s of services) {
            let sock = new SocketClient(s);  //负责管理连接和调用
            sock.owner = this;
            sock.options.retrySeconds = options.retrySeconds || 5;
            this.connections.push(sock);
        }
        this.loopSendMsg();
        this.loopPullMsg();
        this.loopClearSendedQue();

    }  //结束构造器

    callService(serviceName,argsArray,callback) {
        //debugger
        if (this.waitingQue.length + this.sendedRequestQue.length >= this.options.maxWaiting) {
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
                this.sendedRequestHash[msg.id.toString()] = msg;
                this.sendedRequestQue.push(msg);
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

    //轮询返回结果队列
    loopPullMsg() {
        let n = this.receivedQue.length;
        for(let i=0; i<n; i++) {
            let resObj = this.receivedQue.shift();
            let id = resObj.id;
            /*if (typeof id !== 'string' ) {
                continue;  //直接丢弃
            }*/
            let req = this.sendedRequestHash[id];
            //log(resObj)
            if (req) {
                //log( '6  pull result @  ', new Date().getTime())
                //req.state = 2;  //?
                req.callback && req.callback(resObj.error,resObj.result);
                req.ended = true;
                delete this.sendedRequestHash[id];  //?
                let s = logs[0].time;
                let e = logs[logs.length-1].time;
                //log('kkkkkkkkkaaaaaaaaaaaaaaaaaaaaa')
                //log(logs)
                //log(logs)
                if(e-s>= 5) {
                    //log(logs)
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

    //清理掉超时和完成的
    loopClearSendedQue() {
        let que = this.receivedQue;
        let n = this.receivedQue.length;
        let task = null;
        let t = new Date().getTime() - this.options.taskTimeoutSeconds*1000 ;
        for(let i=0; i<n; i++) {
            task = que[i];
            if (task.ended ) {  //结束
                que.splice(i,1);
                i--;
                len--;
            }
            else if (task.start < t) {  //超时,超时可能由于没有回调引起
                task.callback && task.callback({code: 409, msg:'请求超时'},null);
                delete this.sendedRequestHash[task.id];
                que.splice(i,1);
                i--;
                len--;
            }
        }
        //process.nextTick(this.loopPullMsg);
        let self = this;
        setImmediate(function (){
            self.loopClearSendedQue();
        })
    }

    getConnectionOld() {  //在这里可以设计负载均衡算法； //按照依次发送
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

    //负载均衡算法2：根据负载权重
    // 设 权重 [a0,a1,a2,a3,...,an]分别表示服务器队列负载; 取最大负载 max;
    // 用 dn = (max+1 - an)表示an的概率区间，total=(d0+d1+...+dn)，保障了最大负载的连接也要有1/total的可能性。
    // 产生随机数 r = rand*total，看r落到那个区间，则得到该连接

    getConnection() {  //在这里可以设计负载均衡算法； //按照依次发送
        let sum = 0, max = 0, cnt = 0;
        for(let conn of this.connections) {
            if (conn.connected && conn.authenticated) {
                conn.weight = conn.weight || 0;
                sum += (conn.weight);
                cnt ++;
                if (conn.weight > max) {
                    max = conn.weight;
                }
            }
            else {
                conn.weight = -1;
            }
        }
        sum = cnt * (max + 1) - sum;
        let r = Math.ceil(Math.random()*sum);
        sum = 0;
        let i = 0, len = this.connections.length;
        while (i < len) {
            if (this.connections[i].weight < 0) {
                i++;
                continue;
            }
            sum = sum + (max + 1 - this.connections[i].weight);
            if (r <= sum) {
                break;
            }
            i++;
        }
        if (i<len) {
            return this.connections[i];
        }
        else {
            return null;
        }
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

    genId() {
        let str = (''+ new Date().getTime() + Math.ceil(Math.random()*1000000000));  //??
        return str.substr(5);
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