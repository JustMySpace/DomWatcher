// DOM监听器浮层面板 - 简化版本 v2.0

class SimpleFloatingPanel {
    constructor() {
        this.watchers = new Map();
        this.logs = [];
        this.isPanelVisible = false;
        this.watcherIdCounter = 1;
        this.isPaused = false; // 暂停状态
        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
        this.loadInitialData();
    }

    createUI() {
        // 检查是否已存在
        if (document.getElementById('domWatcherTrigger')) {
            return;
        }

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
                <div style="background: #667eea; color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold;">DOM监听器 v2.3.1</span>
                    <button id="closePanelBtn" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
                </div>

                <!-- 面板内容 - 使用flex布局撑满高度 -->
                <div style="display: flex; flex-direction: column; height: calc(100vh - 120px); max-height: calc(100vh - 120px);">

                    <!-- 主要内容区域 - 监听器占1/3，日志占2/3 -->
                    <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">

                        <!-- 监听器区域 - 占1/3高度 -->
                        <div style="display: flex; flex-direction: column; flex: 1; border-bottom: 1px solid #e0e0e0; min-height: 0;">
                            <!-- 监听器工具栏 -->
                            <div style="background: #f8f9fa; padding: 8px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;">
                                <span style="font-weight: bold; color: #333; margin-right: 8px; font-size: 13px;">🎯 监听器</span>
                                <span id="watcherCount" style="background: #6c757d; color: white; padding: 3px 7px; border-radius: 10px; font-size: 11px; margin-right: 8px;">(0)</span>
                                <button id="addWatcherBtn" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    ➕ 添加
                                </button>
                                <button id="clearWatchersBtn" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    🗑️ 清空
                                </button>
                            </div>
                            <!-- 监听器列表 -->
                            <div id="watcherList" style="flex: 1; overflow-y: auto; background: white; min-height: 0;">
                                <div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">
                                    🎯 暂无监听器
                                </div>
                            </div>
                        </div>

                        <!-- 日志区域 - 占2/3高度 -->
                        <div style="display: flex; flex-direction: column; flex: 2; min-height: 0;">
                            <!-- 日志工具栏 -->
                            <div style="background: #f8f9fa; padding: 8px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;">
                                <span style="font-weight: bold; color: #333; margin-right: 8px; font-size: 13px;">📋 监听日志</span>
                                <span id="logCount" style="background: #6c757d; color: white; padding: 3px 7px; border-radius: 10px; font-size: 11px; margin-right: 8px;">(0)</span>
                                <button id="clearLogsBtn" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    🗑️ 清空
                                </button>
                                <button id="exportLogsBtn" style="background: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    📥 导出
                                </button>
                            </div>
                            <!-- 日志内容 -->
                            <div id="logContent" style="flex: 1; overflow-y: auto; background: #f9f9f9; padding: 8px; min-height: 0;">
                                <div style="text-align: center; color: #666; font-size: 12px;">📋 暂无日志</div>
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
                top: 20px;
                right: 20px;
                bottom: 20px;
                width: 450px;
                max-width: 90vw;
                background: white;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 2147483646;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
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

            /* 滚动条样式 */
            #watcherList::-webkit-scrollbar,
            #logContent::-webkit-scrollbar {
                width: 6px;
            }
            #watcherList::-webkit-scrollbar-track,
            #logContent::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            #watcherList::-webkit-scrollbar-thumb,
            #logContent::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            #watcherList::-webkit-scrollbar-thumb:hover,
            #logContent::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;
        document.head.appendChild(style);

