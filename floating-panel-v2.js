// DOM监听器浮层面板 - 简化版本 v2.0
console.log('=== DOM监听器浮层面板 v2.0 开始加载 ===');

class SimpleFloatingPanel {
    constructor() {
        this.watchers = new Map();
        this.logs = [];
        this.isPanelVisible = false;
        this.watcherIdCounter = 1;
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
                <div style="background: #667eea; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold;">DOM监听器 v2.0</span>
                    <button id="closePanelBtn" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
                </div>

                <!-- 面板内容 -->
                <div style="background: white; padding: 20px; max-height: 500px; overflow-y: auto;">
                    <!-- 添加按钮 -->
                    <button id="addWatcherBtn" style="background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin-bottom: 15px;">
                        ➕ 添加监听器
                    </button>

                    <!-- 监听器列表 -->
                    <div id="watcherList" style="margin-bottom: 20px;">
                        <div style="text-align: center; color: #666; padding: 20px;">
                            暂无监听器
                        </div>
                    </div>

                    <!-- 日志区域 -->
                    <div>
                        <h4 style="margin: 0 0 10px 0;">监听日志</h4>
                        <div id="logContent" style="border: 1px solid #ddd; padding: 10px; height: 200px; overflow-y: auto; background: #f9f9f9;">
                            <div style="text-align: center; color: #666;">暂无日志</div>
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
                width: 400px;
                max-width: 90vw;
                background: white;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 2147483646;
                font-family: Arial, sans-serif;
            }

            .watcher-item {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 5px;
                padding: 10px;
                margin-bottom: 10px;
            }
            .watcher-item.active {
                background: #e3f2fd;
                border-color: #2196f3;
            }
            .watcher-name {
                font-weight: bold;
                margin-bottom: 5px;
            }
            .watcher-info {
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
            }
            .watcher-actions {
                display: flex;
                gap: 5px;
            }
            .watcher-actions button {
                padding: 3px 8px;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }

