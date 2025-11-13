// DOM监听器浮动窗口脚本
console.log('DOM监听器浮动窗口脚本已加载');

(function() {
    // 防止重复创建
    if (document.getElementById('dom-watcher-floating-window')) {
        console.log('浮动窗口已存在，跳过创建');
        return;
    }

    class FloatingWindowController {
        constructor() {
            this.elementInfo = null;
            this.logs = [];
            this.isWatching = false;
            this.isCapturing = false;
            this.isMinimized = false;

            this.createWindow();
            this.bindEvents();
            this.initCommunication();
        }

        createWindow() {
            console.log('开始创建浮动窗口');

            // 获取已存在的浮动窗口元素（content.js已经创建了HTML）
            this.windowElement = document.getElementById('dom-watcher-floating-window');

            if (this.windowElement) {
                console.log('找到浮动窗口元素，开始初始化');
                this.initDragAndDrop();
                this.bindWindowEvents();
            } else {
                console.error('未找到浮动窗口元素');
            }
        }

        initDragAndDrop() {
            const header = this.windowElement.querySelector('.window-header');
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;

            const dragStart = (e) => {
                if (e.target.closest('.window-controls')) return;

                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;

                if (e.target === header || header.contains(e.target)) {
                    isDragging = true;
                    this.windowElement.classList.add('dragging');
                }
            };

            const dragEnd = () => {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                this.windowElement.classList.remove('dragging');
            };

            const drag = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;

                    xOffset = currentX;
                    yOffset = currentY;

                    // 设置位置
                    this.windowElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
                }
            };

            // 保存初始位置
            const rect = this.windowElement.getBoundingClientRect();
            xOffset = rect.left;
            yOffset = rect.top;
            this.windowElement.style.transform = `translate(${xOffset}px, ${yOffset}px)`;

            // 绑定拖拽事件
            document.addEventListener('mousedown', dragStart);
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('mousemove', drag);
        }

        bindWindowEvents() {
            // 窗口控制按钮
            const minimizeBtn = this.windowElement.querySelector('.minimize-btn');
            const closeBtn = this.windowElement.querySelector('.close-btn');

            minimizeBtn.addEventListener('click', () => {
                this.toggleMinimize();
            });

            closeBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }

        bindEvents() {
            // 等待窗口内容加载完成后再绑定事件
            setTimeout(() => {
                // 元素选择
                const startCaptureBtn = document.getElementById('startCapture');
                if (startCaptureBtn) {
                    startCaptureBtn.addEventListener('click', () => {
                        this.startElementCapture();
                    });
                }

                // 监听控制
                const startListeningBtn = document.getElementById('startListening');
                const stopListeningBtn = document.getElementById('stopListening');

                if (startListeningBtn) {
                    startListeningBtn.addEventListener('click', () => {
                        this.startListening();
                    });
                }

                if (stopListeningBtn) {
                    stopListeningBtn.addEventListener('click', () => {
                        this.stopListening();
                    });
                }

                // 清空日志
                const clearLogsBtn = document.getElementById('clearLogs');
                if (clearLogsBtn) {
                    clearLogsBtn.addEventListener('click', () => {
                        this.clearLogs();
                    });
                }

                // 搜索功能
                const searchBox = document.getElementById('searchBox');
                if (searchBox) {
                    searchBox.addEventListener('input', (e) => {
                        this.searchLogs(e.target.value);
                    });
                }
            }, 500);
        }

        initCommunication() {
            // 监听来自内容脚本的消息
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'DOM_WATCHER_FLOATING_MESSAGE') {
                    this.handleMessage(event.data.message);
                }
            });

            // 通知内容脚本浮动窗口已打开
            this.sendMessageToContent('floatingWindowOpened');
        }

        sendMessageToContent(action, data = {}) {
            // 通过注入脚本发送消息到内容脚本
            window.postMessage({
                type: 'DOM_WATCHER_MESSAGE',
                message: { action, data }
            }, '*');
        }

        handleMessage(message) {
            switch (message.action) {
                case 'elementSelected':
                    this.handleElementSelected(message.elementInfo);
                    break;
                case 'watchingStarted':
                    this.handleWatchingStarted(message.elementInfo, message.attribute);
                    break;
                case 'watchingStopped':
                    this.handleWatchingStopped();
                    break;
                case 'newLog':
                    this.handleNewLog(message.logEntry);
                    break;
                case 'statusUpdate':
                    this.handleStatusUpdate(message.status);
                    break;
            }
        }

        handleElementSelected(elementInfo) {
            this.elementInfo = elementInfo;
            this.showElementInfo(elementInfo);

            // 启用开始监听按钮
            const startListeningBtn = document.getElementById('startListening');
            if (startListeningBtn) {
                startListeningBtn.disabled = false;
            }

            this.updateStatus('已选择元素，准备监听', false);
        }

        handleWatchingStarted(elementInfo, attribute) {
            this.isWatching = true;
            this.elementInfo = elementInfo;

            this.updateStatus(`正在监听: ${elementInfo.tagName}.${attribute}`, true);

            // 更新按钮状态
            this.updateButtonStates({ watching: true });

            // 显示元素信息
            this.showElementInfo(elementInfo, attribute);
        }

        handleWatchingStopped() {
            this.isWatching = false;
            this.updateStatus('监听已停止', false);
            this.updateButtonStates({ watching: false });

            // 隐藏元素信息
            const elementInfoDiv = document.getElementById('elementInfo');
            if (elementInfoDiv) {
                elementInfoDiv.style.display = 'none';
            }
            this.elementInfo = null;
        }

        handleNewLog(logEntry) {
            this.logs.unshift(logEntry);
            this.updateLogDisplay();
        }

        handleStatusUpdate(status) {
            if (status.isWatching) {
                this.isWatching = status.isWatching;
                this.elementInfo = status.targetElement;
                this.updateButtonStates({ watching: true });
            }
        }

        showElementInfo(elementInfo, selectedAttribute = null) {
            const elementInfoDiv = document.getElementById('elementInfo');
            const elementInfoContent = document.getElementById('elementInfoContent');

            if (!elementInfoDiv || !elementInfoContent) return;

            const attributes = Object.keys(elementInfo.attributes);
            if (attributes.length === 0) {
                elementInfoContent.innerHTML = `
                    <div>元素: ${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</div>
                    <div>状态: 该元素没有属性</div>
                `;
            } else {
                const attributeOptions = attributes.map(attr =>
                    `<option value="${attr}">${attr} = "${elementInfo.attributes[attr]}"</option>`
                ).join('');

                elementInfoContent.innerHTML = `
                    <div>元素: ${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</div>
                    <div style="margin-top: 6px;">
                        选择属性:
                        <select id="attributeSelect">
                            ${attributeOptions}
                        </select>
                    </div>
                `;

                // 如果有指定属性，选中它
                if (selectedAttribute) {
                    setTimeout(() => {
                        const select = document.getElementById('attributeSelect');
                        if (select) {
                            select.value = selectedAttribute;
                        }
                    }, 100);
                }
            }

            elementInfoDiv.style.display = 'block';
        }

        async startElementCapture() {
            try {
                this.isCapturing = true;
                this.sendMessageToContent('startCapture');
                this.updateStatus('请选择要监听的元素', false);

                const startCaptureBtn = document.getElementById('startCapture');
                if (startCaptureBtn) {
                    startCaptureBtn.textContent = '❌ 取消选择';
                    startCaptureBtn.onclick = () => {
                        this.stopElementCapture();
                    };
                }
            } catch (error) {
                console.error('启动元素捕获失败:', error);
            }
        }

        stopElementCapture() {
            this.isCapturing = false;
            this.sendMessageToContent('stopCapture');
            this.updateStatus('未开始监听', false);

            const startCaptureBtn = document.getElementById('startCapture');
            if (startCaptureBtn) {
                startCaptureBtn.textContent = '🎯 选择元素';
                startCaptureBtn.onclick = () => {
                    this.startElementCapture();
                };
            }
        }

        async startListening() {
            try {
                const attributeSelect = document.getElementById('attributeSelect');
                if (!attributeSelect || !this.elementInfo) {
                    alert('请先选择元素');
                    return;
                }

                const attribute = attributeSelect.value;
                const elementSelector = this.elementInfo.cssSelector;

                this.sendMessageToContent('startWatching', {
                    elementSelector,
                    attribute
                });
            } catch (error) {
                console.error('启动监听失败:', error);
            }
        }

        async stopListening() {
            try {
                this.sendMessageToContent('stopWatching');
            } catch (error) {
                console.error('停止监听失败:', error);
            }
        }

        async clearLogs() {
            try {
                this.logs = [];
                this.updateLogDisplay();
                this.sendMessageToContent('clearLogs');
            } catch (error) {
                console.error('清空日志失败:', error);
            }
        }

        updateStatus(text, isActive) {
            const statusText = document.getElementById('statusText');
            const statusIndicator = document.getElementById('statusIndicator');

            if (statusText) {
                statusText.textContent = text;
            }

            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${isActive ? 'status-active' : 'status-inactive'}`;
            }
        }

        updateButtonStates(states) {
            const startCaptureBtn = document.getElementById('startCapture');
            const startListeningBtn = document.getElementById('startListening');
            const stopListeningBtn = document.getElementById('stopListening');

            if (startCaptureBtn) {
                startCaptureBtn.disabled = states.watching || false;
            }
            if (startListeningBtn) {
                startListeningBtn.disabled = states.watching || false;
            }
            if (stopListeningBtn) {
                stopListeningBtn.disabled = !states.watching;
            }
        }

        updateLogDisplay(searchTerm = '') {
            const logContent = document.getElementById('logContent');
            if (!logContent) return;

            if (this.logs.length === 0) {
                logContent.innerHTML = '<div class="empty-state">暂无日志</div>';
                return;
            }

            // 过滤日志
            let filteredLogs = this.logs;
            if (searchTerm) {
                const lowerSearchTerm = searchTerm.toLowerCase();
                filteredLogs = this.logs.filter(log => {
                    return (
                        log.elementInfo?.tagName.toLowerCase().includes(lowerSearchTerm) ||
                        log.attribute?.toLowerCase().includes(lowerSearchTerm) ||
                        log.newValue?.toLowerCase().includes(lowerSearchTerm) ||
                        log.oldValue?.toLowerCase().includes(lowerSearchTerm) ||
                        log.timeString.includes(searchTerm)
                    );
                });
            }

            if (filteredLogs.length === 0) {
                logContent.innerHTML = '<div class="empty-state">没有匹配的日志</div>';
                return;
            }

            const logHtml = filteredLogs.map(log => {
                const elementText = log.elementInfo ?
                    `${log.elementInfo.tagName}${log.elementInfo.id}${log.elementInfo.classes}` :
                    '未知元素';

                const oldValueText = log.oldValue !== null ? ` (从 "${log.oldValue}")` : '';

                return `
                    <div class="log-item ${searchTerm ? 'highlight' : ''}">
                        <div class="log-time">⏰ ${log.timeString}</div>
                        <div class="log-element">📍 ${elementText}</div>
                        <div class="log-attribute">🏷️ ${log.attribute}</div>
                        <div class="log-value">✨ "${log.newValue}"${oldValueText}</div>
                        <div class="log-type">📊 ${log.type}</div>
                    </div>
                `;
            }).join('');

            logContent.innerHTML = logHtml;
        }

        searchLogs(searchTerm) {
            this.updateLogDisplay(searchTerm);
        }

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            const windowElement = document.getElementById('dom-watcher-floating-window');

            if (this.isMinimized) {
                windowElement.classList.add('minimized');
            } else {
                windowElement.classList.remove('minimized');
            }
        }

        closeWindow() {
            const windowElement = document.getElementById('dom-watcher-floating-window');
            if (windowElement) {
                windowElement.remove();
            }
        }
    }

    // 创建浮动窗口
    new FloatingWindowController();

})();