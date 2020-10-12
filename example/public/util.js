/*
 * 日志组件/2020-06-19/zq
 */
var Log = (function(){
    var defaultOption = {

    }

    return function(logbox,option){
        option = Object.assign({},defaultOption,option);

        var ul = document.createElement("ul");
        var detail = document.createElement("div");
        logbox.append(ul);
        var add = function(html,option){
            var li = document.createElement("li")
            for(var a in option){
                li[a]=option[a];
            }

            if(option.data){
                var contenta = document.createElement("a")
                contenta.innerHTML = html;
                contenta.href = "javascript:void(0);"
                contenta.addEventListener("click",function(){
                    
                });
                li.append(contenta);
            }else{
                li.innerHTML = html;
            }
            if(!ul.childNodes.length){
                ul.append(li);
            }else{
                ul.insertBefore(li,ul.childNodes[0]);
            }
        }
        var time = function(){
            var dt = new Date();
            return `${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`
        }

        var log = function(){
            log.info.apply(log,arguments);
        }
        log.info = function(msg){
            add(time()+"  "+msg,{className:"info"});
        }
        log.error = function(msg){
            add(time()+"  "+msg);
        }
        log.success = function(msg){
            add(time()+"  "+msg,{className:"success"});
        }
        return log;
    }
})()