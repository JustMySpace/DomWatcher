// DOM属性监听器 - 工作版本
console.log('Popup脚本开始加载');

class WorkingPopupController {
    constructor() {
        this.currentTabId = null;
        this.elementInfo = null;
        this.logs = [];
        this.isWatching = false;
        this.init();
    }

    async init() {
        console.log('初始化popup控制器');

        try {
            // 获取当前标签页ID
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTabId = tab.id;
            console.log('当前标签ID:', this.currentTabId);

            // 绑定UI事件
            this.bindEvents();

            // 加载初始状态
            await this.loadStatus();

            // 监听来自内容脚本的消息
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender);
            });

            console.log('popup控制器初始化完成');
        } catch (error) {
            console.error('popup控制器初始化失败:', error);
        }
    }

    bindEvents() {
        console.log('绑定UI事件');

        // 元素选择
        const captureBtn = document.getElementById('startCapture');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                console.log('点击了选择元素按钮');
                this.startElementCapture();
            });
        }

        // 监听控制
        const startListeningBtn = document.getElementById('startListening');
        const stopListeningBtn = document.getElementById('stopListening');

        if (startListeningBtn) {
            startListeningBtn.addEventListener('click', () => {
                console.log('点击了开始监听按钮');
                this.startListening();
            });
        }

        if (stopListeningBtn) {
            stopListeningBtn.addEventListener('click', () => {
                console.log('点击了停止监听按钮');
                this.stopListening();
            });
        }

        // 清空日志
        const clearLogsBtn = document.getElementById('clearLogs');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                console.log('点击了清空日志按钮');
                this.clearLogs();
            });
        }

        // 打开侧边栏
        const openSidebarBtn = document.getElementById('openSidebar');
        if (openSidebarBtn) {
            openSidebarBtn.addEventListener('click', () => {
                console.log('点击了打开侧边栏按钮');
                this.openSidebar();
            });
        }

        // 搜索功能
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                this.searchLogs(e.target.value);
            });
        }
    }

    async startElementCapture() {
        console.log('开始元素捕获');
        try {
            const response = await this.sendMessage('startCapture');
            console.log('元素捕获响应:', response);
            if (response && response.success) {
                document.getElementById('startCapture').textContent = '❌ 取消选择';
                document.getElementById('statusText').textContent = '请选择要监听的元素';
            }
        } catch (error) {
            console.error('启动元素捕获失败:', error);
            alert('启动元素捕获失败: ' + error.message);
        }
    }

    async startListening() {
        console.log('开始监听');
        try {
            const attributeSelect = document.getElementById('attributeSelect');
            if (!attributeSelect || !this.elementInfo) {
                alert('请先选择元素');
                return;
            }

            const attribute = attributeSelect.value;
            const elementSelector = this.elementInfo.cssSelector;

            console.log('监听元素:', elementSelector, '属性:', attribute);

            const response = await this.sendMessage('startWatching', {
                elementSelector: elementSelector,
                attribute: attribute
            });

            console.log('开始监听响应:', response);

        } catch (error) {
            console.error('启动监听失败:', error);
            alert('启动监听失败: ' + error.message);
        }
    }

    async stopListening() {
        console.log('停止监听');
        try {
            const response = await this.sendMessage('stopWatching');
            console.log('停止监听响应:', response);
        } catch (error) {
            console.error('停止监听失败:', error);
            alert('停止监听失败');
        }
    }

    async clearLogs() {
        console.log('清空日志');
        try {
            const response = await this.sendMessage('clearLogs');
            console.log('清空日志响应:', response);
            if (response && response.success) {
                this.logs = [];
                this.updateLogDisplay();
                this.updateLogCount();
            }
        } catch (error) {
            console.error('清空日志失败:', error);
            alert('清空日志失败');
        }
    }

    async openSidebar() {
        console.log('打开侧边栏');
        try {
            // 使用Chrome sidePanel API打开侧边栏
            await chrome.sidePanel.open({ tabId: this.currentTabId });
            console.log('侧边栏已打开');
        } catch (error) {
            console.error('打开侧边栏失败:', error);
            alert('打开侧边栏失败: ' + error.message);
        }
    }

    async loadStatus() {
        console.log('加载状态');
        try {
            const response = await this.sendMessage('getStatus');
            console.log('状态响应:', response);

            if (response) {
                this.isWatching = response.isWatching;

                // 保留现有日志，只是合并新日志，不清空
                if (response.logs && response.logs.length > 0) {
                    // 合并现有日志和新日志，避免重复
                    const newLogs = response.logs.filter(log =>
                        !this.logs.some(existingLog => existingLog.id === log.id)
                    );
                    this.logs = [...newLogs, ...this.logs];
                }

                if (response.targetElement) {
                    this.elementInfo = response.targetElement;
                    this.showElementInfo(response.targetElement, response.targetAttribute);
                }

                if (this.isWatching) {
                    // 正在监听状态
                    document.getElementById('statusText').textContent = `正在监听: ${response.targetElement?.tagName}.${response.targetAttribute}`;
                    document.getElementById('startListening').disabled = true;
                    document.getElementById('stopListening').disabled = false;
                    document.getElementById('startCapture').disabled = true;
                    this.updateStatusIndicator(true);
                } else if (response.targetElement) {
                    // 已选择元素但未开始监听状态
                    document.getElementById('statusText').textContent = '已选择元素，准备监听';
                    document.getElementById('startListening').disabled = false;
                    document.getElementById('stopListening').disabled = true;
                    document.getElementById('startCapture').disabled = false;
                    this.updateStatusIndicator(false);
                } else {
                    // 未选择元素状态
                    document.getElementById('statusText').textContent = '未开始监听';
                    document.getElementById('startListening').disabled = true;
                    document.getElementById('stopListening').disabled = true;
                    document.getElementById('startCapture').disabled = false;
                    this.updateStatusIndicator(false);
                }

                this.updateLogDisplay();
                this.updateLogCount();
            }
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }

    handleMessage(message) {
        console.log('收到消息:', message);
        switch (message.action) {
            case 'elementSelected':
                console.log('处理elementSelected消息');
                this.handleElementSelected(message.elementInfo);
                break;
            case 'watchingStarted':
                console.log('处理watchingStarted消息');
                this.handleWatchingStarted(message.elementInfo, message.attribute);
                break;
            case 'watchingStopped':
                console.log('处理watchingStopped消息');
                this.handleWatchingStopped();
                break;
            case 'newLog':
                console.log('处理newLog消息');
                this.handleNewLog(message.logEntry);
                break;
            case 'logsCleared':
                console.log('处理logsCleared消息');
                this.logs = [];
                this.updateLogDisplay();
                this.updateLogCount();
                break;
            default:
                console.log('未处理的消息类型:', message.action);
        }
    }

    handleElementSelected(elementInfo) {
        console.log('元素已选择:', elementInfo);
        this.elementInfo = elementInfo;
        this.showElementInfo(elementInfo);

        document.getElementById('startListening').disabled = false;
        document.getElementById('statusText').textContent = '已选择元素，准备监听';
        this.updateStatusIndicator(false);

        document.getElementById('startCapture').textContent = '🎯 选择元素';
    }

    handleWatchingStarted(elementInfo, attribute) {
        console.log('监听已开始:', elementInfo, attribute);
        this.isWatching = true;
        this.elementInfo = elementInfo;

        document.getElementById('statusText').textContent = `正在监听: ${elementInfo.tagName}.${attribute}`;
        this.updateStatusIndicator(true);

        document.getElementById('startListening').disabled = true;
        document.getElementById('stopListening').disabled = false;
        document.getElementById('startCapture').disabled = true;

        this.showElementInfo(elementInfo, attribute);
    }

    handleWatchingStopped() {
        console.log('监听已停止');
        this.isWatching = false;
        document.getElementById('statusText').textContent = '监听已停止';
        this.updateStatusIndicator(false);

        document.getElementById('startListening').disabled = false;
        document.getElementById('stopListening').disabled = true;
        document.getElementById('startCapture').disabled = false;

        document.getElementById('elementInfo').style.display = 'none';
        this.elementInfo = null;
    }

    handleNewLog(logEntry) {
        console.log('新日志:', logEntry);
        this.logs.unshift(logEntry);
        this.updateLogDisplay();
        this.updateLogCount();
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
                <div>元素: <strong>${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</strong></div>
                <div style="margin-top: 8px;">
                    <label style="font-weight: 600; margin-right: 6px;">选择属性:</label>
                </div>
                <select id="attributeSelect">
                    ${attributeOptions}
                </select>
            `;

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

    updateLogDisplay() {
        const logContent = document.getElementById('logContent');
        if (!logContent) return;

        if (this.logs.length === 0) {
            logContent.innerHTML = '<div class="empty-state">暂无日志数据</div>';
            return;
        }

        // 简化为两行显示：时间 + 值
        const logHtml = this.logs.slice(0, 15).map(log => {
            const elementText = log.elementInfo ?
                `${log.elementInfo.tagName}${log.elementInfo.id}${log.elementInfo.classes}` :
                '未知元素';

            // 如果有旧值，显示变化信息
            let valueDisplay = log.newValue;
            if (log.oldValue !== null && log.oldValue !== undefined) {
                valueDisplay = `"${log.newValue}" (从 "${log.oldValue}")`;
            }

            return `
                <div class="log-item">
                    <div class="log-time">⏰ ${log.timeString}</div>
                    <div class="log-value">
                        <span class="element-tag">📍 ${elementText}</span>
                        <span class="attr-tag">🏷️ ${log.attribute}:</span>
                        ${valueDisplay}
                    </div>
                </div>
            `;
        }).join('');

        logContent.innerHTML = logHtml;
    }

    updateLogCount() {
        const logCount = document.getElementById('logCount');
        if (logCount) {
            logCount.textContent = `(${this.logs.length})`;
        }
    }

    searchLogs(searchTerm) {
        // 简单的搜索实现
        this.updateLogDisplay();
    }

    updateStatusIndicator(isActive) {
        const indicator = document.getElementById('statusIndicator');
        if (indicator) {
            indicator.className = `status-indicator ${isActive ? 'status-active' : 'status-inactive'}`;
        }
    }

    sendMessage(action, data = {}) {
        console.log('发送消息:', action, data);
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(this.currentTabId, {
                action: action,
                ...data
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('消息发送错误:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('消息发送成功，响应:', response);
                    resolve(response || {});
                }
            });
        });
    }
}

// 初始化工作版本popup控制器
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化工作版本popup控制器');
    try {
        new WorkingPopupController();
        console.log('工作版本popup控制器初始化完成');
    } catch (error) {
        console.error('工作版本popup控制器初始化失败:', error);
    }
});