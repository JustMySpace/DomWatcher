// DOM监听器浮层面板 - 简化版本 v2.0
console.log('=== DOM监听器浮层面板简化版开始加载 ===');

class SimpleFloatingPanel {
    constructor() {
        this.watchers = new Map();
        this.logs = [];
        this.isPanelVisible = false;
        this.watcherIdCounter = 1;
        this.pendingElement = null;
        this.init();
    }

    init() {
        console.log('初始化简化浮层面板');
        this.createUI();
        this.bindEvents();
        this.loadInitialData();
        console.log('简化浮层面板初始化完成');
    }

    createUI() {
        // 检查是否已存在
        if (document.getElementById('domWatcherTrigger')) {
            console.log('浮层UI已存在');
            return;
        }

        console.log('创建浮层UI');

        // 创建容器
        const container = document.createElement('div');
        container.id = 'domWatcherContainer';
        container.innerHTML = `
            <!-- 触发按钮 -->
            <button id="domWatcherTrigger" title="DOM监听器">
                🔍
            </button>

            <!-- 浮层面板 -->
            <div id="domWatcherPanel" style="display: none;">
                <!-- 面板头部 -->
                <div id="panelHeader" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-size: 16px;">DOM监听器 v2.0</span>
                    <button id="closePanelBtn" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; font-size: 16px; width: 24px; height: 24px; border-radius: 50%;">×</button>
                </div>

                <!-- 面板内容 -->
                <div id="panelContent">
                    <!-- 控制区域 -->
                    <div style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #dee2e6;">
                        <button id="selectElementBtn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                            🎯 选择元素
                        </button>
                        <button id="clearLogsBtn" style="background: #ffc107; color: #212529; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                            🗑️ 清空日志
                        </button>
                    </div>

                    <!-- 元素信息显示区域 -->
                    <div id="elementInfo" style="background: #e9ecef; padding: 15px; border-bottom: 1px solid #dee2e6; display: none;">
                        <div style="font-weight: bold; margin-bottom: 10px;">📍 已选择元素</div>
                        <div id="elementInfoContent"></div>
                        <div style="margin-top: 10px;">
                            <button id="addWatcherBtn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                                ➕ 添加监听器
                            </button>
                        </div>
                    </div>

                    <!-- 主要内容区域 - 上下分栏 -->
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <!-- 上半部分：监听器列表 -->
                        <div style="flex: 1; border-bottom: 1px solid #dee2e6; display: flex; flex-direction: column; min-height: 0;">
                            <div style="background: white; padding: 15px; border-bottom: 1px solid #dee2e6; font-weight: bold; flex-shrink: 0;">
                                🎯 监听器列表
                                <span id="watcherCount" style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 10px;">(0)</span>
                            </div>
                            <div id="watcherList" style="padding: 15px; overflow-y: auto; flex: 1; min-height: 0;">
                                <div style="text-align: center; color: #6c757d; padding: 30px;">
                                    <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
                                    <div>暂无监听器</div>
                                    <div style="font-size: 12px; margin-top: 5px;">点击"选择元素"开始添加</div>
                                </div>
                            </div>
                        </div>

                        <!-- 下半部分：日志显示 -->
                        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">
                            <div style="background: white; padding: 15px; border-bottom: 1px solid #dee2e6; font-weight: bold; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                                📋 监听日志
                                <span id="logCount" style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">(0)</span>
                            </div>
                            <div id="logContent" style="padding: 15px; overflow-y: auto; flex: 1; min-height: 0;">
                                <div style="text-align: center; color: #6c757d; padding: 30px;">
                                    <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                                    <div>暂无日志数据</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #domWatcherTrigger {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                z-index: 2147483647;
                font-size: 20px;
                color: white;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
            }
            #domWatcherTrigger:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
            }
            #domWatcherTrigger.active {
                background: linear-gradient(135deg, #f093fb, #f5576c);
            }

            #domWatcherPanel {
                position: fixed;
                top: 80px;
                right: 20px;
                width: calc(100vw - 40px);
                max-width: 600px;
                height: calc(100vh - 120px);
                background: white;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 2147483646;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                font-size: 14px;
                display: flex;
                flex-direction: column;
            }

            .watcher-item {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                transition: all 0.2s;
            }
            .watcher-item:hover {
                background: #e9ecef;
            }
            .watcher-item.active {
                background: #d4edda;
                border-color: #28a745;
            }
            .watcher-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .watcher-name {
                font-weight: bold;
                color: #495057;
            }
            .watcher-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #dc3545;
                margin-left: 8px;
            }
            .watcher-status.active {
                background: #28a745;
                box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.3);
            }
            .watcher-info {
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 4px;
                word-break: break-all;
            }
            .watcher-actions {
                display: flex;
                gap: 5px;
                margin-top: 10px;
            }
            .watcher-actions button {
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            .watcher-toggle {
                background: #007bff;
                color: white;
            }
            .watcher-toggle:hover {
                background: #0056b3;
            }
            .watcher-toggle.stop {
                background: #dc3545;
            }
            .watcher-toggle.stop:hover {
                background: #c82333;
            }
            .watcher-delete {
                background: #6c757d;
                color: white;
            }
            .watcher-delete:hover {
                background: #545b62;
            }

            .log-item {
                padding: 10px;
                border-bottom: 1px solid #f8f9fa;
                transition: all 0.2s;
            }
            .log-item:hover {
                background: #f8f9fa;
            }
            .log-time {
                color: #6c757d;
                font-size: 12px;
                margin-bottom: 4px;
            }
            .log-content {
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }
            .log-watcher {
                background: #007bff;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: bold;
                flex-shrink: 0;
            }
            .log-attr {
                color: #007bff;
                font-weight: 500;
                margin-right: 4px;
            }
            .log-value {
                color: #28a745;
                word-break: break-all;
            }

            select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                background: white;
                font-size: 14px;
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);

        // 添加到页面
        document.body.appendChild(container);
        console.log('浮层UI创建完成');
    }

    bindEvents() {
        console.log('绑定事件');

        // 触发按钮
        const triggerBtn = document.getElementById('domWatcherTrigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => {
                this.showPanel();
            });
        }

        // 关闭按钮
        const closeBtn = document.getElementById('closePanelBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePanel();
            });
        }

        // 选择元素按钮
        const selectBtn = document.getElementById('selectElementBtn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                this.startElementCapture();
            });
        }

        // 添加监听器按钮
        const addBtn = document.getElementById('addWatcherBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addCurrentElementWatcher();
            });
        }

        // 清空日志按钮
        const clearBtn = document.getElementById('clearLogsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearLogs();
            });
        }

        console.log('事件绑定完成');
    }

    togglePanel() {
        const panel = document.getElementById('domWatcherPanel');
        const trigger = document.getElementById('domWatcherTrigger');

        if (panel.style.display === 'none') {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }

    showPanel() {
        const panel = document.getElementById('domWatcherPanel');
        const trigger = document.getElementById('domWatcherTrigger');

        if (panel) {
            panel.style.display = 'block';
            // 确保内容区域也是展开的
            const content = document.getElementById('panelContent');
            if (content) {
                content.style.display = 'block';
            }
            trigger?.classList.add('active');
            this.isPanelVisible = true;
        }
    }

    hidePanel() {
        const panel = document.getElementById('domWatcherPanel');
        const trigger = document.getElementById('domWatcherTrigger');

        if (panel) {
            panel.style.display = 'none';
            trigger?.classList.remove('active');
            this.isPanelVisible = false;
        }
    }

    startElementCapture() {
        if (this.isCapturing) {
            this.stopElementCapture();
            return;
        }

        this.isCapturing = true;
        document.body.style.cursor = 'crosshair';

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'dom-watcher-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);

        const mouseMoveHandler = (e) => {
            if (!this.isCapturing) return;

            // 移除之前的高亮
            if (this.highlightElement) {
                this.highlightElement.style.outline = '';
                this.highlightElement.style.outlineOffset = '';
            }

            let element = document.elementFromPoint(e.clientX, e.clientY);

            // 忽略overlay
            if (element === overlay || !element) return;

            // 临时隐藏overlay
            overlay.style.display = 'none';
            element = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.display = 'block';

            if (element) {
                this.highlightElement = element;
                element.style.outline = '2px solid #2196F3';
                element.style.outlineOffset = '2px';
            }
        };

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!this.isCapturing) return;

            let element = document.elementFromPoint(e.clientX, e.clientY);

            // 临时隐藏overlay
            overlay.style.display = 'none';
            element = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.display = 'block';

            if (element && element !== overlay) {
                this.selectElement(element);
            }

            this.stopElementCapture();
        };

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.stopElementCapture();
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keyHandler);

        this.captureHandlers = { mouseMoveHandler, clickHandler, keyHandler };
    }

    stopElementCapture() {
        this.isCapturing = false;
        document.body.style.cursor = '';

        // 移除高亮 - 确保清理所有可能的高亮元素
        if (this.highlightElement) {
            this.highlightElement.style.outline = '';
            this.highlightElement.style.outlineOffset = '';
            this.highlightElement = null;
        }

        // 额外清理：移除页面上所有可能的outline样式
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.style.outline && el.style.outline.includes('2196F3')) {
                el.style.outline = '';
                el.style.outlineOffset = '';
            }
        });

        // 移除遮罩层
        const overlay = document.getElementById('dom-watcher-overlay');
        if (overlay) overlay.remove();

        // 移除事件监听器
        if (this.captureHandlers) {
            document.removeEventListener('mousemove', this.captureHandlers.mouseMoveHandler);
            document.removeEventListener('click', this.captureHandlers.clickHandler, true);
            document.removeEventListener('keydown', this.captureHandlers.keyHandler);
            this.captureHandlers = null;
        }

        // 更新按钮文字
        const selectBtn = document.getElementById('selectElementBtn');
        if (selectBtn) {
            selectBtn.innerHTML = '🎯 选择元素';
        }
    }

    selectElement(element) {
        const elementInfo = this.getElementInfo(element);
        console.log('元素已选择:', elementInfo);

        this.pendingElement = elementInfo;
        this.showElementInfo(elementInfo);
    }

    showElementInfo(elementInfo) {
        const elementInfoDiv = document.getElementById('elementInfo');
        const elementInfoContent = document.getElementById('elementInfoContent');

        if (!elementInfoDiv || !elementInfoContent) return;

        const attributes = Object.keys(elementInfo.attributes || {});
        if (attributes.length === 0) {
            elementInfoContent.innerHTML = `
                <div><strong>元素:</strong> ${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</div>
                <div style="margin-top: 4px; color: #6c757d; font-size: 12px;">该元素没有可监听的属性</div>
            `;
        } else {
            const attributeOptions = attributes.map(attr =>
                `<option value="${attr}">${attr} = "${elementInfo.attributes[attr]}"</option>`
            ).join('');

            elementInfoContent.innerHTML = `
                <div><strong>元素:</strong> ${elementInfo.tagName}${elementInfo.id}${elementInfo.classes}</div>
                <div style="margin-top: 8px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">选择属性:</label>
                    <select id="attributeSelect">${attributeOptions}</select>
                </div>
            `;
        }

        elementInfoDiv.style.display = 'block';
    }

    getElementInfo(element) {
        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';

        // 获取所有属性
        const attributes = {};
        for (let attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }

        // 如果没有传统属性，添加内容属性
        if (Object.keys(attributes).length === 0) {
            if (element.textContent) {
                attributes['textContent'] = element.textContent.substring(0, 100);
            }
        }

        return {
            tagName,
            id,
            classes,
            attributes,
            cssSelector: this.generateSimpleSelector(element)
        };
    }

    generateSimpleSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        let selector = element.tagName.toLowerCase();
        if (element.className) {
            const firstClass = element.className.split(' ')[0];
            selector += `.${firstClass}`;
        }

        return selector;
    }

    async addCurrentElementWatcher() {
        if (!this.pendingElement) {
            return;
        }

        const attributeSelect = document.getElementById('attributeSelect');
        if (!attributeSelect) {
            return;
        }

        const attribute = attributeSelect.value;
        const selector = this.pendingElement.cssSelector;

        // 自动生成监听器名称
        const watcherName = `${this.pendingElement.tagName}_${attribute}`;

        try {
            const response = await this.sendMessage('addWatcher', {
                elementSelector: selector,
                attribute: attribute,
                name: watcherName
            });

            if (response && response.success) {
                // 静默添加成功，不显示alert
                this.hideElementInfo();
            } else {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            console.error('添加监听器失败:', error);
            // 只在出错时显示错误
            alert('添加监听器失败: ' + error.message);
        }
    }

    hideElementInfo() {
        const elementInfoDiv = document.getElementById('elementInfo');
        if (elementInfoDiv) {
            elementInfoDiv.style.display = 'none';
        }
        this.pendingElement = null;
    }

    updateWatcherList() {
        const listContainer = document.getElementById('watcherList');
        const countElement = document.getElementById('watcherCount');

        if (!listContainer) return;

        // 更新计数
        if (countElement) {
            countElement.textContent = `(${this.watchers.size})`;
        }

        if (this.watchers.size === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: #6c757d; padding: 30px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
                    <div>暂无监听器</div>
                    <div style="font-size: 12px; margin-top: 5px;">点击"选择元素"开始添加</div>
                </div>
            `;
            return;
        }

        const html = Array.from(this.watchers.values()).map(watcher => `
            <div class="watcher-item ${watcher.isWatching ? 'active' : ''}" data-watcher-id="${watcher.id}">
                <div class="watcher-item-header">
                    <div style="display: flex; align-items: center;">
                        <span class="watcher-name">${watcher.name}</span>
                        <span class="watcher-status ${watcher.isWatching ? 'active' : ''}"></span>
                    </div>
                </div>
                <div class="watcher-info">${watcher.selector}</div>
                <div class="watcher-info">监听属性: ${watcher.attribute}</div>
                <div class="watcher-actions">
                    <button class="watcher-toggle ${watcher.isWatching ? 'stop' : ''}" data-watcher-id="${watcher.id}" data-action="toggle">
                        ${watcher.isWatching ? '⏸️ 停止' : '▶️ 开始'}
                    </button>
                    <button class="watcher-delete" data-watcher-id="${watcher.id}" data-action="delete">
                        ❌ 删除
                    </button>
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = html;

        // 绑定监听器项目事件
        this.bindWatcherEvents();
    }

    // 绑定监听器项目事件
    bindWatcherEvents() {
        document.querySelectorAll('.watcher-item button').forEach(button => {
            const watcherId = parseInt(button.dataset.watcherId);
            const action = button.dataset.action;

            button.addEventListener('click', (e) => {
                e.stopPropagation();

                if (action === 'toggle') {
                    this.toggleWatcher(watcherId);
                } else if (action === 'delete') {
                    this.removeWatcher(watcherId);
                }
            });
        });
    }

    async toggleWatcher(watcherId) {
        try {
            const response = await this.sendMessage('toggleWatcher', { watcherId });
            if (response && response.success) {
                const watcher = this.watchers.get(watcherId);
                if (watcher) {
                    watcher.isWatching = !watcher.isWatching;
                    this.updateWatcherList();
                }
            }
        } catch (error) {
            console.error('切换监听器失败:', error);
            alert('操作失败: ' + error.message);
        }
    }

    async removeWatcher(watcherId) {
        try {
            const response = await this.sendMessage('removeWatcher', { watcherId });
            if (response && response.success) {
                this.watchers.delete(watcherId);
                this.updateWatcherList();
            }
        } catch (error) {
            console.error('删除监听器失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    updateLogDisplay() {
        const logContent = document.getElementById('logContent');
        const logCount = document.getElementById('logCount');

        if (!logContent) return;

        // 更新计数
        if (logCount) {
            logCount.textContent = `(${this.logs.length})`;
        }

        if (this.logs.length === 0) {
            logContent.innerHTML = `
                <div style="text-align: center; color: #6c757d; padding: 30px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                    <div>暂无日志数据</div>
                </div>
            `;
            return;
        }

        const html = this.logs.slice(0, 100).map(log => `
            <div class="log-item">
                <div class="log-time">⏰ ${log.timeString}</div>
                <div class="log-content">
                    <span class="log-watcher">${log.watcherName || '未知'}</span>
                    <span class="log-attr">${log.attribute}:</span>
                    <span class="log-value">"${log.newValue}"</span>
                </div>
            </div>
        `).join('');

        logContent.innerHTML = html;
    }

    async clearLogs() {
        try {
            const response = await this.sendMessage('clearLogs');
            if (response && response.success) {
                this.logs = [];
                this.updateLogDisplay();
            }
        } catch (error) {
            console.error('清空日志失败:', error);
            alert('清空失败: ' + error.message);
        }
    }

    addLog(logEntry) {
        this.logs.unshift(logEntry);
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }
        this.updateLogDisplay();
    }

    async sendMessage(action, data = {}) {
        return new Promise((resolve, reject) => {
            const messageId = Date.now() + Math.random();

            window.postMessage({
                type: 'DOM_WATCHER_MESSAGE',
                data: { id: messageId, action, ...data }
            }, '*');

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

            setTimeout(() => {
                window.removeEventListener('message', responseHandler);
                reject(new Error('消息超时'));
            }, 5000);
        });
    }

    handleMessage(message) {
        console.log('收到消息:', message);

        switch (message.action) {
            case 'newLog':
                this.addLog(message.logEntry);
                break;
            case 'watcherAdded':
                this.updateWatcherList();
                break;
            case 'watcherRemoved':
                this.updateWatcherList();
                break;
            case 'logsCleared':
                this.logs = [];
                this.updateLogDisplay();
                break;
        }
    }

    async loadInitialData() {
        try {
            const response = await this.sendMessage('getStatus');
            if (response && response.watchers) {
                response.watchers.forEach(watcher => {
                    this.watchers.set(watcher.id, watcher);
                });
                this.updateWatcherList();
            }
            if (response && response.logs) {
                this.logs = response.logs;
                this.updateLogDisplay();
            }
        } catch (error) {
            console.warn('加载初始数据失败:', error);
        }
    }
}

// 初始化
function initSimplePanel() {
    console.log('初始化简化面板');

    // 避免重复初始化
    if (window.simplePanel) {
        console.log('面板已存在');
        return;
    }

    window.simplePanel = new SimpleFloatingPanel();

    // 监听来自content script的消息
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        const message = event.data;
        if (message && message.type === 'DOM_WATCHER_MESSAGE' && window.simplePanel) {
            window.simplePanel.handleMessage(message.data);
        }
    });
}

// 多时机初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimplePanel);
} else {
    initSimplePanel();
}

// 额外保险
setTimeout(initSimplePanel, 1000);

console.log('=== DOM监听器浮层面板简化版加载完成 ===');