            .log-item {
                padding: 5px;
                border-bottom: 1px solid #eee;
                font-size: 12px;
            }
            .log-time {
                color: #666;
                margin-bottom: 2px;
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
                this.togglePanel();
            });
        }

        // 关闭按钮
        const closeBtn = document.getElementById('closePanelBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePanel();
            });
        }

        // 添加监听器按钮
        const addBtn = document.getElementById('addWatcherBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.startElementSelection();
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

    startElementSelection() {
        this.showNotification('请点击要监听的元素，按ESC取消选择');

        const overlay = document.createElement('div');
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

        // 保存当前高亮元素的引用
        let currentHighlight = null;

        // 清理高亮的函数
        const clearHighlight = () => {
            if (currentHighlight && currentHighlight.style) {
                currentHighlight.style.outline = '';
                currentHighlight.style.outlineOffset = '';
                currentHighlight = null;
            }
        };

        const mouseMoveHandler = (e) => {
            // 清理之前的高亮
            clearHighlight();

            let element = document.elementFromPoint(e.clientX, e.clientY);
            if (element === overlay || !element) return;

            // 临时隐藏overlay
            overlay.style.display = 'none';
            element = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.display = 'block';

            if (element && element !== document.body && element !== document.documentElement) {
                currentHighlight = element;
                element.style.outline = '2px solid #2196F3';
                element.style.outlineOffset = '2px';
            }
        };

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            let element = document.elementFromPoint(e.clientX, e.clientY);

            overlay.style.display = 'none';
            element = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.display = 'block';

            if (element && element !== overlay) {
                this.selectElement(element);
            }

            // 清理高亮
            clearHighlight();
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('click', clickHandler, true);
            document.removeEventListener('keydown', keyHandler);
            document.body.removeChild(overlay);
        };

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                clearHighlight();
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('click', clickHandler, true);
                document.removeEventListener('keydown', keyHandler);
                document.body.removeChild(overlay);
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('click', clickHandler, true);
        document.addEventListener('keydown', keyHandler);
    }

    selectElement(element) {
        // 清理所有边框样式
        this.clearAllHighlights();

        const elementInfo = {
            tagName: element.tagName.toLowerCase(),
            cssSelector: this.generateSelector(element),
            attributes: {}
        };

        // 获取属性
        for (let attr of element.attributes) {
            elementInfo.attributes[attr.name] = attr.value;
        }

        console.log('选择元素:', elementInfo);
        this.showAddDialog(elementInfo);
    }

    clearAllHighlights() {
        // 移除所有元素的边框
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.style.outline && el.style.outline.includes('2196F3')) {
                el.style.outline = '';
                el.style.outlineOffset = '';
            }
        });
    }

    generateSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        const path = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.className) {
                selector += '.' + current.className.trim().split(/\s+/)[0];
            }

            path.unshift(selector);
            current = current.parentNode;

            if (path.length > 3) break;
        }

        return path.join(' > ');
    }

    showAddDialog(elementInfo) {
        const attributes = Object.keys(elementInfo.attributes);

        if (attributes.length === 0) {
            this.showNotification('该元素没有可监听的属性', 'error');
            return;
        }

        // 显示属性选择界面
        this.showAttributeSelector(elementInfo);
    }

    showAttributeSelector(elementInfo) {
        const attributes = Object.keys(elementInfo.attributes);

        // 创建属性选择对话框
        const dialog = document.createElement('div');
        dialog.id = 'attributeSelectorDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 2147483647;
            font-family: Arial, sans-serif;
            max-width: 400px;
            width: 90%;
            max-height: 70vh;
            overflow-y: auto;
        `;

        dialog.innerHTML = `
            <div style="padding: 20px;">
                <div style="margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">选择监听属性</h3>
                    <p style="margin: 5px 0; color: #666; font-size: 12px;">
                        元素: ${elementInfo.cssSelector}
                    </p>
                </div>
                <div id="attributeList">
                    ${attributes.map(attr => `
                        <div class="attribute-option" data-attribute="${attr}" style="
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            padding: 10px;
                            margin-bottom: 8px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">
                            <div style="font-weight: bold; color: #333;">${attr}</div>
                            <div style="color: #666; font-size: 12px; margin-top: 4px;">
                                当前值: "${elementInfo.attributes[attr]}"
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelSelection" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">取消</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .attribute-option:hover {
                background: #f8f9fa;
                border-color: #007bff !important;
            }
            .attribute-option.selected {
                background: #e3f2fd;
                border-color: #2196F3 !important;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(dialog);

        // 绑定事件
        const attributeOptions = dialog.querySelectorAll('.attribute-option');
        let selectedAttribute = null;

        attributeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // 移除之前的选中状态
                attributeOptions.forEach(opt => opt.classList.remove('selected'));
                // 添加选中状态
                option.classList.add('selected');
                selectedAttribute = option.dataset.attribute;

                // 自动添加监听器
                const name = `${elementInfo.tagName}_${selectedAttribute}`;
                this.addWatcher(elementInfo.cssSelector, selectedAttribute, name);

                // 关闭对话框
                document.body.removeChild(dialog);
            });
        });

        // 取消按钮
        document.getElementById('cancelSelection').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        // 点击外部取消
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }

    async addWatcher(selector, attribute, name) {
        try {
            console.log('添加监听器:', { selector, attribute, name });

            const response = await this.sendMessage('addWatcher', {
                elementSelector: selector,
                attribute: attribute,
                name: name
            });

            if (response && response.success) {
                this.watchers.set(response.watcherId, {
                    id: response.watcherId,
                    name: name,
                    selector: selector,
                    attribute: attribute,
                    isWatching: true
                });
                this.updateWatcherList();
                this.showNotification(`监听器 "${name}" 添加成功！`, 'success');
            } else {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            console.error('添加监听器失败:', error);
            this.showNotification('添加监听器失败: ' + error.message, 'error');
        }
    }

    updateWatcherList() {
        const listContainer = document.getElementById('watcherList');
        if (!listContainer) return;

        if (this.watchers.size === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无监听器</div>';
            return;
        }

        const html = Array.from(this.watchers.values()).map(watcher => `
            <div class="watcher-item ${watcher.isWatching ? 'active' : ''}">
                <div class="watcher-name">${watcher.name}</div>
                <div class="watcher-info">选择器: ${watcher.selector}</div>
                <div class="watcher-info">属性: ${watcher.attribute}</div>
                <div class="watcher-actions">
                    <button onclick="window.simplePanel.removeWatcher(${watcher.id})" style="background: #dc3545; color: white;">删除</button>
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = html;
    }

    async removeWatcher(watcherId) {
        // 直接删除，不需要确认
        try {
            const response = await this.sendMessage('removeWatcher', { watcherId });
            if (response && response.success) {
                this.watchers.delete(watcherId);
                this.updateWatcherList();
            }
        } catch (error) {
            console.error('删除监听器失败:', error);
            this.showNotification('删除监听器失败: ' + error.message, 'error');
        }
    }

    addLog(logEntry) {
        this.logs.unshift(logEntry);
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }
        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const logContent = document.getElementById('logContent');
        if (!logContent) return;

        if (this.logs.length === 0) {
            logContent.innerHTML = '<div style="text-align: center; color: #666;">暂无日志</div>';
            return;
        }

        const html = this.logs.slice(0, 50).map(log => `
            <div class="log-item">
                <div class="log-time">${log.timeString}</div>
                <div><strong>${log.watcherName || '未知'}</strong> - ${log.attribute}: "${log.newValue}"</div>
            </div>
        `).join('');

        logContent.innerHTML = html;
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 2147483647;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        if (!document.querySelector('style[data-notifications]')) {
            style.setAttribute('data-notifications', 'true');
            document.head.appendChild(style);
        }

        // 添加到页面
        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async sendMessage(action, data = {}) {
        return new Promise((resolve, reject) => {
            const messageId = Date.now() + Math.random();

            window.postMessage({
                type: 'DOM_WATCHER_MESSAGE_TO_CONTENT',
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

console.log('=== DOM监听器浮层面板 v2.0 加载完成 ===');