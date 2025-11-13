// DevTools面板逻辑
class DevToolsPanelController {
    constructor() {
        this.tabId = null;
        this.elementInfo = null;
        this.logs = [];
        this.isWatching = false;
        this.init();
    }

    async init() {
        // 获取当前标签页ID
        this.tabId = chrome.devtools.inspectedWindow.tabId;

        // 绑定UI事件
        this.bindEvents();

        // 加载初始状态
        await this.loadStatus();

        // 监听来自内容脚本的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender);
        });

        // 建立与内容脚本的连接
        this.setupConnection();
    }

    bindEvents() {
        // 元素选择
        document.getElementById('startCapture').addEventListener('click', () => {
            this.startElementCapture();
        });

        // 监听控制
        document.getElementById('startListening').addEventListener('click', () => {
            this.startListening();
        });

        document.getElementById('stopListening').addEventListener('click', () => {
            this.stopListening();
        });

        // 清空日志
        document.getElementById('clearLogs').addEventListener('click', () => {
            this.clearLogs();
        });

        // 打开浮动窗口
        document.getElementById('openFloating').addEventListener('click', () => {
            this.openFloatingWindow();
        });

        // 搜索功能
        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.searchLogs(e.target.value);
        });
    }

    setupConnection() {
        // 创建与内容脚本的连接
        this.port = chrome.runtime.connect({ name: `devtools-${this.tabId}` });

        this.port.onMessage.addListener((message) => {
            this.handleMessage(message);
        });

        this.port.onDisconnect.addListener(() => {
            // 连接断开时尝试重新连接
            setTimeout(() => {
                this.setupConnection();
            }, 1000);
        });

        // 通知内容脚本DevTools面板已打开
        this.sendMessage('devToolsPanelOpened');
    }

    async sendMessage(action, data = {}) {
        try {
            // 通过 injected script 发送消息到内容脚本
            chrome.devtools.inspectedWindow.eval(`
                if (window.domWatcher) {
                    window.domWatcher.postMessageToContent({
                        action: '${action}',
                        data: ${JSON.stringify(data)}
                    });
                }
            `);
        } catch (error) {
            console.error('发送消息失败:', error);
        }
    }

    async startElementCapture() {
        try {
            await this.sendMessage('startCapture');
            this.updateUI({ isCapturing: true });
        } catch (error) {
            console.error('启动元素捕获失败:', error);
            this.showError('启动元素捕获失败');
        }
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
        document.getElementById('startListening').disabled = false;

        // 更新状态
        document.getElementById('statusText').textContent = '已选择元素，准备监听';
        this.updateStatusIndicator(false);
    }

    handleWatchingStarted(elementInfo, attribute) {
        this.isWatching = true;
        this.elementInfo = elementInfo;

        document.getElementById('statusText').textContent = `正在监听: ${elementInfo.tagName}.${attribute}`;
        this.updateStatusIndicator(true);

        // 更新按钮状态
        document.getElementById('startListening').disabled = true;
        document.getElementById('stopListening').disabled = false;
        document.getElementById('startCapture').disabled = true;

        // 显示元素信息
        this.showElementInfo(elementInfo, attribute);
    }

    handleWatchingStopped() {
        this.isWatching = false;

        document.getElementById('statusText').textContent = '监听已停止';
        this.updateStatusIndicator(false);

        // 更新按钮状态
        document.getElementById('startListening').disabled = false;
        document.getElementById('stopListening').disabled = true;
        document.getElementById('startCapture').disabled = false;
    }

    handleNewLog(logEntry) {
        this.logs.unshift(logEntry);
        this.updateLogDisplay();
        this.updateLogCount();
    }

    handleStatusUpdate(status) {
        this.updateUI(status);
    }

    showElementInfo(elementInfo, selectedAttribute = null) {
        const elementInfoDiv = document.getElementById('elementInfo');
        const elementInfoContent = document.getElementById('elementInfoContent');

        // 创建属性选择下拉菜单
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
                    <select id="attributeSelect" style="margin-left: 6px;">
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

        elementInfoDiv.classList.add('visible');
    }

    async startListening(elementSelector = null, attribute = null) {
        try {
            // 如果没有提供参数，从UI获取
            if (!elementSelector || !attribute) {
                const attributeSelect = document.getElementById('attributeSelect');
                if (!attributeSelect) {
                    this.showError('请先选择元素');
                    return;
                }

                attribute = attributeSelect.value;
                elementSelector = this.elementInfo.cssSelector;
            }

            await this.sendMessage('startWatching', {
                elementSelector: elementSelector,
                attribute: attribute
            });

        } catch (error) {
            console.error('启动监听失败:', error);
            this.showError('启动监听失败: ' + error.message);
        }
    }

    async stopListening() {
        try {
            await this.sendMessage('stopWatching');

            // 清理UI状态
            document.getElementById('elementInfo').classList.remove('visible');
            this.elementInfo = null;
        } catch (error) {
            console.error('停止监听失败:', error);
            this.showError('停止监听失败');
        }
    }

    async clearLogs() {
        try {
            await this.sendMessage('clearLogs');
            this.logs = [];
            this.updateLogDisplay();
            this.updateLogCount();
        } catch (error) {
            console.error('清空日志失败:', error);
            this.showError('清空日志失败');
        }
    }

    async openFloatingWindow() {
        try {
            // 在页面上注入浮动窗口
            chrome.devtools.inspectedWindow.eval(`
                if (!document.getElementById('dom-watcher-floating-window')) {
                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL('floating-window.js');
                    document.head.appendChild(script);

                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = chrome.runtime.getURL('floating-window.css');
                    document.head.appendChild(link);
                } else {
                    // 如果已存在，直接显示
                    const existingWindow = document.getElementById('dom-watcher-floating-window');
                    existingWindow.style.display = 'block';
                }
            `);
        } catch (error) {
            console.error('打开浮动窗口失败:', error);
            this.showError('打开浮动窗口失败');
        }
    }

    async loadStatus() {
        try {
            await this.sendMessage('getStatus');
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }

    updateLogDisplay(searchTerm = '') {
        const logContent = document.getElementById('logContent');

        if (this.logs.length === 0) {
            logContent.innerHTML = '<div class="empty-state">暂无日志数据</div>';
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

    updateLogCount() {
        // DevTools面板中不显示日志数量，保持界面简洁
    }

    updateStatusIndicator(isActive) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator ${isActive ? 'status-active' : 'status-inactive'}`;
    }

    updateUI(options = {}) {
        if (options.isCapturing !== undefined) {
            if (options.isCapturing) {
                document.getElementById('statusText').textContent = '请选择要监听的元素';
                document.getElementById('startCapture').textContent = '❌ 取消选择';
                document.getElementById('startCapture').onclick = () => {
                    this.sendMessage('stopCapture');
                    this.updateUI({ isCapturing: false });
                };
            } else {
                document.getElementById('statusText').textContent = '未开始监听';
                document.getElementById('startCapture').textContent = '🎯 选择元素';
                document.getElementById('startCapture').onclick = () => {
                    this.startElementCapture();
                };
            }
        }
    }

    showError(message) {
        // 在DevTools控制台显示错误
        console.error('DOM监听器错误:', message);
    }
}

// 初始化DevTools面板控制器
document.addEventListener('DOMContentLoaded', () => {
    new DevToolsPanelController();
});