// DOM属性监听器 - 弹出窗口脚本
class PopupController {
    constructor() {
        this.currentTabId = null;
        this.elementInfo = null;
        this.logs = [];
        this.isWatching = false;
        this.init();
    }

    async init() {
        // 获取当前标签页ID
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTabId = tab.id;

        // 绑定UI事件
        this.bindEvents();

        // 加载状态
        await this.loadStatus();

        // 监听来自内容脚本的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender);
        });
    }

    bindEvents() {
        console.log('开始绑定事件...');

        // 元素选择
        const captureBtn = document.getElementById('startCapture');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                console.log('点击了选择元素按钮');
                this.startElementCapture();
            });
            console.log('选择元素按钮事件已绑定');
        } else {
            console.error('找不到选择元素按钮');
        }

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

        // 搜索功能
        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.searchLogs(e.target.value);
        });

        // 侧边栏开关
        document.getElementById('openSidebar').addEventListener('click', () => {
            this.openSidebar();
        });

        // 浮动窗口
        document.getElementById('openFloating').addEventListener('click', () => {
            this.openFloatingWindow();
        });

        // 导出日志
        document.getElementById('exportLogs').addEventListener('click', () => {
            this.exportLogs();
        });
    }

    async startElementCapture() {
        console.log('开始元素捕获...');
        try {
            console.log('发送startCapture消息...');
            const response = await this.sendMessage('startCapture');
            console.log('收到响应:', response);
            if (response && response.success) {
                console.log('元素捕获成功');
                this.updateUI({ isCapturing: true });
            } else {
                console.error('元素捕获失败，响应:', response);
            }
        } catch (error) {
            console.error('启动元素捕获失败:', error);
            this.showError('启动元素捕获失败');
        }
    }

    async handleMessage(message, sender) {
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

            case 'restoreWatchingState':
                this.handleRestoreWatchingState(message.targetElementSelector, message.targetAttribute);
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

    handleRestoreWatchingState(targetElementSelector, targetAttribute) {
        // 询问用户是否恢复监听
        const shouldRestore = confirm('检测到之前的监听状态，是否恢复？');
        if (shouldRestore) {
            this.startListening(targetElementSelector, targetAttribute);
        }
    }

    showElementInfo(elementInfo, selectedAttribute = null) {
        const elementInfoDiv = document.getElementById('elementInfo');
        const elementInfoContent = document.getElementById('elementInfoContent');

        // 创建属性选择下拉菜单
        const attributes = Object.keys(elementInfo.attributes);
        if (attributes.length === 0) {
            elementInfoContent.innerHTML = `
                <div><strong>元素:</strong> ${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</div>
                <div><strong>状态:</strong> 该元素没有属性</div>
            `;
        } else {
            const attributeOptions = attributes.map(attr =>
                `<option value="${attr}">${attr} = "${elementInfo.attributes[attr]}"</option>`
            ).join('');

            elementInfoContent.innerHTML = `
                <div><strong>元素:</strong> ${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</div>
                <div style="margin-top: 8px;">
                    <strong>选择属性:</strong>
                    <select id="attributeSelect" style="margin-left: 8px;">
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

            const response = await this.sendMessage('startWatching', {
                elementSelector: elementSelector,
                attribute: attribute
            });

            if (!response.success) {
                throw new Error(response.error);
            }

        } catch (error) {
            console.error('启动监听失败:', error);
            this.showError('启动监听失败: ' + error.message);
        }
    }

    async stopListening() {
        try {
            const response = await this.sendMessage('stopWatching');
            if (response.success) {
                // 清理UI状态
                document.getElementById('elementInfo').style.display = 'none';
                this.elementInfo = null;
            }
        } catch (error) {
            console.error('停止监听失败:', error);
            this.showError('停止监听失败');
        }
    }

    async clearLogs() {
        try {
            const response = await this.sendMessage('clearLogs');
            if (response.success) {
                this.logs = [];
                this.updateLogDisplay();
                this.updateLogCount();
            }
        } catch (error) {
            console.error('清空日志失败:', error);
            this.showError('清空日志失败');
        }
    }

    async loadStatus() {
        try {
            const response = await this.sendMessage('getStatus');
            if (response) {
                this.isWatching = response.isWatching;
                this.logs = response.logs || [];

                if (response.targetElement) {
                    this.elementInfo = response.targetElement;
                    this.showElementInfo(response.targetElement, response.targetAttribute);
                }

                if (this.isWatching) {
                    document.getElementById('statusText').textContent = `正在监听: ${response.targetElement?.tagName}.${response.targetAttribute}`;
                    document.getElementById('startListening').disabled = true;
                    document.getElementById('stopListening').disabled = false;
                    document.getElementById('startCapture').disabled = true;
                    this.updateStatusIndicator(true);
                } else if (response.targetElement) {
                    document.getElementById('statusText').textContent = '已选择元素，准备监听';
                    document.getElementById('startListening').disabled = false;
                    this.updateStatusIndicator(false);
                }

                this.updateLogDisplay();
                this.updateLogCount();
            }
        } catch (error) {
            console.error('加载状态失败:', error);
            this.showError('加载状态失败');
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
                    <div style="color: #666; margin-top: 4px;">📊 ${log.type}</div>
                </div>
            `;
        }).join('');

        logContent.innerHTML = logHtml;
    }

    searchLogs(searchTerm) {
        this.updateLogDisplay(searchTerm);
    }

    updateLogCount() {
        const logCount = document.getElementById('logCount');
        logCount.textContent = `(${this.logs.length})`;
    }

    updateStatusIndicator(isActive) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator ${isActive ? 'status-active' : 'status-inactive'}`;
    }

    showError(message) {
        // 简单的错误提示
        alert('❌ ' + message);
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

    async openSidebar() {
        try {
            // 通过内容脚本加载侧边栏
            await this.sendMessage('openSidebar');
            window.close(); // 关闭popup
        } catch (error) {
            console.error('打开侧边栏失败:', error);
            this.showError('打开侧边栏失败');
        }
    }

    async openFloatingWindow() {
        try {
            // 通过内容脚本加载浮动窗口
            await this.sendMessage('openFloatingWindow');
            window.close(); // 关闭popup
        } catch (error) {
            console.error('打开浮动窗口失败:', error);
            this.showError('打开浮动窗口失败');
        }
    }

    async exportLogs() {
        try {
            if (this.logs.length === 0) {
                alert('没有日志可导出');
                return;
            }

            // 创建导出选择对话框
            const format = await this.showExportDialog();
            if (!format) return; // 用户取消

            // 根据格式导出
            switch (format) {
                case 'json':
                    this.exportAsJSON();
                    break;
                case 'csv':
                    this.exportAsCSV();
                    break;
                case 'txt':
                    this.exportAsTXT();
                    break;
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出失败');
        }
    }

    showExportDialog() {
        return new Promise((resolve) => {
            const format = prompt('请选择导出格式:\n1. JSON\n2. CSV\n3. TXT\n\n请输入数字 (1/2/3):');

            switch (format) {
                case '1':
                    resolve('json');
                    break;
                case '2':
                    resolve('csv');
                    break;
                case '3':
                    resolve('txt');
                    break;
                default:
                    resolve(null);
            }
        });
    }

    exportAsJSON() {
        const data = {
            exportTime: new Date().toISOString(),
            exportFormat: 'JSON',
            totalLogs: this.logs.length,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const filename = `dom-watcher-logs-${Date.now()}.json`;

        this.downloadFile(url, filename);
    }

    exportAsCSV() {
        if (this.logs.length === 0) {
            alert('没有日志可导出');
            return;
        }

        const headers = ['时间戳', '时间', '元素', '属性', '新值', '旧值', '类型'];
        const csvContent = [
            headers.join(','),
            ...this.logs.map(log => [
                log.timestamp,
                `"${log.timeString}"`,
                `"${log.elementInfo ? `${log.elementInfo.tagName}${log.elementInfo.id}${log.elementInfo.classes}` : '未知元素'}"`,
                `"${log.attribute}"`,
                `"${log.newValue}"`,
                `"${log.oldValue || ''}"`,
                `"${log.type}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const filename = `dom-watcher-logs-${Date.now()}.csv`;

        this.downloadFile(url, filename);
    }

    exportAsTXT() {
        if (this.logs.length === 0) {
            alert('没有日志可导出');
            return;
        }

        const header = `DOM属性监听器日志导出\n导出时间: ${new Date().toLocaleString('zh-CN')}\n总日志数: ${this.logs.length}\n${'='.repeat(50)}\n\n`;

        const content = this.logs.map((log, index) => {
            const elementText = log.elementInfo ?
                `${log.elementInfo.tagName}${log.elementInfo.id}${log.elementInfo.classes}` :
                '未知元素';

            const oldValueText = log.oldValue !== null ? ` (从 "${log.oldValue}")` : '';

            return `[${index + 1}] ${log.timeString}\n` +
                   `元素: ${elementText}\n` +
                   `属性: ${log.attribute}\n` +
                   `变化: "${log.newValue}"${oldValueText}\n` +
                   `类型: ${log.type}\n` +
                   `${'-'.repeat(30)}\n`;
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

    sendMessage(action, data = {}) {
        console.log('发送消息:', action, data, '到标签:', this.currentTabId);
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

// 初始化弹出窗口控制器
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化popup控制器');
    try {
        new PopupController();
        console.log('popup控制器初始化完成');
    } catch (error) {
        console.error('popup控制器初始化失败:', error);
    }
});