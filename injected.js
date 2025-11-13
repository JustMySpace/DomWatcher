// 注入脚本 - 在页面上下文中运行，用于通信
(function() {
    console.log('DOM监听器注入脚本开始加载');

    // 防止重复注入
    if (window.domWatcherInjected) {
        console.log('注入脚本已存在，跳过');
        return;
    }
    window.domWatcherInjected = true;

    console.log('DOM监听器注入脚本初始化完成');

    // 简单的消息转发器
    window.domWatcher = {
        postMessageToContent: function(message) {
            // 将消息发送到内容脚本
            window.postMessage({
                type: 'DOM_WATCHER_MESSAGE',
                message: message
            }, '*');
        }
    };

    console.log('DOM监听器消息转发器已设置');
})();