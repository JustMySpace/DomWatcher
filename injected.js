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

    // 消息处理器 - 处理来自浮层面板的消息
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;

        const message = event.data;
        if (message && message.type === 'DOM_WATCHER_MESSAGE') {
            // 将消息转发到内容脚本
            window.postMessage({
                type: 'DOM_WATCHER_MESSAGE_TO_CONTENT',
                data: message.data
            }, '*');
        }
    });

    // 消息转发器 - 用于浮层面板调用
    window.domWatcher = {
        sendMessage: function(action, data = {}) {
            return new Promise((resolve, reject) => {
                const messageId = Date.now() + Math.random();

                // 发送消息到内容脚本
                window.postMessage({
                    type: 'DOM_WATCHER_MESSAGE_TO_CONTENT',
                    data: {
                        id: messageId,
                        action: action,
                        ...data
                    }
                }, '*');

                // 监听响应
                const responseHandler = function(event) {
                    if (event.source !== window) return;

                    const response = event.data;
                    if (response && response.type === 'DOM_WATCHER_RESPONSE' && response.id === messageId) {
                        window.removeEventListener('message', responseHandler);

                        if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            resolve(response.data);
                        }
                    }
                };

                window.addEventListener('message', responseHandler);

                // 超时处理
                setTimeout(() => {
                    window.removeEventListener('message', responseHandler);
                    reject(new Error('消息超时'));
                }, 5000);
            });
        }
    };

    console.log('DOM监听器消息处理器已设置');
})();