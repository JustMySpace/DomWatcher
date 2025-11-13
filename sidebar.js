// DOM监听器侧边栏脚本
console.log('DOM监听器侧边栏脚本已加载');

(function() {
    // 防止重复创建
    if (document.getElementById('dom-watcher-sidebar')) {
        console.log('侧边栏已存在，跳过创建');
        return;
    }

    class SidebarController {
        constructor() {
            this.elementInfo = null;
            this.logs = [];
            this.isWatching = false;
            this.isCapturing = false;
            this.isCollapsed = false;
            this.currentSearchTerm = '';

            this.createSidebar();
            this.bindEvents();
            this.initCommunication();
            this.loadInitialData();
        }

        createSidebar() {
            console.log('开始创建侧边栏');

            // 获取已存在的侧边栏元素（content.js已经创建了HTML）
            this.sidebarElement = document.getElementById('dom-watcher-sidebar');
            this.collapsedElement = document.getElementById('sidebarCollapsed');

            if (this.sidebarElement) {
                console.log('找到侧边栏元素，开始初始化');
                // 绑定侧边栏特定事件
                this.bindSidebarEvents();
            } else {
                console.error('未找到侧边栏元素');
            }
        }

        bindSidebarEvents() {
            // 侧边栏收起/展开
            const toggleBtn = document.getElementById('toggleSidebar');
            const closeBtn = document.getElementById('closeSidebar');
            const expandBtn = document.getElementById('expandSidebar');

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.toggleSidebar();
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeSidebar();
                });
            }

            if (expandBtn) {
                expandBtn.addEventListener('click', () => {
                    this.expandSidebar();
                });
            }

            // 导出对话框事件
            const exportBtn = document.getElementById('exportLogs');
            const closeExportDialog = document.getElementById('closeExportDialog');
            const cancelExport = document.getElementById('cancelExport');
            const confirmExport = document.getElementById('confirmExport');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.showExportDialog();
                });
            }

            if (closeExportDialog) {
                closeExportDialog.addEventListener('click', () => {
                    this.hideExportDialog();
                });
            }

            if (cancelExport) {
                cancelExport.addEventListener('click', () => {
                    this.hideExportDialog();
                });
            }

            if (confirmExport) {
                confirmExport.addEventListener('click', () => {
                    this.performExport();
                });
            }

            // 点击遮罩层关闭对话框
            const dialogOverlay = document.querySelector('.dialog-overlay');
            if (dialogOverlay) {
                dialogOverlay.addEventListener('click', () => {
                    this.hideExportDialog();
                });
            }

            // 监听ESC键关闭对话框
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideExportDialog();
                }
            });
        }

        bindEvents() {
            // 等待DOM加载完成
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
                        this.currentSearchTerm = e.target.value;
                        this.updateLogDisplay();
                    });
                }
            }, 500);
        }

        initCommunication() {
            // 监听来自内容脚本的消息
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'DOM_WATCHER_SIDEBAR_MESSAGE') {
                    this.handleMessage(event.data.message);
                }
            });

            // 通知内容脚本侧边栏已打开
            this.sendMessageToContent('sidebarOpened');
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
                case 'logsData':
                    this.handleLogsData(message.logs);
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
            this.updateLogCount();
        }

        handleStatusUpdate(status) {
            if (status.isWatching) {
                this.isWatching = status.isWatching;
                this.elementInfo = status.targetElement;
                this.updateButtonStates({ watching: true });
            }
        }

        handleLogsData(logs) {
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
                this.isCapturing = true;
                this.sendMessageToContent('startCapture');
                this.updateStatus('请选择要监听的元素', false);

                const startCaptureBtn = document.getElementById('startCapture');
                if (startCaptureBtn) {
                    const btnText = startCaptureBtn.querySelector('.btn-text');
                    const btnIcon = startCaptureBtn.querySelector('.btn-icon');
                    if (btnText) btnText.textContent = '取消选择';
                    if (btnIcon) btnIcon.textContent = '❌';
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
                const btnText = startCaptureBtn.querySelector('.btn-text');
                const btnIcon = startCaptureBtn.querySelector('.btn-icon');
                if (btnText) btnText.textContent = '选择元素';
                if (btnIcon) btnIcon.textContent = '🎯';
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
                this.sendMessageToContent('stopListening');
            } catch (error) {
                console.error('停止监听失败:', error);
            }
        }

        async clearLogs() {
            try {
                this.logs = [];
                this.updateLogDisplay();
                this.updateLogCount();
                this.sendMessageToContent('clearLogs');
            } catch (error) {
                console.error('清空日志失败:', error);
            }
        }

        async loadInitialData() {
            try {
                // 请求内容脚本发送当前日志数据
                this.sendMessageToContent('getLogsData');
            } catch (error) {
                console.error('加载初始数据失败:', error);
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

            const logHtml = filteredLogs.map(log => {
                const elementText = log.elementInfo ?
                    `${log.elementInfo.tagName}${log.elementInfo.id}${log.elementInfo.classes}` :
                    '未知元素';

                const oldValueText = log.oldValue !== null ? ` (从 "${log.oldValue}")` : '';

                return `
                    <div class="log-item ${this.currentSearchTerm ? 'highlight' : ''}">
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

        updateLogCount() {
            const logCount = document.getElementById('logCount');
            if (logCount) {
                logCount.textContent = `(${this.logs.length})`;
            }
        }

        toggleSidebar() {
            this.isCollapsed = !this.isCollapsed;
            if (this.isCollapsed) {
                this.collapseSidebar();
            } else {
                this.expandSidebar();
            }
        }

        collapseSidebar() {
            this.isCollapsed = true;
            this.sidebarElement.classList.add('collapsed');
        }

        expandSidebar() {
            this.isCollapsed = false;
            this.sidebarElement.classList.remove('collapsed');
        }

        closeSidebar() {
            if (this.sidebarElement) {
                this.sidebarElement.remove();
            }
            if (this.collapsedElement) {
                this.collapsedElement.remove();
            }
        }

        // 日志导出功能
        showExportDialog() {
            const dialog = document.getElementById('exportDialog');
            if (dialog) {
                dialog.style.display = 'block';
            }
        }

        hideExportDialog() {
            const dialog = document.getElementById('exportDialog');
            if (dialog) {
                dialog.style.display = 'none';
            }
        }

        performExport() {
            const format = document.querySelector('input[name="exportFormat"]:checked').value;
            const range = document.querySelector('input[name="exportRange"]:checked').value;

            // 获取要导出的日志
            let logsToExport = this.logs;
            if (range === 'filtered' && this.currentSearchTerm) {
                const lowerSearchTerm = this.currentSearchTerm.toLowerCase();
                logsToExport = this.logs.filter(log => {
                    return (
                        log.elementInfo?.tagName.toLowerCase().includes(lowerSearchTerm) ||
                        log.attribute?.toLowerCase().includes(lowerSearchTerm) ||
                        log.newValue?.toLowerCase().includes(lowerSearchTerm) ||
                        log.oldValue?.toLowerCase().includes(lowerSearchTerm) ||
                        log.timeString.includes(this.currentSearchTerm)
                    );
                });
            }

            // 根据格式导出
            switch (format) {
                case 'json':
                    this.exportAsJSON(logsToExport);
                    break;
                case 'csv':
                    this.exportAsCSV(logsToExport);
                    break;
                case 'txt':
                    this.exportAsTXT(logsToExport);
                    break;
            }

            this.hideExportDialog();
        }

        exportAsJSON(logs) {
            const data = {
                exportTime: new Date().toISOString(),
                exportFormat: 'JSON',
                totalLogs: logs.length,
                logs: logs
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const filename = `dom-watcher-logs-${Date.now()}.json`;

            this.downloadFile(url, filename);
        }

        exportAsCSV(logs) {
            if (logs.length === 0) {
                alert('没有日志可导出');
                return;
            }

            const headers = ['时间戳', '时间', '元素', '属性', '新值', '旧值', '类型'];
            const csvContent = [
                headers.join(','),
                ...logs.map(log => [
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

        exportAsTXT(logs) {
            if (logs.length === 0) {
                alert('没有日志可导出');
                return;
            }

            const header = `DOM属性监听器日志导出\n导出时间: ${new Date().toLocaleString('zh-CN')}\n总日志数: ${logs.length}\n${'='.repeat(50)}\n\n`;

            const content = logs.map((log, index) => {
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
    }

    // 创建侧边栏
    new SidebarController();

})();