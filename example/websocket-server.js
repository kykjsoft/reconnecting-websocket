// 引入net模块
const net = require('net')
const crypto = require("crypto");

// 使用net模块创建服务器，返回的是一个原始的socket对象，与Socket.io的socket对象不同。
const server = net.createServer((socket) => {
    socket.once('data', (buffer) => {
        console.log("once")
        // 接收到HTTP请求头数据
        const str = buffer.toString()
        //console.log(str)
      
        // 4. 将请求头数据转为对象
        const headers = parseHeader(str)
        //console.log(headers)
      
        // 5. 判断请求是否为WebSocket连接
        if (headers['upgrade'] !== 'websocket') {
          // 若当前请求不是WebSocket连接，则关闭连接
          console.log('非WebSocket连接')
          socket.end()
        } else if (headers['sec-websocket-version'] !== '13') {
          // 判断WebSocket版本是否为13，防止是其他版本，造成兼容错误
          console.log('WebSocket版本错误')
          socket.end()
        } else {
            // 6. 校验Sec-WebSocket-Key，完成连接
            /* 
                协议中规定的校验用GUID，可参考如下链接：
                https://tools.ietf.org/html/rfc6455#section-5.5.2
                https://stackoverflow.com/questions/13456017/what-does-258eafa5-e914-47da-95ca-c5ab0dc85b11-means-in-websocket-protocol
            */
            const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
            const key = headers['sec-websocket-key']
            const hash = crypto.createHash('sha1')  // 创建一个签名算法为sha1的哈希对象

            hash.update(`${key}${GUID}`)  // 将key和GUID连接后，更新到hash
            const result = hash.digest('base64') // 生成base64字符串
            const header = `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-Websocket-Accept: ${result}\r\n\r\n` // 生成供前端校验用的请求头

            socket.write(header)  // 返回HTTP头，告知客户端校验结果，HTTP状态码101表示切换协议：https://httpstatuses.com/101。
            // 若客户端校验结果正确，在控制台的Network模块可以看到HTTP请求的状态码变为101 Switching Protocols，同时客户端的ws.onopen事件被触发。
            //console.log(header)
            

            socket.write(encodeWsFrame({ payloadData: "首次连接成功" }))

            // 处理聊天数据

            var intervalid = setInterval(function(){
              socket.write(encodeWsFrame({ payloadData: "当前时间："+Date.now() }))
            },1000)

            // 7. 建立连接后，通过data事件接收客户端的数据并处理
            socket.on('data', (buffer) => {
                console.log("on data");
                const data = decodeWsFrame(buffer)
                console.log(data);
                const txt = data.payloadData ? data.payloadData.toString() : '';
                console.log(txt);
                if(txt==="2"){
                  if(intervalid){
                    clearInterval(intervalid);
                  }
                  intervalid =  setInterval(function(){
                    socket.write(encodeWsFrame({ payloadData: "当前时间："+Date.now() }))
                  },2000)
                  socket.write(encodeWsFrame({ payloadData: `已修改为每隔2s中发送` }))
                  return;
                }
                //console.log(data)
                //console.log(data.payloadData && data.payloadData.toString())

                // opcode为8，表示客户端发起了断开连接
                if (data.opcode === 8) {
                  clearInterval(intervalid);
                  intervalid = null;
                  socket.end()  // 与客户端断开连接
                } else {
                // 接收到客户端数据时的处理，此处默认为返回接收到的数据。
                  socket.write(encodeWsFrame({ payloadData: `服务端接收到的消息为：${txt}` }))
                }
            })
        }
    })
})


server.listen(8080,function(){
    console.log(`websocket：ws://127.0.0.1:8080`);
});


function parseHeader(str) {
    // 将请求头数据按回车符切割为数组，得到每一行数据
    let arr = str.split('\r\n').filter(item => item)
  
    // 第一行数据为GET / HTTP/1.1，可以丢弃。
    arr.shift()
  
    console.log(arr)
    /* 
      处理结果为：
  
      [ 'Host: localhost:8080',
        'Connection: Upgrade',
        'Pragma: no-cache',
        'Cache-Control: no-cache',
        'Upgrade: websocket',
        'Origin: file://',
        'Sec-WebSocket-Version: 13',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
        'Accept-Encoding: gzip, deflate, br',
        'Accept-Language: zh-CN,zh;q=0.9',
        'Cookie: _ga=GA1.1.1892261700.1545540050; _gid=GA1.1.774798563.1552221410; io=7X0VY8jhwRTdRHBfAAAB',
        'Sec-WebSocket-Key: jqxd7P0Xx9TGkdMfogptRw==',
        'Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits' ]
    */
  
    let headers = {}  // 存储最终处理的数据
  
    arr.forEach((item) => {
      // 需要用":"将数组切割成key和value
      let [name, value] = item.split(':')
  
      // 去除无用的空格，将属性名转为小写
      name = name.replace(/^\s|\s+$/g, '').toLowerCase()
      value = value.replace(/^\s|\s+$/g, '')
  
      // 获取所有的请求头属性
      headers[name] = value
    })
  
    return headers
}

function decodeWsFrame(data) {
    let start = 0;
    let frame = {
      isFinal: (data[start] & 0x80) === 0x80,
      opcode: data[start++] & 0xF,
      masked: (data[start] & 0x80) === 0x80,
      payloadLen: data[start++] & 0x7F,
      maskingKey: '',
      payloadData: null
    };
  
    if (frame.payloadLen === 126) {
      frame.payloadLen = (data[start++] << 8) + data[start++];
    } else if (frame.payloadLen === 127) {
      frame.payloadLen = 0;
      for (let i = 7; i >= 0; --i) {
        frame.payloadLen += (data[start++] << (i * 8));
      }
    }
  
    if (frame.payloadLen) {
      if (frame.masked) {
        const maskingKey = [
          data[start++],
          data[start++],
          data[start++],
          data[start++]
        ];
  
        frame.maskingKey = maskingKey;
  
        frame.payloadData = data
          .slice(start, start + frame.payloadLen)
          .map((byte, idx) => byte ^ maskingKey[idx % 4]);
      } else {
        frame.payloadData = data.slice(start, start + frame.payloadLen);
      }
    }
  
    //console.dir(frame)
    return frame;
}

function encodeWsFrame(data) {
    const isFinal = data.isFinal !== undefined ? data.isFinal : true,
      opcode = data.opcode !== undefined ? data.opcode : 1,
      payloadData = data.payloadData ? Buffer.from(data.payloadData) : null,
      payloadLen = payloadData ? payloadData.length : 0;
  
    let frame = [];
  
    if (isFinal) frame.push((1 << 7) + opcode);
    else frame.push(opcode);
  
    if (payloadLen < 126) {
      frame.push(payloadLen);
    } else if (payloadLen < 65536) {
      frame.push(126, payloadLen >> 8, payloadLen & 0xFF);
    } else {
      frame.push(127);
      for (let i = 7; i >= 0; --i) {
        frame.push((payloadLen & (0xFF << (i * 8))) >> (i * 8));
      }
    }
  
    frame = payloadData ? Buffer.concat([Buffer.from(frame), payloadData]) : Buffer.from(frame);
  
    //console.dir(decodeWsFrame(frame));
    return frame;
}