        // 添加到页面
        document.body.appendChild(container);
    }

    bindEvents() {

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

        // 清空监听器按钮
        const clearWatchersBtn = document.getElementById('clearWatchersBtn');
        if (clearWatchersBtn) {
            clearWatchersBtn.addEventListener('click', () => {
                this.clearAllWatchers();
            });
        }

        // 暂停/恢复按钮
        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        if (pauseResumeBtn) {
            pauseResumeBtn.addEventListener('click', () => {
                this.togglePauseResume();
            });
        }

        // 清空日志按钮
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                this.clearLogs();
            });
        }

        // 导出日志按钮
        const exportLogsBtn = document.getElementById('exportLogsBtn');
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', () => {
                this.exportLogs();
            });
        }
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
                // 为元素添加临时选择标识
                const tempId = `selected-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                element.setAttribute('data-dom-watcher-selected', tempId);
                // console.log('浮层面板：为元素添加临时标识:', tempId, element);

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

        // 检查元素是否有临时选择标识
        const tempId = element.getAttribute('data-dom-watcher-selected');
        // console.log('浮层面板：发现临时选择标识:', tempId);

        const elementInfo = {
            tagName: element.tagName.toLowerCase(),
            cssSelector: this.generateSelector(element),
            tempId: tempId,  // 添加临时标识
            attributes: {}
        };

        // 获取属性
        for (let attr of element.attributes) {
            if (attr.name !== 'data-dom-watcher-selected') {  // 过滤临时标识
                elementInfo.attributes[attr.name] = attr.value;
            }
        }

        // console.log('浮层面板：元素信息:', elementInfo);
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
                this.addWatcher(elementInfo.cssSelector, selectedAttribute, name, elementInfo.tempId);

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

    async addWatcher(selector, attribute, name, tempId = null) {
        try {
            // console.log('浮层面板：添加监听器', { selector, attribute, name, tempId });

            const response = await this.sendMessage('addWatcher', {
                elementSelector: selector,
                attribute: attribute,
                name: name,
                tempId: tempId  // 传递临时标识
            });

            if (response && response.success) {
                // 不要在这里设置监听器信息，应该等待 watcherAdded 消息
                // this.watchers.set(response.watcherId, {
                //     id: response.watcherId,
                //     name: name,
                //     selector: selector,
                //     attribute: attribute,
                //     isWatching: true
                // });
                this.updateWatcherList();
                this.showNotification(`监听器 "${name}" 添加成功！`, 'success');
            } else {
                throw new Error(response ? response.error : '未知错误');
            }
        } catch (error) {
            this.showNotification('添加监听器失败: ' + error.message, 'error');
        }
    }

    updateWatcherList() {
        const listContainer = document.getElementById('watcherList');
        const watcherCount = document.getElementById('watcherCount');

        // console.log(`浮层面板：更新监听器列表，当前数量: ${this.watchers.size}`);

        if (!listContainer) return;

        // 更新计数器
        if (watcherCount) {
            watcherCount.textContent = `(${this.watchers.size})`;
        }

        if (this.watchers.size === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">🎯 暂无监听器</div>';
            return;
        }

        const watchersData = Array.from(this.watchers.values()).map(w => ({
            id: w.id,
            name: w.name,
            serialNumber: w.serialNumber
        }));
        // console.log('浮层面板：监听器数据:', watchersData);

        // 使用存储的序号
        const html = Array.from(this.watchers.values()).map(watcher => {
            const number = watcher.serialNumber || '?';
            // console.log(`浮层面板：渲染监听器 ${watcher.name}, 序号: ${watcher.serialNumber}, 原始数据:`, watcher);
            return `
                <div class="watcher-item ${watcher.isWatching ? 'active' : ''}" style="position: relative;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="background: #007bff; color: white; padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: 600; min-width: 18px; text-align: center;">${number}#</span>
                        <div style="flex: 1; font-weight: 600; color: #333; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${watcher.name}</div>
                        <button onclick="window.simplePanel.removeWatcher(${watcher.id})" style="background: #dc3545; color: white; border: none; padding: 1px 4px; border-radius: 3px; cursor: pointer; font-size: 9px; line-height: 1; margin-left: 4px;" title="删除监听器">🗑️</button>
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${watcher.isWatching ? '#28a745' : '#dc3545'}; box-shadow: ${watcher.isWatching ? '0 0 0 2px rgba(40, 167, 69, 0.3)' : 'none'};"></div>
                    </div>
                    <div style="display: flex; gap: 8px; font-size: 10px; color: #666;">
                        <div style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${watcher.selector}">选择器: ${watcher.selector}</div>
                        <div style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">属性: ${watcher.attribute}</div>
                    </div>
                </div>
            `;
        }).join('');

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
        const logCount = document.getElementById('logCount');

        if (!logContent) return;

        // 更新计数器
        if (logCount) {
            logCount.textContent = `(${this.logs.length})`;
        }

        if (this.logs.length === 0) {
            logContent.innerHTML = '<div style="text-align: center; color: #666; font-size: 12px;">📋 暂无日志</div>';
            return;
        }

        const html = this.logs.slice(0, 100).map(log => {
            // 使用日志中的序号
            const watcherNumber = log.watcherSerialNumber || '?';

            return `
                <div class="log-item" style="margin-bottom: 8px; padding: 8px; background: white; border-left: 3px solid #007bff; border-radius: 4px; font-size: 11px; line-height: 1.4;">
                    <div style="color: #6c757d; font-size: 10px; margin-bottom: 4px;">⏰ ${log.timeString}</div>
                    <div style="color: #333;">
                        <span style="background: #007bff; color: white; padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 600;">${watcherNumber}#</span>
                        <strong style="margin-left: 6px;">${log.watcherName || '未知'}</strong>
                        <span style="color: #007bff; margin-left: 6px;">${log.attribute}:</span>
                        <span style="color: #28a745; word-break: break-all;">"${log.newValue}"</span>
                    </div>
                </div>
            `;
        }).join('');

        logContent.innerHTML = html;
    }

    // 清空所有监听器
    async clearAllWatchers() {
        if (this.watchers.size === 0) {
            this.showNotification('没有监听器需要清空', 'info');
            return;
        }

        try {
            // 获取所有监听器ID
            const watcherIds = Array.from(this.watchers.keys());

            // 逐个删除监听器
            for (const watcherId of watcherIds) {
                await this.sendMessage('removeWatcher', { watcherId });
            }

            this.watchers.clear();
            this.updateWatcherList();
            this.showNotification(`已清空 ${watcherIds.length} 个监听器`, 'success');
        } catch (error) {
            this.showNotification('清空监听器失败: ' + error.message, 'error');
        }
    }

    // 暂停/恢复监听
    async togglePauseResume() {
        this.isPaused = !this.isPaused;

        const pauseResumeBtn = document.getElementById('pauseResumeBtn');
        if (!pauseResumeBtn) return;

        if (this.isPaused) {
            // 暂停所有监听器
            for (const [watcherId, watcher] of this.watchers) {
                if (watcher.observer) {
                    await this.sendMessage('toggleWatcher', { watcherId });
                }
            }
            pauseResumeBtn.innerHTML = '▶️ 恢复';
            pauseResumeBtn.style.background = '#28a745';
            pauseResumeBtn.style.color = 'white';
            this.showNotification('所有监听器已暂停', 'info');
        } else {
            // 恢复所有监听器
            for (const [watcherId, watcher] of this.watchers) {
                if (!watcher.observer) {
                    await this.sendMessage('toggleWatcher', { watcherId });
                }
            }
            pauseResumeBtn.innerHTML = '⏸️ 暂停';
            pauseResumeBtn.style.background = '#ffc107';
            pauseResumeBtn.style.color = '#212529';
            this.showNotification('所有监听器已恢复', 'success');
        }
    }

    // 清空日志
    async clearLogs() {
        if (this.logs.length === 0) {
            this.showNotification('没有日志需要清空', 'info');
            return;
        }

        try {
            await this.sendMessage('clearLogs');
            this.logs = [];
            this.updateLogDisplay();
            this.showNotification(`已清空 ${this.logs.length} 条日志`, 'success');
        } catch (error) {
            this.showNotification('清空日志失败: ' + error.message, 'error');
        }
    }

    // 导出日志
    exportLogs() {
        if (this.logs.length === 0) {
            this.showNotification('没有日志可以导出', 'info');
            return;
        }

        try {
            // 生成导出数据
            const exportData = {
                exportTime: new Date().toLocaleString('zh-CN'),
                totalLogs: this.logs.length,
                logs: this.logs.map(log => ({
                    时间: log.timeString,
                    序号: `${log.watcherSerialNumber}#`,
                    监听器: log.watcherName || '未知',
                    属性: log.attribute,
                    新值: log.newValue,
                    类型: log.type
                }))
            };

            // 转换为JSON字符串
            const jsonString = JSON.stringify(exportData, null, 2);

            // 创建下载链接
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // 创建下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `dom-watcher-logs-${Date.now()}.json`;

            // 触发下载
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // 清理URL
            URL.revokeObjectURL(url);

            this.showNotification(`已导出 ${this.logs.length} 条日志`, 'success');
        } catch (error) {
            this.showNotification('导出日志失败: ' + error.message, 'error');
        }
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

        switch (message.action) {
            case 'newLog':
                this.addLog(message.logEntry);
                break;
            case 'watcherAdded':
                // 更新前端监听器数据，确保包含序号
                if (message.watcher && message.watcher.id) {
                    // console.log('浮层面板：收到watcherAdded消息:', message.watcher);
                    this.watchers.set(message.watcher.id, message.watcher);
                }
                this.updateWatcherList();
                break;
            case 'watcherRemoved':
                this.updateWatcherList();
                break;
        }
    }

    async loadInitialData() {
        try {
            // console.log('浮层面板：开始加载初始数据...');

            // 检查通信是否可用
            if (!window.domWatcher) {
                // console.log('浮层面板：等待通信脚本加载...');
                // 等待通信脚本加载
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (window.domWatcher) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                });
            }

            // console.log('浮层面板：获取状态中...');
            // 从内容脚本获取当前状态
            let response;
            try {
                response = await window.domWatcher.sendMessage('getStatus');
                // console.log('浮层面板：获取到状态响应:', response);
            } catch (error) {
                // console.log('浮层面板：获取状态失败，使用空状态:', error.message);
                response = { connected: false, watchers: [], logs: [], logsCount: 0 };
            }

            if (response && response.watchers) {
                // console.log('浮层面板：更新监听器数据，数量:', response.watchers.length);
                // 更新监听器数据
                this.watchers.clear();
                response.watchers.forEach(watcher => {
                    // console.log(`浮层面板：添加监听器 ${watcher.id}, 序号: ${watcher.serialNumber}, 名称: ${watcher.name}`);
                    this.watchers.set(watcher.id, watcher);
                });
            } else {
                // console.log('浮层面板：没有找到监听器数据');
            }

            // 更新显示
            this.updateWatcherList();
            this.updateLogDisplay();
        } catch (error) {
            // console.error('浮层面板：加载初始数据失败:', error);
        }
    }
}

// 初始化
function initSimplePanel() {

    // 避免重复初始化
    if (window.simplePanel) {
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

