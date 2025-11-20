// DOM监听器浮层面板控制器

class FloatingPanelController {
    constructor() {
        this.watchers = new Map(); // Map<watcherId, watcherInfo>
        this.logs = [];
        this.isCapturing = false;
        this.currentSearchTerm = '';
        this.currentLogFilter = 'all';
        this.isConnected = false;
        this.isPanelVisible = false;
        this.watcherIdCounter = 1;

        this.init();
    }

    init() {
        // 创建浮层UI
        this.createFloatingUI();

        // 绑定事件
        this.bindEvents();

        // 初始化通信
        this.initCommunication();

        // 加载初始数据
        this.loadInitialData();
    }

    createFloatingUI() {
        // 检查是否已存在浮层UI
        if (document.getElementById('domWatcherPanel')) {
            return;
        }

        // 直接创建UI元素，不依赖fetch
        const container = document.createElement('div');
        container.id = 'domWatcherContainer';
        container.innerHTML = `
            <!-- 触发按钮 -->
            <button id="domWatcherTrigger" class="dom-watcher-trigger" title="DOM监听器">
                🔍
            </button>

            <!-- 浮层面板 -->
            <div id="domWatcherPanel" class="dom-watcher-panel">
                <!-- 面板头部 -->
                <div id="domWatcherPanelHeader" class="dom-watcher-panel-header">
                    <div class="dom-watcher-panel-header-left">
                        <span class="dom-watcher-panel-title">DOM监听器</span>
                    </div>
                    <div class="dom-watcher-panel-header-right">
                        <button id="refreshConnection" class="dom-watcher-panel-btn" title="重新连接">
                            🔄
                        </button>
                    </div>
                </div>

                <!-- 面板内容 -->
                <div class="dom-watcher-panel-content">
                    <!-- 连接状态 -->
                    <div id="connectionStatus" class="dom-watcher-connection-status">
                        <span id="statusIndicator" class="dom-watcher-status-indicator"></span>
                        <span id="statusText">未连接到页面</span>
                    </div>

                    <!-- 监听列表区域 -->
                    <div class="dom-watcher-list-section">
                        <div class="dom-watcher-list-header">
                            <div class="dom-watcher-list-title">
                                <span>🎯</span>
                                <span>监听列表</span>
                                <span id="listCount" class="dom-watcher-list-count">(0)</span>
                            </div>
                            <button id="addToListBtn" class="dom-watcher-btn dom-watcher-btn-primary dom-watcher-add-btn">
                                <span>➕</span>
                                <span>添加元素</span>
                            </button>
                        </div>

                        <div id="watcherList" class="dom-watcher-list">
                            <div class="dom-watcher-empty-list">
                                <div class="dom-watcher-empty-icon">🎯</div>
                                <div class="dom-watcher-empty-text">暂无监听对象</div>
                                <button id="firstAddBtn" class="dom-watcher-btn dom-watcher-btn-primary">
                                    <span>➕</span>
                                    <span>添加第一个监听对象</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 日志区域 -->
                    <div class="dom-watcher-logs">
                        <div class="dom-watcher-logs-header">
                            <div class="dom-watcher-logs-title">
                                <span>📋</span>
                                <span>监听日志</span>
                                <span id="logCount" class="dom-watcher-log-count">(0)</span>
                            </div>
                            <div class="dom-watcher-log-filter">
                                <select id="logFilterSelect" class="dom-watcher-log-filter-select">
                                    <option value="all">全部日志</option>
                                </select>
                                <button id="exportLogs" class="dom-watcher-btn dom-watcher-btn-primary dom-watcher-btn-small" title="导出日志">
                                    <span>📤</span>
                                </button>
                            </div>
                        </div>

                        <!-- 搜索框 -->
                        <div class="dom-watcher-search">
                            <input type="text" id="searchBox" class="dom-watcher-search-input" placeholder="搜索元素、属性或时间...">
                        </div>

                        <!-- 日志内容 -->
                        <div id="logContent" class="dom-watcher-log-content">
                            <div class="dom-watcher-empty-state">
                                <span class="dom-watcher-empty-icon">📭</span>
                                <span>暂无日志数据</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 导出选项对话框 -->
            <div id="exportDialog" class="dom-watcher-export-dialog" style="display: none;">
                <div class="dom-watcher-dialog-content">
                    <div class="dom-watcher-dialog-header">
                        <h3 class="dom-watcher-dialog-title">导出日志</h3>
                        <button id="closeExportDialog" class="dom-watcher-dialog-close">×</button>
                    </div>
                    <div class="dom-watcher-dialog-body">
                        <div class="dom-watcher-option-group">
                            <label class="dom-watcher-option-label">导出范围：</label>
                            <div class="dom-watcher-radio-group">
                                <label class="dom-watcher-radio-label">
                                    <input type="radio" name="exportRange" value="all" checked>
                                    <span>全部日志</span>
                                </label>
                                <label class="dom-watcher-radio-label">
                                    <input type="radio" name="exportRange" value="filtered">
                                    <span>当前筛选结果</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="dom-watcher-dialog-footer">
                        <button id="cancelExport" class="dom-watcher-btn dom-watcher-btn-secondary">取消</button>
                        <button id="confirmExport" class="dom-watcher-btn dom-watcher-btn-primary">导出</button>
                    </div>
                </div>
            </div>
        `;

        // 等待body可用
        const appendToBody = () => {
            if (document.body) {
                document.body.appendChild(container);
            } else {
                setTimeout(appendToBody, 100);
            }
        };

        appendToBody();
    }

