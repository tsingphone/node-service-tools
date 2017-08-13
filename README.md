# node-service-tools
还不可用， Not Available.

testing

一、客户端
1、初始化
发送：
[ { type: 'init', data: { connection_id: 5610194030 } } ]

返回：
{ type: 'init',
  data: { authenticated: true, methods: [ 'add', 'err' ], error: null } }

建立连接
发送初始化事件消息

2、负载均衡算法
识别不可用：errorcode来识别
不可用关闭，之后设定时间后再次尝试半激活，再逐步激活

以任务堆积数（由于单线程，不用考虑除以CPU数）为权重，产生随机数

3 超时清理：定时清理队列中的过期数据，防止其他异常导致的堆积，包括请求队列，发送队列，待处理队列等，发送超时任务信息
参数：检查间隔，超时时间。得到的超时时间不是精确时间
