/*
 *
 * */

let net = require('net');

var encodeData = function (obj) {
    let buf1 = Buffer.from(JSON.stringify(obj));
    let len = buf1.length;
    let buf2 = Buffer.alloc(4);
    buf2.writeInt32BE(len, 0);
    return Buffer.concat([buf2, buf1], len + 4);
}

var decodeData = function (buf) {
    let start = 0, end = 0, total = buf.length, len = 0, objList = [];
    while (start < total) {
        len = buf.readInt32BE(start);
        end = start + 4 + len
        objList.push(JSON.parse(buf.slice(start + 4, end).toString()));
        start = end;
    }
    return objList;
}

let log = console.log;
let options = {
    port: 8000
};

class RPCServer {
    constructor(options) { //构造函数
        options.port = options.port || 3000;
        options.delay = options.delay || 5000;
        options.maxWaiting = options.maxWaiting || 3000;
        options.maxBatchExecute = options.maxBatchExecute || 3000;
        options.taskTimeoutSeconds = options.taskTimeoutSeconds || 30;
        options.keepAlive = options.keepAlive || 3000;
        /*options = {
         port:3000,
         delay:5000,
         maxWaiting:1000,
         maxBatchExecute:50,
         keepAlive:3000
         };*/
        this.options = options;
        this.methods = {};

        this.chanHash = {};  //客户端连接hash结构； chan = {status, sock, que}
        this.chanList = []; //记录客户端连接顺序，为了实现公平队列算法
        this.chanCurIndex = -1;  //当前队列序号位置
        this.doingQue = [];
        this.weight = 0;

        this.waitingQue = [];
        //this.callingRequest = {};  //Hash Object
        this.connections = {};

        this.server = net.createServer(options);
        this.bindingServerEvent();
        this.server.listen(this.options.port);
        this.loopPullMsg();

    };

    callService(msgObj) {
 /*       let {seq, serviceName, args} = reqJson;
         let callback = function (err, data) {
         let respObj = {seq, err, data};  //??
         }
         server.services[serviceName].apply(null, args)
         //{seq,err,data}*/

        let self = this;
        let {id, serviceName, argsArray} = msgObj;
        let m = this.methods[serviceName];
        if (!m) {  //方法不存在
            self.sendMsgById(msgObj.socketId, {
                type: 'call',
                id: msgObj.id,
                error: {code: 404, msg:'方法不存在'},
                result:null
            })
            msgObj.ended = true;
            return;
        }
        //this.callingRequest[id] = msgObj;
        let callback = function (err, result) {
            msgObj.t4 = process.hrtime(msgObj.t0); // before send
            if (msgObj.t4[0]*1000000000 + msgObj.t4[1] > 5000000) {
                log((msgObj.t1[0]*1000000000 + msgObj.t1[1])/1000000 + '               decode')
                log((msgObj.t2[0]*1000000000 + msgObj.t2[1])/1000000 + '               push')
                log((msgObj.t3[0]*1000000000 + msgObj.t3[1])/1000000 + '               before call')
                log((msgObj.t4[0]*1000000000 + msgObj.t4[1])/1000000 + '               before send')
                //log(msgObj.t2)
                //log(msgObj.t3)
                //log(msgObj.t4)
            }
            else {
                log((msgObj.t4[0]*1000000000 + msgObj.t4[1])/1000000)
            }

            self.sendMsgById(msgObj.socketId, {
                type: 'call',
                id: msgObj.id,
                error: err,
                result: result
            });
            msgObj.ended = true;
        };
        argsArray.push(callback);
        m.apply(null, argsArray);
    };


    bindingServerEvent() {
        let self = this;
        this.server.on('connection', function (sock) {
            sock.setNoDelay(true);
            sock.owner = self;
            if (self.options.keepAlive) {
                sock.setKeepAlive(true, self.options.keepAlive);
            }
            self.bindingSocketEvent(sock);
            log('服务器建立连接成功')
        });

        this.server.on('close', function (sock) {
            log('服务器关闭')
        });

        this.server.on('error', function (err) {
            log('socket 服务器错误，将在1秒后重新监听端口');
            log(err);
            setTimeout(() => {
                self.server.close();
                self.server.listen(self.options.port);
            }, 1000);
        })
    }

