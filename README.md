# node-service-tools
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

2、