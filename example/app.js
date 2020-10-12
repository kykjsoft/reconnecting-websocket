const express = require("express");
const path = require("path");
const child_process = require('child_process');
let app = express();
let port = 3001;

app.use(express.static(path.join(__dirname,"./public")))
app.use(express.static(path.join(__dirname,"../")))

app.listen(port,function(){
    console.log("http：http://127.0.0.1:"+port);

    var workerProcess = child_process.fork(path.join(__dirname,'websocket-server.js'), {
        silent :true,
        stdio:'inherit'
    });

    workerProcess.on('exit', function (code) {
        console.log('子进程已退出，退出码 '+code);
    });
    
})