    bindingSocketEvent(sock) {
        sock.on('connect', function (data) {
            log('sock connect')  //服务器端不触发这个事件
        })

        sock.on('data', function (buf) {
            //log('rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr')
            let self = sock.owner;
            //log('1  @  ' + new Date().getTime())
            //log(data.toString())
            let tt = process.hrtime();

            let objList = decodeData(buf);
            //log(objList[0].data.id);
            //log('2  @  ' + new Date().getTime())
            for (let obj of objList) {
                if (typeof self['on_' + obj.type] === 'function') {
                    obj.data.t0 = tt;
                    obj.data.t1 = process.hrtime(obj.data.t0)  //解析数据时间
                    self['on_' + obj.type](sock, obj.data)
                }
            }

            /*let obj = objList[0];
            obj.data.t0 = tt;
            obj.data.t1 = process.hrtime(obj.data.t0)  //解析数据时间
            self['on_' + obj.type](sock, obj.data)*/
        })

        sock.on('close', function (data) {
            let self = sock.owner;
            log('sock close')
            self.chanHash[sock.id].connected = false;
            self.chanHash[sock.id].endTime = new Date().getTime();
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

    /*    sendMsg(msgObj) {
     this.server.write(JSON.stringify(msgObj));
     }*/

    //清除结束的，超时的，并拉取执行队列
    loopPullMsg() {
        //log(1)
        let self = this;
        let que = this.doingQue;
        let len = que.length;
        let task = null;
        let t = new Date().getTime() - this.options.taskTimeoutSeconds*1000 ;
        for(let i=0; i<len; i++) {
            task = que[i];
            if (task.ended ) {  //结束
                que.splice(i,1);
                i--;
                len--;
                self.weight--;
            }
            else if (task.start < t) {  //超时,超时可能由于没有回调引起
                self.sendMsgById(task.socketId, {
                    type: 'call',
                    data: {
                        id: task.id,
                        error: {code: 408, msg:'服务器超时'},
                        data: null
                    }
                })
                que.splice(i,1);
                i--;
                len--;
                self.weight--;
            }
        }

        //完成清除后开始拉取
        this.pullTask(this.options.maxBatchExecute - que.length);

        //process.nextTick(this.loopSendMsg());
        setImmediate(function () {
            self.loopPullMsg();
        })
    }

    sendMsgById(socketId, msgObj) {
        //log('ssssssssssssssssssssssssssssssssssssss')
        //log( new Date().getTime());
        //log(msgObj)
        let chan = this.chanHash[socketId];
        //log('98  @  ' + new Date().getTime())
        if (chan.connected && chan.sock) { //??  && sock.isActive
            msgObj.weight = this.weight;
            chan.sock.write(encodeData(msgObj));
            return true;
            //log('99  @  ' + new Date().getTime())
        }
        else {
            chan.failedQue.push(msgObj);
        }
        return false;
    }

    sendMsg(sock, msgObj) {
        log('ssssssssssssssssssssssssssssssssssssss')
        log(new Date().getTime());
        log(msgObj)
        msgObj.weight = this.weight;
        sock.write(encodeData(msgObj));
    }

    on_init(sock, msgObj) {
        let self = sock.owner;
        //这里处理连接授权认证
        let auth = true, err = null;
        let methods = [];

        let resObj = {
            type: 'init'
        }
        if (auth) {  //验证成功
            let id =  msgObj.connection_id;
            sock.id = id;
            if (self.chanHash[id]) {  //这是一个重新连接
                let chan = self.chanHash[id];
                chan.connected = true;
                chan.sock = sock;
                //重发失败的数据
                let msgObj = null;
                while (chan.failedQue.length>0) {
                    msgObj = chan.failedQue.shift();
                    self.sendMsg(sock,msgObj)
                }
            }
            else {
                let chan = {
                    connected: true,
                    que:[],
                    failedQue:[],//因网络连接错误而发送失败的消息
                    sock:sock
                }
                self.chanHash[id] = chan;
                self.chanList.push(chan)
            }
            resObj.result = {
                authenticated: auth,
                methods: Object.keys(self.methods),
            }
            resObj.error = null;  //{code: 0, msg:'授权成功'};
        }
        else {
            resObj.result = {
                authenticated: false,
                methods: [],
            }
            resObj.error = {code: 403, msg:'连接授权失败'};
        }
        log(resObj)
        sock.write(encodeData(resObj));
    }

    on_call(sock, reqObj) {
        let chan = this.chanHash[sock.id];
        if (this.weight > this.options.maxWaiting) {
            this.sendMsg(sock, {
                type: 'call',
                id: reqObj.id,
                error: {code: 408, msg:'服务器繁忙，请求队列已满'},
                result:null
            })
        }
        else {
            reqObj.socketId = sock.id;
            reqObj.start = new Date().getTime();
            chan.que.push(reqObj);
            this.weight++;
            reqObj.t2 = process.hrtime(reqObj.t0); // push
        }
    }

    pullTask(cnt) {
        if (cnt <= 0 || this.chanList.length <= 0) {
            return;
        }
        let i = this.chanCurIndex;
        let len = this.chanList.length;
        let c = 0, u = 0, chan = null;
        while (true) {
            i++;
            (i>=len) && (i=0);
            chan = this.chanList[i];
            //log(i)
            if (!chan.connected) {  //当前连接断开
                let t = new Date().getTime() - this.options.taskTimeoutSeconds*1000 ;
                if (chan.endTime < t) {  //超时,删除连接channel
                    this.chanList.splice(i,1);
                    len--;
                    if (len === 0) {
                        break
                    }
                    i--;
                    continue;
                }
                u++;
                if (u>=len) { //没有任务了
                    break;
                }
                else {
                    continue
                }
            }

            let task = this.chanList[i].que.shift();
            if (task===undefined) {
                u++;
                if (u>=len) { //没有任务了
                    break;
                }
            }
            else {
                //call
                task.t3 = process.hrtime(task.t0); //pull,begin call
                this.doingQue.push(task);
                this.callService(task);
                u=0;
                c++;
                this.chanCurIndex = i;
                if (c>=cnt) {
                    break;
                }
            }
        }
    }

    registerMethod(serviceName, func) {
        //this.methods['add'] = add;
        this.methods[serviceName] = func;
    }
}

module.exports = RPCServer;