    bindEvents() {
        // 使用更可靠的等待方式
        const waitForElements = () => {
            const triggerBtn = document.getElementById('domWatcherTrigger');
            const panel = document.getElementById('domWatcherPanel');

            if (triggerBtn && panel) {
                this.bindPanelEvents();
            } else {
                setTimeout(waitForElements, 50);
            }
        };

        waitForElements();
    }

    bindPanelEvents() {
        // 触发按钮点击事件
        const triggerBtn = document.getElementById('domWatcherTrigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => {
                this.togglePanel();
            });
        }

        // 刷新连接
        const refreshBtn = document.getElementById('refreshConnection');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.refreshConnection();
            });
        }

        // 添加到列表按钮
        const addToListBtn = document.getElementById('addToListBtn');
        if (addToListBtn) {
            addToListBtn.addEventListener('click', () => {
                this.startElementCapture();
            });
        }

        // 第一个添加按钮（空列表时）
        const firstAddBtn = document.getElementById('firstAddBtn');
        if (firstAddBtn) {
            firstAddBtn.addEventListener('click', () => {
                this.startElementCapture();
            });
        }

        // 日志筛选下拉框
        const logFilterSelect = document.getElementById('logFilterSelect');
        if (logFilterSelect) {
            logFilterSelect.addEventListener('change', (e) => {
                this.currentLogFilter = e.target.value;
                this.updateLogDisplay();
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

        // 导出功能
        const exportLogsBtn = document.getElementById('exportLogs');
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => {
                this.showExportDialog();
            });
        }

        // 导出对话框事件
        this.bindExportDialogEvents();
    }

    bindExportDialogEvents() {
        const closeBtn = document.getElementById('closeExportDialog');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideExportDialog();
            });
        }

        const cancelBtn = document.getElementById('cancelExport');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideExportDialog();
            });
        }

        const confirmBtn = document.getElementById('confirmExport');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.performExport();
            });
        }

        // 对话框遮罩点击关闭
        const dialog = document.getElementById('exportDialog');
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    this.hideExportDialog();
                }
            });
        }

        // ESC键关闭对话框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideExportDialog();
            }
        });
    }

    initCommunication() {
        // 监听来自injected script的消息
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;

            const message = event.data;
            if (message && message.type === 'DOM_WATCHER_MESSAGE') {
                this.handleMessage(message.data);
            }
        });
    }

    sendMessage(action, data = {}) {
        return new Promise((resolve, reject) => {
            const messageId = Date.now() + Math.random();

            // 检查是否有domWatcher接口可用
            if (window.domWatcher && window.domWatcher.sendMessage) {
                // 使用注入脚本的接口
                window.domWatcher.sendMessage(action, data)
                    .then(resolve)
                    .catch(reject);
            } else {
                // 直接通过postMessage发送
                window.postMessage({
                    type: 'DOM_WATCHER_MESSAGE',
                    data: {
                        id: messageId,
                        action: action,
                        ...data
                    }
                }, '*');

                // 监听响应
                const responseHandler = (event) => {
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
            }
        });
    }

    handleMessage(message) {

        switch (message.action) {
            case 'elementSelected':
                this.handleElementSelected(message.elementInfo);
                break;
            case 'watchingStarted':
                this.handleWatchingStarted(message.watcherId, message.elementInfo);
                break;
            case 'watchingStopped':
                this.handleWatchingStopped(message.watcherId);
                break;
            case 'watcherAdded':
                this.handleWatcherAdded(message.watcherId, message.watcher);
                break;
            case 'watcherRemoved':
                this.handleWatcherRemoved(message.watcherId);
                break;
            case 'newLog':
                this.handleNewLog(message.logEntry);
                break;
            case 'logsCleared':
                this.handleLogsCleared();
                break;
            case 'statusUpdate':
                this.handleStatusUpdate(message.status);
                break;
        }
    }

    togglePanel() {
        this.isPanelVisible = !this.isPanelVisible;
        const panel = document.getElementById('domWatcherPanel');
        const trigger = document.getElementById('domWatcherTrigger');

        if (panel) {
            if (this.isPanelVisible) {
                panel.classList.add('show');
                trigger?.classList.add('active');
            } else {
                panel.classList.remove('show');
                trigger?.classList.remove('active');
            }
        }
    }

    toggleCollapse() {
        this.isPanelCollapsed = !this.isPanelCollapsed;
        const panel = document.getElementById('domWatcherPanel');
        const collapseBtn = document.getElementById('collapsePanel');

        if (panel) {
            if (this.isPanelCollapsed) {
                panel.classList.add('collapsed');
                collapseBtn.textContent = '▲';
            } else {
                panel.classList.remove('collapsed');
                collapseBtn.textContent = '▼';
            }
        }
    }

    async startElementCapture() {
        try {
            this.isCapturing = true;

            await this.sendMessage('startCapture');
            this.updateStatus('请选择要监听的元素', false);

            const startCaptureBtn = document.getElementById('startCapture');
            if (startCaptureBtn) {
                startCaptureBtn.innerHTML = '<span>❌</span><span>取消选择</span>';
            }
        } catch (error) {
            alert('启动元素捕获失败: ' + error.message);
        }
    }

    async stopElementCapture() {
        try {
            this.isCapturing = false;

            await this.sendMessage('stopCapture');
            this.updateStatus('未开始监听', false);

            const startCaptureBtn = document.getElementById('startCapture');
            if (startCaptureBtn) {
                startCaptureBtn.innerHTML = '<span>🎯</span><span>选择元素</span>';
            }
        } catch (error) {
            // 忽略错误
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

            const response = await this.sendMessage('startWatching', {
                elementSelector,
                attribute
            });

            if (response && response.success) {
                this.isWatching = true;
                this.updateStatus(`正在监听: ${this.elementInfo.tagName}.${attribute}`, true);
                this.updateToggleButton(true);
            } else {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            this.updateStatus('启动监听失败', false);
            alert('启动监听失败: ' + error.message);
        }
    }

    async stopListening() {
        try {
            const response = await this.sendMessage('stopWatching');

            if (response && response.success) {
                this.isWatching = false;
                this.updateStatus('监听已停止', false);
                this.updateToggleButton(false);
            } else {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            alert('停止监听失败: ' + error.message);
        }
    }

    async clearLogs() {
        try {
            await this.sendMessage('clearLogs');
        } catch (error) {
            alert('清空日志失败: ' + error.message);
        }
    }

    async refreshConnection() {
        this.updateConnectionStatus(true);
        await this.loadInitialData();
    }

    handleElementSelected(elementInfo) {
        this.pendingElementInfo = elementInfo;
        this.showAttributeDialog();
    }

    handleWatcherAdded(watcherId, watcher) {
        this.watchers.set(watcherId, {
            ...watcher,
            elementInfo: null, // 会在状态更新时填充
            number: this.watchers.size + 1 // 分配编号
        });
        // 重新编号所有监听器以确保连续性
        this.renumberWatchers();
        this.updateWatcherList();
        this.updateLogFilter();
        this.updateStatus(`监听器已添加: ${watcher.name}`, false);
    }

    handleWatcherRemoved(watcherId) {
        this.watchers.delete(watcherId);
        this.renumberWatchers();
        this.updateWatcherList();
        this.updateLogFilter();
        this.updateStatus('监听器已移除', false);
    }

    handleWatchingStarted(watcherId, elementInfo) {
        const watcher = this.watchers.get(watcherId);
        if (watcher) {
            watcher.isWatching = true;
            watcher.elementInfo = elementInfo;
        }
        this.updateWatcherList();
        this.updateStatus(`正在监听: ${watcher?.name || '未知'}`, true);
    }

    handleWatchingStopped(watcherId) {
        const watcher = this.watchers.get(watcherId);
        if (watcher) {
            watcher.isWatching = false;
        }
        this.updateWatcherList();
        this.updateStatus('监听已停止', false);
    }

    handleNewLog(logEntry) {
        this.logs.unshift(logEntry);
        this.updateLogDisplay();
        this.updateLogCount();
    }

    handleLogsCleared() {
        this.logs = [];
        this.updateLogDisplay();
        this.updateLogCount();
    }

    handleStatusUpdate(status) {
        this.isConnected = status.connected;

        if (status.logs) {
            this.logs = status.logs;
        }

        // 更新监听器列表
        if (status.watchers) {
            this.watchers.clear();
            status.watchers.forEach((watcher, index) => {
                this.watchers.set(watcher.id, {
                    ...watcher,
                    number: index + 1
                });
            });
            this.updateWatcherList();
            this.updateLogFilter();
        }

        this.updateConnectionStatus(this.isConnected);
        this.updateLogDisplay();
        this.updateLogCount();
    }

    async loadInitialData() {
        try {
            let retryCount = 0;
            const maxRetries = 5;
            let response = null;

            while (retryCount < maxRetries && !response) {
                try {
                    response = await this.sendMessage('getStatus');
                    if (response) {
                        break;
                    }
                } catch (error) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

            if (!response) {
                this.updateConnectionStatus(false);
                return;
            }

            this.handleStatusUpdate(response);
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (statusIndicator) {
            if (connected) {
                statusIndicator.classList.add('connected');
            } else {
                statusIndicator.classList.remove('connected');
            }
        }

        if (statusText) {
            statusText.textContent = connected ? '已连接到页面' : '未连接到页面';
        }

        this.updateButtonStates();
    }

    updateStatus(text, isActive) {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');

        if (statusText) {
            statusText.textContent = text;
        }

        if (statusIndicator) {
            if (isActive) {
                statusIndicator.classList.add('connected');
            } else {
                statusIndicator.classList.remove('connected');
            }
        }
    }

    updateToggleButton(isListening) {
        const toggleBtn = document.getElementById('toggleListening');
        if (!toggleBtn) return;

        if (isListening) {
            toggleBtn.classList.remove('dom-watcher-btn-success');
            toggleBtn.classList.add('dom-watcher-btn-danger');
            toggleBtn.innerHTML = '<span>⏹️</span><span>停止监听</span>';
        } else {
            toggleBtn.classList.remove('dom-watcher-btn-danger');
            toggleBtn.classList.add('dom-watcher-btn-success');
            toggleBtn.innerHTML = '<span>▶️</span><span>开始监听</span>';
        }

        toggleBtn.disabled = !this.isConnected || !this.elementInfo;
    }

    updateButtonStates() {
        const startCaptureBtn = document.getElementById('startCapture');
        const toggleBtn = document.getElementById('toggleListening');

        if (startCaptureBtn) {
            startCaptureBtn.disabled = !this.isConnected || this.isWatching;
        }
        if (toggleBtn) {
            toggleBtn.disabled = !this.isConnected || !this.elementInfo;
        }
    }

    showElementInfo(elementInfo, selectedAttribute = null) {
        const elementInfoDiv = document.getElementById('elementInfo');
        const elementInfoContent = document.getElementById('elementInfoContent');

        if (!elementInfoDiv || !elementInfoContent) return;

        const attributes = Object.keys(elementInfo.attributes || {});
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
                    <select id="attributeSelect" class="dom-watcher-element-select">
                        ${attributeOptions}
                    </select>
                </div>
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
            logContent.innerHTML = `
                <div class="dom-watcher-empty-state">
                    <span class="dom-watcher-empty-icon">📭</span>
                    <span>暂无日志数据</span>
                </div>
            `;
            return;
        }

        // 应用筛选器
        let filteredLogs = this.logs;

        // 先按监听器筛选
        if (this.currentLogFilter !== 'all') {
            const watcherId = parseInt(this.currentLogFilter);
            filteredLogs = filteredLogs.filter(log => log.watcherId === watcherId);
        }

        // 再按搜索词筛选
        if (this.currentSearchTerm) {
            const lowerSearchTerm = this.currentSearchTerm.toLowerCase();
            filteredLogs = filteredLogs.filter(log => {
                const watcher = this.watchers.get(log.watcherId);
                const watcherNumber = watcher ? watcher.number : '';
                return (
                    log.elementInfo?.tagName?.toLowerCase().includes(lowerSearchTerm) ||
                    log.attribute?.toLowerCase().includes(lowerSearchTerm) ||
                    log.newValue?.toLowerCase().includes(lowerSearchTerm) ||
                    log.watcherName?.toLowerCase().includes(lowerSearchTerm) ||
                    watcherNumber.toString().includes(lowerSearchTerm) ||
                    log.timeString?.includes(this.currentSearchTerm)
                );
            });
        }

        if (filteredLogs.length === 0) {
            logContent.innerHTML = `
                <div class="dom-watcher-empty-state">
                    <span class="dom-watcher-empty-icon">🔍</span>
                    <span>没有匹配的日志</span>
                </div>
            `;
            return;
        }

        // 显示日志
        const logHtml = filteredLogs.slice(0, 50).map(log => {
            const selector = log.elementInfo?.cssSelector || '未知选择器';
            const value = log.newValue || '';
            const watcher = this.watchers.get(log.watcherId);
            const watcherNumber = watcher ? watcher.number : '?';
            const watcherName = log.watcherName || '未知监听器';

            return `
                <div class="dom-watcher-log-item ${this.currentSearchTerm ? 'highlight' : ''}">
                    <div class="dom-watcher-log-time">⏰ ${log.timeString}</div>
                    <div class="dom-watcher-log-info">
                        <span class="dom-watcher-log-selector">🎯 ${watcherNumber}# ${watcherName}</span>
                        <span class="dom-watcher-log-attr">🏷️ ${log.attribute}:</span>
                        <span class="dom-watcher-log-value">"${value}"</span>
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
        const range = document.querySelector('input[name="exportRange"]:checked')?.value || 'all';

        let logsToExport = this.logs;
        if (range === 'filtered' && this.currentSearchTerm) {
            const lowerSearchTerm = this.currentSearchTerm.toLowerCase();
            logsToExport = this.logs.filter(log => {
                return (
                    log.elementInfo?.cssSelector?.toLowerCase().includes(lowerSearchTerm) ||
                    log.attribute?.toLowerCase().includes(lowerSearchTerm) ||
                    log.newValue?.toLowerCase().includes(lowerSearchTerm) ||
                    log.timeString?.includes(this.currentSearchTerm)
                );
            });
        }

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
            const watcher = this.watchers.get(log.watcherId);
            const watcherNumber = watcher ? watcher.number : '?';
            const watcherName = log.watcherName || '未知监听器';
            return `${log.timeString} | ${watcherNumber}# ${watcherName} | ${log.attribute}: "${log.newValue}"`;
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
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 属性选择对话框
    showAttributeDialog() {
        if (!this.pendingElementInfo) return;

        const elementInfo = this.pendingElementInfo;
        const attributes = Object.keys(elementInfo.attributes || {});

        if (attributes.length === 0) {
            alert('该元素没有可监听的属性');
            return;
        }

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 2147483649;
            min-width: 300px;
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">添加监听器</h3>
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">元素: <strong>${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</strong></div>
                <div style="font-size: 12px; color: #666;">选择器: <code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${elementInfo.cssSelector}</code></div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">监听器名称:</label>
                <input type="text" id="watcherNameInput" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="例如: 登录按钮" value="">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">选择属性:</label>
                <select id="attributeSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    ${attributes.map(attr => `<option value="${attr}">${attr} = "${elementInfo.attributes[attr]}"</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelAddBtn" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">取消</button>
                <button id="confirmAddBtn" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">添加</button>
            </div>
        `;

        document.body.appendChild(dialog);

        // 自动聚焦名称输入框
        const nameInput = dialog.querySelector('#watcherNameInput');
        if (nameInput) {
            const defaultName = `${elementInfo.tagName}_${attributes[0]}`;
            nameInput.value = defaultName;
            nameInput.focus();
            nameInput.select();
        }

        // 绑定事件
        dialog.querySelector('#cancelAddBtn').addEventListener('click', () => {
            document.body.removeChild(dialog);
            this.pendingElementInfo = null;
        });

        dialog.querySelector('#confirmAddBtn').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const attribute = dialog.querySelector('#attributeSelect').value;

            if (!name) {
                alert('请输入监听器名称');
                return;
            }

            this.addWatcher(elementInfo.cssSelector, attribute, name);
            document.body.removeChild(dialog);
            this.pendingElementInfo = null;
        });

        // ESC键关闭
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                this.pendingElementInfo = null;
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // 添加监听器
    async addWatcher(selector, attribute, name) {
        try {
            const response = await this.sendMessage('addWatcher', {
                elementSelector: selector,
                attribute: attribute,
                name: name
            });

            if (response && response.success) {
                // 监听器添加成功
            } else {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            alert('添加监听器失败: ' + error.message);
        }
    }

    // 重新为所有监听器编号
    renumberWatchers() {
        let number = 1;
        this.watchers.forEach((watcher, id) => {
            watcher.number = number++;
        });
    }

    // 更新监听列表显示
    updateWatcherList() {
        const listContainer = document.getElementById('watcherList');
        const listCount = document.getElementById('listCount');

        if (!listContainer) return;

        // 更新计数
        if (listCount) {
            listCount.textContent = `(${this.watchers.size})`;
        }

        if (this.watchers.size === 0) {
            listContainer.innerHTML = `
                <div class="dom-watcher-empty-list">
                    <div class="dom-watcher-empty-icon">🎯</div>
                    <div class="dom-watcher-empty-text">暂无监听对象</div>
                    <button id="firstAddBtn" class="dom-watcher-btn dom-watcher-btn-primary">
                        <span>➕</span>
                        <span>添加第一个监听对象</span>
                    </button>
                </div>
            `;

            // 重新绑定事件
            const firstAddBtn = document.getElementById('firstAddBtn');
            if (firstAddBtn) {
                firstAddBtn.addEventListener('click', () => {
                    this.startElementCapture();
                });
            }
            return;
        }

        const listHtml = Array.from(this.watchers.entries()).map(([id, watcher]) => {
            const watcherNumber = watcher.number || Array.from(this.watchers.keys()).indexOf(id) + 1;
            return `
                <div class="dom-watcher-item ${watcher.isWatching ? 'active' : ''}" data-watcher-id="${id}">
                    <div class="dom-watcher-item-header">
                        <div class="dom-watcher-item-info">
                            <span class="dom-watcher-item-icon">🎯</span>
                            <span class="dom-watcher-item-number">${watcherNumber}#</span>
                            <span class="dom-watcher-item-name">${watcher.name}</span>
                            <button class="dom-watcher-item-btn delete" title="删除监听器" style="margin-left: 6px;">
                                ❌
                            </button>
                            <span class="dom-watcher-item-status ${watcher.isWatching ? 'watching' : ''}"></span>
                        </div>
                    </div>
                    <div class="dom-watcher-item-details">
                        <div class="dom-watcher-item-selector">${watcher.selector}</div>
                        <div class="dom-watcher-item-attribute">监听属性: ${watcher.attribute}</div>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = listHtml;

        // 绑定监听器项目事件
        this.bindWatcherItemEvents();
    }

    // 绑定监听器项目事件
    bindWatcherItemEvents() {
        document.querySelectorAll('.dom-watcher-item').forEach(item => {
            const watcherId = parseInt(item.dataset.watcherId);
            const deleteBtn = item.querySelector('.delete');

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.removeWatcher(watcherId);
                });
            }
        });
    }

    
    // 移除监听器
    async removeWatcher(watcherId) {
        if (!confirm('确定要删除这个监听器吗？')) {
            return;
        }

        try {
            const response = await this.sendMessage('removeWatcher', { watcherId });
            if (!response || !response.success) {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            alert('移除监听器失败: ' + error.message);
        }
    }

    // 更新日志筛选器
    updateLogFilter() {
        const filterSelect = document.getElementById('logFilterSelect');
        if (!filterSelect) return;

        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">全部日志</option>';

        // 添加监听器选项
        this.watchers.forEach((watcher, id) => {
            const option = document.createElement('option');
            option.value = id.toString();
            const watcherNumber = watcher.number || '?';
            option.textContent = `${watcherNumber}# ${watcher.name}`;
            filterSelect.appendChild(option);
        });

        // 恢复之前的选择（如果还存在）
        if (currentValue && (currentValue === 'all' || this.watchers.has(parseInt(currentValue)))) {
            filterSelect.value = currentValue;
        }
    }
}

// 确保脚本执行后立即初始化
function initializeFloatingPanel() {
    try {
        // 只有当面板不存在时才初始化
        if (!document.getElementById('domWatcherPanel')) {
            new FloatingPanelController();
        }
    } catch (error) {
        // 初始化失败，静默处理
    }
}

// 多种时机尝试初始化
if (document.readyState === 'loading') {
    // DOM还在加载中
    document.addEventListener('DOMContentLoaded', initializeFloatingPanel);
} else if (document.readyState === 'interactive') {
    // DOM加载完成，但资源可能还在加载
    setTimeout(initializeFloatingPanel, 100);
} else {
    // 页面完全加载完成
    setTimeout(initializeFloatingPanel, 0);
}

// 额外保险：确保最终能初始化
setTimeout(initializeFloatingPanel, 1000);