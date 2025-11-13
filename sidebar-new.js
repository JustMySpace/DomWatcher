// DOM监听器侧边栏 - 独立版本
console.log('DOM监听器独立侧边栏脚本已加载');

class IndependentSidebarController {
    constructor() {
        this.elementInfo = null;
        this.logs = [];
        this.isWatching = false;
        this.isCapturing = false;
        this.currentSearchTerm = '';
        this.currentTabId = null;
        this.isConnected = false;

        this.init();
    }

    async init() {
        console.log('初始化独立侧边栏');

        try {
            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTabId = tab.id;
            console.log('当前标签页ID:', this.currentTabId);

            // 绑定事件
            this.bindEvents();

            // 初始化通信
            this.initCommunication();

            // 加载初始数据
            await this.loadInitialData();

            console.log('独立侧边栏初始化完成');
        } catch (error) {
            console.error('独立侧边栏初始化失败:', error);
            this.updateConnectionStatus(false);
        }
    }

    bindEvents() {
        // 控制按钮事件
        document.getElementById('startCapture').addEventListener('click', () => {
            this.startElementCapture();
        });

        // Toggle按钮事件
        document.getElementById('toggleListening').addEventListener('click', () => {
            this.toggleListening();
        });

        document.getElementById('clearLogs').addEventListener('click', () => {
            this.clearLogs();
        });

        // 搜索功能
        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.currentSearchTerm = e.target.value;
            this.updateLogDisplay();
        });

        // 导出功能
        document.getElementById('exportLogs').addEventListener('click', () => {
            this.showExportDialog();
        });

        document.getElementById('closeExportDialog').addEventListener('click', () => {
            this.hideExportDialog();
        });

        document.getElementById('cancelExport').addEventListener('click', () => {
            this.hideExportDialog();
        });

        document.getElementById('confirmExport').addEventListener('click', () => {
            this.performExport();
        });

        // 刷新连接
        document.getElementById('refreshConnection').addEventListener('click', () => {
            this.refreshConnection();
        });

        // 对话框遮罩点击关闭
        document.querySelector('.dialog-overlay').addEventListener('click', () => {
            this.hideExportDialog();
        });

        // ESC键关闭对话框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideExportDialog();
            }
        });
    }

    initCommunication() {
        // 监听来自内容脚本的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
            sendResponse({ received: true });
        });

        console.log('通信初始化完成');
    }

    async sendMessage(action, data = {}) {
        try {
            const response = await chrome.tabs.sendMessage(this.currentTabId, {
                action: action,
                ...data
            });
            console.log('消息发送成功:', action, response);
            return response;
        } catch (error) {
            console.error('消息发送失败:', action, error);
            this.updateConnectionStatus(false);
            throw error;
        }
    }

    handleMessage(message) {
        console.log('收到消息:', message);

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
            case 'logsCleared':
                this.handleLogsCleared();
                break;
            case 'logsData':
                this.handleLogsData(message.logs);
                break;
        }
    }

    handleElementSelected(elementInfo) {
        console.log('元素已选择:', elementInfo);
        this.elementInfo = elementInfo;
        this.showElementInfo(elementInfo);

        // 停止元素捕获模式并恢复按钮状态
        if (this.isCapturing) {
            this.stopElementCapture();
        }

        // 启用toggle监听按钮
        const toggleBtn = document.getElementById('toggleListening');
        if (toggleBtn) {
            toggleBtn.disabled = !this.isConnected;
        }
        this.updateStatus('已选择元素，准备监听', false);
    }

    handleWatchingStarted(elementInfo, attribute) {
        console.log('监听已开始:', elementInfo, attribute);
        this.isWatching = true;
        this.elementInfo = elementInfo;

        this.updateStatus(`正在监听: ${elementInfo.tagName}.${attribute}`, true);

        // 更新toggle按钮状态
        this.updateToggleButton(true);

        // 显示元素信息
        this.showElementInfo(elementInfo, attribute);
    }

    handleWatchingStopped() {
        console.log('监听已停止');
        this.isWatching = false;
        this.updateStatus('监听已停止', false);

        // 更新toggle按钮状态
        this.updateToggleButton(false);

        // 隐藏元素信息
        document.getElementById('elementInfo').style.display = 'none';
        this.elementInfo = null;
    }

    handleNewLog(logEntry) {
        console.log('新日志:', logEntry);
        this.logs.unshift(logEntry);
        this.updateLogDisplay();
        this.updateLogCount();
    }

    handleLogsCleared() {
        console.log('日志已清空');
        this.logs = [];
        this.updateLogDisplay();
        this.updateLogCount();
    }

    handleLogsData(logs) {
        console.log('收到日志数据:', logs?.length);
        this.logs = logs || [];
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
                <div style="margin-top: 4px; color: #6c757d;">该元素没有属性</div>
            `;
        } else {
            const attributeOptions = attributes.map(attr =>
                `<option value="${attr}">${attr} = "${elementInfo.attributes[attr]}"</option>`
            ).join('');

            elementInfoContent.innerHTML = `
                <div>元素: <strong>${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</strong></div>
                <div style="margin-top: 8px;">
                    <label style="font-weight: 600; margin-right: 6px;">选择属性:</label>
                    <select id="attributeSelect" style="width: calc(100% - 80px);">
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
            console.log('开始元素捕获');
            this.isCapturing = true;

            await this.sendMessage('startCapture');
            this.updateStatus('请选择要监听的元素', false);

            const startCaptureBtn = document.getElementById('startCapture');
            const btnText = startCaptureBtn.querySelector('.btn-text');
            const btnIcon = startCaptureBtn.querySelector('.btn-icon');

            if (btnText) btnText.textContent = '取消选择';
            if (btnIcon) btnIcon.textContent = '❌';

            startCaptureBtn.onclick = () => {
                this.stopElementCapture();
            };
        } catch (error) {
            console.error('启动元素捕获失败:', error);
            alert('启动元素捕获失败: ' + error.message);
        }
    }

    async stopElementCapture() {
        try {
            console.log('停止元素捕获');
            this.isCapturing = false;

            await this.sendMessage('stopCapture');
            this.updateStatus('未开始监听', false);

            const startCaptureBtn = document.getElementById('startCapture');
            const btnText = startCaptureBtn.querySelector('.btn-text');
            const btnIcon = startCaptureBtn.querySelector('.btn-icon');

            if (btnText) btnText.textContent = '选择元素';
            if (btnIcon) btnIcon.textContent = '🎯';

            startCaptureBtn.onclick = () => {
                this.startElementCapture();
            };
        } catch (error) {
            console.error('停止元素捕获失败:', error);
        }
    }

    async toggleListening() {
        if (this.isWatching) {
            await this.stopListening();
        } else {
            await this.startListening();
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

            console.log('开始监听:', elementSelector, attribute);

            await this.sendMessage('startWatching', {
                elementSelector,
                attribute
            });
        } catch (error) {
            console.error('启动监听失败:', error);
            alert('启动监听失败: ' + error.message);
        }
    }

    async stopListening() {
        try {
            console.log('停止监听');
            await this.sendMessage('stopWatching');
        } catch (error) {
            console.error('停止监听失败:', error);
            alert('停止监听失败: ' + error.message);
        }
    }

    async clearLogs() {
        try {
            console.log('清空日志');
            await this.sendMessage('clearLogs');
        } catch (error) {
            console.error('清空日志失败:', error);
            alert('清空日志失败: ' + error.message);
        }
    }

    async loadInitialData() {
        try {
            console.log('加载初始数据');
            this.updateConnectionStatus(true);

            // 请求内容脚本发送当前状态和日志数据
            const response = await this.sendMessage('getStatus');

            if (response) {
                this.isWatching = response.isWatching;

                if (response.logs && response.logs.length > 0) {
                    this.logs = response.logs;
                    this.updateLogDisplay();
                    this.updateLogCount();
                }

                if (response.targetElement) {
                    this.elementInfo = response.targetElement;
                    this.showElementInfo(response.targetElement, response.targetAttribute);
                }

                // 更新按钮状态
                if (this.isWatching) {
                    this.updateToggleButton(true);
                } else if (response.targetElement) {
                    this.updateToggleButton(false);
                }

                this.updateButtonStates({
                    watching: this.isWatching
                });

                // 更新状态文本
                if (this.isWatching) {
                    this.updateStatus(`正在监听: ${response.targetElement?.tagName}.${response.targetAttribute}`, true);
                } else if (response.targetElement) {
                    this.updateStatus('已选择元素，准备监听', false);
                }
            }
        } catch (error) {
            console.error('加载初始数据失败:', error);
            this.updateConnectionStatus(false);
        }
    }

    async refreshConnection() {
        console.log('刷新连接');
        this.updateConnectionStatus(true);
        await this.loadInitialData();
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusIndicator = document.querySelector('#connectionStatus .status-indicator');
        const statusText = document.querySelector('#connectionStatus .status-text');

        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${connected ? 'status-active' : 'status-inactive'}`;
        }

        if (statusText) {
            statusText.textContent = connected ? '已连接到页面' : '未连接到页面';
        }

        // 启用/禁用控制按钮
        const controlButtons = ['startCapture', 'startListening', 'stopListening', 'clearLogs'];
        controlButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn && btnId !== 'startCapture') { // 保留选择元素按钮的启用状态用于测试连接
                btn.disabled = !connected;
            }
        });

        // 如果未连接，禁用选择元素按钮
        if (!connected) {
            document.getElementById('startCapture').disabled = true;
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

    updateToggleButton(isListening) {
        const toggleBtn = document.getElementById('toggleListening');
        const btnIcon = toggleBtn.querySelector('.btn-icon');
        const btnText = toggleBtn.querySelector('.btn-text');

        if (isListening) {
            // 正在监听状态
            toggleBtn.classList.add('listening');
            toggleBtn.classList.remove('btn-success');
            toggleBtn.classList.add('btn-danger');
            btnIcon.textContent = '⏹️';
            btnText.textContent = '停止监听';
        } else {
            // 未监听状态
            toggleBtn.classList.remove('listening');
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-success');
            btnIcon.textContent = '▶️';
            btnText.textContent = '开始监听';
        }

        // 更新启用状态
        toggleBtn.disabled = !this.isConnected || !this.elementInfo;
    }

    updateButtonStates(states) {
        const startCaptureBtn = document.getElementById('startCapture');
        const toggleBtn = document.getElementById('toggleListening');

        if (startCaptureBtn) {
            startCaptureBtn.disabled = states.watching || !this.isConnected;
        }
        if (toggleBtn) {
            toggleBtn.disabled = !this.isConnected || !this.elementInfo;
        }
    }

    updateLogDisplay() {
        const logContent = document.getElementById('logContent');
        if (!logContent) return;

        if (this.logs.length === 0) {
            logContent.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <span class="empty-text">暂无日志数据</span>
                </div>
            `;
            return;
        }

        // 过滤日志
        let filteredLogs = this.logs;
        if (this.currentSearchTerm) {
            const lowerSearchTerm = this.currentSearchTerm.toLowerCase();
            filteredLogs = this.logs.filter(log => {
                return (
                    log.elementInfo?.tagName.toLowerCase().includes(lowerSearchTerm) ||
                    log.attribute?.toLowerCase().includes(lowerSearchTerm) ||
                    log.newValue?.toLowerCase().includes(lowerSearchTerm) ||
                    log.oldValue?.toLowerCase().includes(lowerSearchTerm) ||
                    log.timeString.includes(this.currentSearchTerm)
                );
            });
        }

        if (filteredLogs.length === 0) {
            logContent.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🔍</span>
                    <span class="empty-text">没有匹配的日志</span>
                </div>
            `;
            return;
        }

        // 精简的显示格式：时间 + 选择器 + 数值
        const logHtml = filteredLogs.slice(0, 50).map(log => {
            const selector = log.elementInfo?.cssSelector || '未知选择器';
            const value = log.newValue || '';

            return `
                <div class="log-item ${this.currentSearchTerm ? 'highlight' : ''}">
                    <div class="log-time">⏰ ${log.timeString}</div>
                    <div class="log-info">
                        <span class="log-selector">📍 ${selector}</span>
                        <span class="log-attr">🏷️ ${log.attribute}:</span>
                        <span class="log-value">"${value}"</span>
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

    // 导出功能
    showExportDialog() {
        document.getElementById('exportDialog').style.display = 'block';
    }

    hideExportDialog() {
        document.getElementById('exportDialog').style.display = 'none';
    }

    performExport() {
        const range = document.querySelector('input[name="exportRange"]:checked').value;

        // 获取要导出的日志
        let logsToExport = this.logs;
        if (range === 'filtered' && this.currentSearchTerm) {
            const lowerSearchTerm = this.currentSearchTerm.toLowerCase();
            logsToExport = this.logs.filter(log => {
                return (
                    log.elementInfo?.cssSelector?.toLowerCase().includes(lowerSearchTerm) ||
                    log.attribute?.toLowerCase().includes(lowerSearchTerm) ||
                    log.newValue?.toLowerCase().includes(lowerSearchTerm) ||
                    log.timeString.includes(this.currentSearchTerm)
                );
            });
        }

        // 直接导出TXT格式
        this.exportAsTXT(logsToExport);
        this.hideExportDialog();
    }

    
    exportAsTXT(logs) {
        if (logs.length === 0) {
            alert('没有日志可导出');
            return;
        }

        const header = `DOM属性监听器日志\n导出时间: ${new Date().toLocaleString('zh-CN')}\n总日志数: ${logs.length}\n${'='.repeat(50)}\n\n`;

        const content = logs.map((log, index) => {
            const selector = log.elementInfo?.cssSelector || '未知选择器';
            return `${log.timeString} | ${selector} | ${log.attribute}: "${log.newValue}"`;
        }).join('\n');

        const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const filename = `dom-watcher-logs-${Date.now()}.txt`;

        this.downloadFile(url, filename);
    }

    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化独立侧边栏控制器');
    try {
        new IndependentSidebarController();
        console.log('独立侧边栏控制器初始化完成');
    } catch (error) {
        console.error('独立侧边栏控制器初始化失败:', error);
    }
});