// DOM属性监听器 - 内容脚本
class DOMAttributeWatcher {
    constructor() {
        this.isWatching = false;
        this.targetElement = null;
        this.targetElementSelector = null;
        this.targetAttribute = null;
        this.observer = null;
        this.logs = [];
        this.isCapturing = false;
        this.highlightElement = null;
        this.init();
    }

    init() {
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sendResponse);
            return true; // 保持消息通道开放
        });

        // 监听来自注入脚本的消息
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'DOM_WATCHER_MESSAGE') {
                this.handleDevToolsMessage(event.data.message);
            }
        });

        // 监听页面刷新，清空日志
        window.addEventListener('beforeunload', () => {
            this.clearLogs(true); // 页面刷新时清空日志
        });

        // 注入通信脚本
        this.injectCommunicationScript();

        // 从存储中恢复状态
        this.loadState();
    }

    async handleMessage(request, sendResponse) {
        switch (request.action) {
            case 'startCapture':
                console.log('收到startCapture消息');
                this.startElementCapture();
                sendResponse({ success: true });
                break;

            case 'stopCapture':
                this.stopElementCapture();
                sendResponse({ success: true });
                break;

            case 'startWatching':
                const result = await this.startWatching(request.elementSelector, request.attribute);
                sendResponse(result);
                break;

            case 'stopWatching':
                this.stopWatching();
                sendResponse({ success: true });
                break;

            case 'getLogs':
                sendResponse({ logs: this.logs });
                break;

            case 'clearLogs':
                this.clearLogs(false); // 主动清空（非页面刷新）
                sendResponse({ success: true });
                break;

            case 'getStatus':
                sendResponse({
                    isWatching: this.isWatching,
                    targetElement: this.targetElement ? this.getElementInfo(this.targetElement) : null,
                    targetAttribute: this.targetAttribute,
                    logs: this.logs,
                    logsCount: this.logs.length
                });
                break;

            case 'getLogsData':
                sendResponse({
                    action: 'logsData',
                    logs: this.logs
                });
                break;

    
            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    startElementCapture() {
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
            display: block;
        `;
        document.body.appendChild(overlay);

        const mouseMoveHandler = (e) => {
            if (!this.isCapturing) return;

            // 移除之前的高亮
            if (this.highlightElement) {
                this.highlightElement.style.outline = '';
                this.highlightElement.style.outlineOffset = '';
            }

            // 找到目标元素
            let element = document.elementFromPoint(e.clientX, e.clientY);

            // 忽略overlay和tooltip
            const overlayElement = document.getElementById('dom-watcher-overlay');
            const tooltipElement = document.getElementById('dom-watcher-tooltip');

            if (element === overlayElement || element === tooltipElement || !element) {
                return;
            }

            // 临时隐藏overlay和tooltip来获取真实元素
            if (overlayElement) overlayElement.style.display = 'none';
            if (tooltipElement) tooltipElement.style.display = 'none';

            element = document.elementFromPoint(e.clientX, e.clientY);

            // 恢复显示
            if (overlayElement) overlayElement.style.display = 'block';
            if (tooltipElement) tooltipElement.style.display = 'block';

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

            // 找到实际点击的元素，忽略overlay和tooltip
            const overlay = document.getElementById('dom-watcher-overlay');
            const tooltip = document.getElementById('dom-watcher-tooltip');

            let element = document.elementFromPoint(e.clientX, e.clientY);

            // 如果点击的是overlay或tooltip，不处理
            if (element === overlay || element === tooltip || !element) {
                return;
            }

            // 临时隐藏overlay和tooltip来获取真实元素
            if (overlay) overlay.style.display = 'none';
            if (tooltip) tooltip.style.display = 'none';

            element = document.elementFromPoint(e.clientX, e.clientY);

            // 恢复显示
            if (overlay) overlay.style.display = 'block';
            if (tooltip) tooltip.style.display = 'block';

            if (element) {
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

        // 保存事件处理器引用以便后续移除
        this.captureHandlers = {
            mouseMoveHandler,
            clickHandler,
            keyHandler
        };
    }

    stopElementCapture() {
        this.isCapturing = false;
        document.body.style.cursor = '';

        // 移除高亮
        if (this.highlightElement) {
            this.highlightElement.style.outline = '';
            this.highlightElement.style.outlineOffset = '';
            this.highlightElement = null;
        }

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
    }

    selectElement(element) {
        const elementInfo = this.getElementInfo(element);
        const cssSelector = this.getCssSelector(element);

        console.log('元素已选择:', elementInfo);
        console.log('生成的CSS选择器:', cssSelector);

        // 发送调试信息到页面（用于调试页面显示）
        try {
            window.postMessage({
                type: 'DOM_WATCHER_DEBUG',
                selector: cssSelector,
                element: element.tagName.toLowerCase()
            }, '*');
        } catch (error) {
            console.warn('发送调试信息失败:', error);
        }

        // 通知popup元素已被选择
        this.broadcastMessage({
            action: 'elementSelected',
            elementInfo: elementInfo
        });

        // 保存选择状态 - 保存DOM元素和CSS选择器
        this.targetElement = element;
        this.targetElementSelector = cssSelector;
        this.saveState();
    }

    getElementInfo(element) {
        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
        const xpath = this.getXPath(element);
        const cssSelector = this.getCssSelector(element);

        // 获取所有属性
        const attributes = {};
        for (let attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }

        // 如果没有传统属性，添加一些基于内容的元属性
        if (Object.keys(attributes).length === 0) {
            const textContent = element.textContent ? element.textContent.substring(0, 50) : '';
            const innerText = element.innerText ? element.innerText.substring(0, 50) : '';
            const innerHTML = element.innerHTML ? element.innerHTML.substring(0, 50) : '';

            if (textContent) {
                attributes['textContent'] = textContent;
            }
            if (innerText && innerText !== textContent) {
                attributes['innerText'] = innerText;
            }
            if (innerHTML && innerHTML !== textContent && innerHTML !== innerText) {
                attributes['innerHTML'] = innerHTML;
            }
        }

        return {
            tagName,
            id,
            classes,
            xpath,
            cssSelector,
            attributes,
            textContent: element.textContent ? element.textContent.substring(0, 100) : '',
            // 移除element引用，避免DataCloneError
        };
    }

    getXPath(element) {
        if (element.id !== '') {
            return `id("${element.id}")`;
        }
        if (element === document.body) {
            return element.tagName.toLowerCase();
        }

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                return this.getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

    getCssSelector(element) {
        console.log('生成CSS选择器 for:', element);

        // 优先使用开发者工具格式的选择器
        const devToolsSelector = this.getDevToolsSelector(element);
        if (devToolsSelector && this.validateSelector(devToolsSelector, element)) {
            console.log('使用开发者工具格式选择器:', devToolsSelector);
            return devToolsSelector;
        }

        // 备选策略
        const strategies = [
            this.getIdSelector(element),
            this.getStableClassSelector(element),
            this.getTagWithNthChildSelector(element),
            this.getAttributeSelector(element),
            this.getTextContentSelector(element)
        ];

        // 返回第一个有效的选择器
        for (const selector of strategies) {
            if (selector && this.validateSelector(selector, element)) {
                console.log('使用备选选择器策略:', selector);
                return selector;
            }
        }

        // 如果所有策略都失败，使用完整路径作为最后手段
        const fullpathSelector = this.getFullpathSelector(element);
        console.log('使用完整路径选择器:', fullpathSelector);
        return fullpathSelector;
    }

    // 开发者工具格式的选择器生成
    getDevToolsSelector(element) {
        try {
            // 检查是否可以复制当前选择器（模拟开发者工具）
            const path = [];
            let current = element;

            while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
                const selector = this.generateDevToolsSegment(current);
                if (selector) {
                    path.unshift(selector);

                    // 如果找到了ID选择器，停止向上查找
                    if (selector.includes('#')) {
                        break;
                    }
                }
                current = current.parentNode;
            }

            // 限制路径深度，避免过长
            const limitedPath = path.slice(-5); // 最多5层
            const selector = limitedPath.join(' > ');

            console.log('生成的开发者工具选择器:', selector);
            return selector;
        } catch (error) {
            console.warn('生成开发者工具选择器失败:', error);
            return null;
        }
    }

    // 生成单个选择器段（模拟Chrome开发者工具的逻辑）
    generateDevToolsSegment(element) {
        const tagName = element.tagName.toLowerCase();

        // 1. ID选择器 - 最高优先级
        if (element.id) {
            return `#${element.id}`;
        }

        // 2. 类名选择器 - 选择有语义意义的类
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/);
            const meaningfulClasses = this.selectMeaningfulClasses(classes);

            if (meaningfulClasses.length > 0) {
                // 最多使用2-3个有意义的类名
                const selectedClasses = meaningfulClasses.slice(0, 2);
                const classSelector = '.' + selectedClasses.join('.');
                const nthChild = this.getNthChild(element);

                if (nthChild) {
                    return `${tagName}${classSelector}:nth-child(${nthChild})`;
                } else {
                    return `${tagName}${classSelector}`;
                }
            }
        }

        // 3. 属性选择器 - 使用稳定的属性
        const attrSelector = this.getStableAttributeSelector(element);
        if (attrSelector) {
            return `${tagName}${attrSelector}`;
        }

        // 4. nth-child选择器
        const nthChild = this.getNthChild(element);
        if (nthChild) {
            return `${tagName}:nth-child(${nthChild})`;
        }

        return tagName;
    }

    // 选择有意义的类名（过滤掉工具生成的类）
    selectMeaningfulClasses(classes) {
        return classes.filter(cls => {
            // 过滤掉明显的工具生成类
            if (cls.match(/^css-[a-f0-9]+$/)) return false; // CSS Modules
            if (cls.match(/^[a-f0-9]{6,}$/)) return false; // Hash-based class names
            if (cls.match(/^_[a-f0-9]+$/)) return false; // Emotion/Styled Components
            if (cls.includes('is-') && cls.includes('-focused')) return false; // 状态类
            if (cls.includes('is-') && cls.includes('-active')) return false; // 状态类
            if (cls.length <= 2) return false; // 过短的类名

            // 保留看起来有意义的类名
            return true;
        });
    }

    // 获取nth-child值
    getNthChild(element) {
        if (!element.parentNode) return null;

        const siblings = Array.from(element.parentNode.children);
        const index = siblings.indexOf(element) + 1;

        // 如果有多个相同标签的兄弟元素，使用nth-child
        const sameTagSiblings = siblings.filter(sibling =>
            sibling.tagName === element.tagName
        );

        if (sameTagSiblings.length > 1) {
            return index;
        }

        return null;
    }

    // 获取稳定的属性选择器
    getStableAttributeSelector(element) {
        const stableAttributes = [
            'data-testid', 'data-cy', 'data-test', 'test-id',
            'name', 'type', 'role', 'aria-label', 'aria-labelledby',
            'data-id', 'data-key', 'id'  // id再次确认
        ];

        for (const attr of stableAttributes) {
            const value = element.getAttribute(attr);
            if (value && !value.match(/^[a-f0-9-]+$/)) { // 过滤掉哈希值
                return `[${attr}="${value}"]`;
            }
        }

        return null;
    }

    // 策略1: ID选择器
    getIdSelector(element) {
        return element.id ? `#${element.id}` : null;
    }

    // 策略2: 稳定的类名选择器（过滤掉动态类名）
    getStableClassSelector(element) {
        if (!element.className || typeof element.className !== 'string') {
            return null;
        }

        const classes = element.className.trim().split(/\s+/);

        // 过滤掉可能的动态类名
        const stableClasses = classes.filter(cls => {
            // 跳过包含数字、哈希值、或者看起来像自动生成的类名
            return !(
                cls.match(/^css-[a-f0-9]+$/) ||           // css-xxxxx
                cls.match(/[a-f0-9]{6,}/) ||             // 包含长哈希值
                cls.match(/^_\d+[a-f0-9]*$/) ||          // _1xxxx
                cls.includes('is-focused') ||             // 状态类
                cls.includes('active') ||                 // 状态类
                cls.includes('hover') ||                  // 状态类
                cls.length === 1 ||                       // 单字符类
                cls.match(/^[a-z]\d+/)                    // 字母+数字开头
            );
        });

        if (stableClasses.length > 0) {
            // 只使用前2个最稳定的类名
            const tagName = element.tagName.toLowerCase();
            const limitedClasses = stableClasses.slice(0, 2);
            return `${tagName}.${limitedClasses.join('.')}`;
        }

        return null;
    }

    // 策略3: 标签 + nth-child选择器
    getTagWithNthChildSelector(element) {
        const tagName = element.tagName.toLowerCase();

        // 获取父元素中的同级元素
        if (element.parentNode) {
            const siblings = Array.from(element.parentNode.children);
            const index = siblings.indexOf(element) + 1;

            if (index > 0) {
                // 查找父元素
                const parentSelector = this.getParentSelector(element.parentNode, 2);
                if (parentSelector) {
                    return `${parentSelector} > ${tagName}:nth-child(${index})`;
                }
                return `${tagName}:nth-child(${index})`;
            }
        }

        return tagName;
    }

    // 策略4: 属性选择器
    getAttributeSelector(element) {
        const tagName = element.tagName.toLowerCase();

        // 尝试使用常见的稳定属性
        const stableAttributes = ['data-testid', 'data-cy', 'name', 'type', 'role', 'aria-label'];

        for (const attr of stableAttributes) {
            const value = element.getAttribute(attr);
            if (value) {
                return `${tagName}[${attr}="${value}"]`;
            }
        }

        return null;
    }

    // 策略5: 文本内容选择器（仅作为最后手段）
    getTextContentSelector(element) {
        const text = element.textContent?.trim();
        if (text && text.length < 50 && text.match(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/)) {
            const tagName = element.tagName.toLowerCase();
            return `${tagName}[text="${text}"]`;
        }
        return null;
    }

    // 获取父元素选择器（限制层级）
    getParentSelector(element, maxDepth = 2) {
        let path = [];
        let current = element;
        let depth = 0;

        while (current && current.nodeType === Node.ELEMENT_NODE && depth < maxDepth) {
            const selector = this.getIdSelector(current) || this.getStableClassSelector(current);
            if (selector) {
                path.unshift(selector);
                break; // 找到稳定的父选择器就停止
            }

            path.unshift(current.tagName.toLowerCase());
            current = current.parentNode;
            depth++;
        }

        return path.length > 0 ? path.join(' > ') : null;
    }

    // 完整路径选择器（最后手段）
    getFullpathSelector(element) {
        let path = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            // 只使用ID或最稳定的类名
            if (current.id) {
                selector = `#${current.id}`;
                path.unshift(selector);
                break;
            }

            const stableSelector = this.getStableClassSelector(current);
            if (stableSelector) {
                path.unshift(stableSelector);
                break;
            }

            // 添加nth-child确保唯一性
            if (current.parentNode) {
                const siblings = Array.from(current.parentNode.children);
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-child(${index})`;
            }

            path.unshift(selector);
            current = current.parentNode;
        }

        return path.join(' > ');
    }

    // 验证选择器是否能找到指定元素
    validateSelector(selector, targetElement) {
        try {
            const elements = document.querySelectorAll(selector);
            return elements.length === 1 && elements[0] === targetElement;
        } catch (error) {
            console.warn('选择器验证失败:', selector, error);
            return false;
        }
    }

    async startWatching(elementSelector, attribute) {
        try {
            console.log('开始监听 - CSS选择器:', elementSelector, '属性:', attribute);

            // 如果已经在监听，先停止当前监听
            if (this.isWatching || this.observer) {
                console.log('检测到已有监听器，先清理旧的监听器');
                this.stopWatching();
            }

            // 查找目标元素
            this.targetElement = this.findElementBySelector(elementSelector);
            if (!this.targetElement) {
                console.error('无法找到元素，选择器:', elementSelector);
                throw new Error(`找不到目标元素 (选择器: ${elementSelector})`);
            }

            console.log('找到目标元素:', this.targetElement);

            this.targetAttribute = attribute;
            this.targetElementSelector = elementSelector;
            this.isWatching = true;

            // 获取初始值
            let lastValue;
            if (this.targetElement.hasAttribute(attribute)) {
                lastValue = this.targetElement.getAttribute(attribute);
            } else if (attribute === 'textContent') {
                lastValue = this.targetElement.textContent || '';
            } else if (attribute === 'innerText') {
                lastValue = this.targetElement.innerText || '';
            } else if (attribute === 'innerHTML') {
                lastValue = this.targetElement.innerHTML || '';
            } else {
                lastValue = this.targetElement.getAttribute(attribute);
            }

            console.log('属性初始值:', lastValue);
            this.addLog('开始监听', lastValue);

            // 创建MutationObserver - 使用异步处理避免阻塞页面
            this.observer = new MutationObserver((mutations) => {
                // 使用setTimeout异步处理，避免阻塞页面
                setTimeout(() => {
                    try {
                        mutations.forEach((mutation) => {
                            let newValue;
                            let shouldLog = false;

                            if (mutation.type === 'attributes' &&
                                mutation.attributeName === attribute) {
                                newValue = this.targetElement.getAttribute(attribute);
                                shouldLog = true;
                            } else if (mutation.type === 'characterData' ||
                                      (mutation.type === 'childList' && attribute.includes('text'))) {
                                // 处理文本内容变化
                                if (attribute === 'textContent') {
                                    newValue = this.targetElement.textContent || '';
                                } else if (attribute === 'innerText') {
                                    newValue = this.targetElement.innerText || '';
                                } else if (attribute === 'innerHTML') {
                                    newValue = this.targetElement.innerHTML || '';
                                } else {
                                    return; // 不是内容属性，跳过
                                }
                                shouldLog = true;
                            }

                            // 避免重复记录相同的变化
                            if (shouldLog && newValue !== lastValue) {
                                console.log('检测到变化:', attribute, '新值:', newValue, '旧值:', lastValue);

                                // 异步记录日志，避免频繁的消息发送
                                this.addLogAsync('变化', newValue);
                                lastValue = newValue;
                            }
                        });
                    } catch (error) {
                        console.error('MutationObserver回调处理失败:', error);
                    }
                }, 0); // 下一个事件循环执行
            });

            // 确定观察配置
            const observeConfig = {
                attributes: true,
                attributeFilter: [attribute],
                attributeOldValue: true
            };

            // 如果是内容属性，同时观察子节点和字符数据
            if (attribute === 'textContent' || attribute === 'innerText' || attribute === 'innerHTML') {
                observeConfig.childList = true;
                observeConfig.characterData = true;
                observeConfig.subtree = true;
            }

            // 开始观察
            this.observer.observe(this.targetElement, observeConfig);

            console.log('MutationObserver已启动，配置:', observeConfig);

            this.saveState();

            // 通知状态更新
            this.broadcastMessage({
                action: 'watchingStarted',
                elementInfo: this.getElementInfo(this.targetElement),
                attribute: attribute
            });

            return { success: true };

        } catch (error) {
            console.error('启动监听失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 根据选择器查找元素（支持特殊选择器）
    findElementBySelector(selector) {
        try {
            // 首先尝试标准CSS选择器
            let element = document.querySelector(selector);
            if (element) return element;

            // 如果标准选择器失败，尝试处理特殊选择器
            if (selector.includes('[text=')) {
                return this.findElementByText(selector);
            }

            return null;
        } catch (error) {
            console.warn('查找元素失败:', selector, error);
            return null;
        }
    }

    // 根据文本内容查找元素
    findElementByText(selector) {
        try {
            // 解析选择器中的文本内容
            const match = selector.match(/^(.+)\[text="([^"]+)"\]$/);
            if (!match) return null;

            const [, tagName, text] = match;

            // 查找所有指定标签的元素
            const elements = document.querySelectorAll(tagName);
            for (const element of elements) {
                if (element.textContent?.trim() === text) {
                    return element;
                }
            }

            return null;
        } catch (error) {
            console.warn('按文本查找元素失败:', selector, error);
            return null;
        }
    }

    stopWatching() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        console.log('停止监听');

        // 清理所有状态
        this.isWatching = false;
        this.targetElement = null;
        this.targetElementSelector = null;
        this.targetAttribute = null;

        // 保存清理后的状态
        this.saveState();

        // 通知状态更新
        this.broadcastMessage({
            action: 'watchingStopped'
        });
    }

    addLog(type, newValue) {
        const logEntry = {
            id: Date.now(),
            timestamp: Date.now(),
            timeString: new Date().toLocaleString('zh-CN', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            }),
            type,
            elementInfo: this.targetElement ? this.getElementInfo(this.targetElement) : null,
            attribute: this.targetAttribute,
            newValue
        };

        this.logs.unshift(logEntry); // 新日志在前

        // 限制日志数量，避免内存占用过多
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }

        this.saveState();

        // 通知有新日志
        this.broadcastMessage({
            action: 'newLog',
            logEntry: logEntry
        });
    }

    // 异步版本的addLog，避免频繁的消息发送
    addLogAsync(type, newValue) {
        // 使用防抖机制，避免短时间内记录过多日志
        if (this.logTimeout) {
            clearTimeout(this.logTimeout);
        }

        this.logTimeout = setTimeout(() => {
            this.addLog(type, newValue);
        }, 50); // 50ms防抖延迟
    }

    clearLogs(isPageRefresh = false) {
        const wasWatching = this.isWatching;
        this.logs = [];

        // 如果是页面刷新且正在监听，停止监听
        if (isPageRefresh && wasWatching) {
            this.stopWatching();
        }

        this.saveState();

        if (!isPageRefresh) {
            // 主动清空时通知popup
            this.broadcastMessage({
                action: 'logsCleared'
            });
        }
    }

    saveState() {
        const state = {
            isWatching: this.isWatching,
            targetElementSelector: this.targetElementSelector || (this.targetElement ? this.getCssSelector(this.targetElement) : null),
            targetAttribute: this.targetAttribute,
            logs: this.logs
        };

        console.log('保存状态:', state);
        chrome.storage.local.set({ domWatcherState: state });
    }

    async loadState() {
        try {
            const result = await chrome.storage.local.get(['domWatcherState']);
            const state = result.domWatcherState;

            if (state) {
                console.log('加载状态:', state);
                this.logs = state.logs || [];
                this.targetElementSelector = state.targetElementSelector;
                this.targetAttribute = state.targetAttribute;

                // 尝试根据选择器重新找到元素
                if (state.targetElementSelector) {
                    const element = document.querySelector(state.targetElementSelector);
                    if (element) {
                        this.targetElement = element;
                        console.log('成功恢复目标元素:', element);
                    } else {
                        console.warn('无法根据选择器找到目标元素:', state.targetElementSelector);
                        this.targetElement = null;
                        this.targetElementSelector = null;
                        this.targetAttribute = null;
                    }
                }

                // 如果之前在监听，尝试恢复监听状态
                if (state.isWatching && this.targetElement && this.targetAttribute) {
                    console.log('尝试恢复监听状态');
                    // 不自动恢复监听，等待用户确认
                    try {
                        await chrome.runtime.sendMessage({
                            action: 'restoreWatchingState',
                            targetElementSelector: state.targetElementSelector,
                            targetAttribute: state.targetAttribute
                        });
                    } catch (error) {
                        console.warn('发送恢复状态消息失败:', error);
                    }
                }
            }
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }

    // 注入通信脚本到页面
    injectCommunicationScript() {
        // 检查是否已经注入过脚本
        if (document.querySelector('script[src*="injected.js"]')) {
            console.log('注入脚本已存在，跳过');
            return;
        }

        console.log('开始注入通信脚本');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected.js');
        script.onload = function() {
            console.log('注入脚本加载完成');
            this.remove();
        };
        script.onerror = function() {
            console.error('注入脚本加载失败');
            this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }

  // 简化的消息发送方法，只支持popup和独立侧边栏通信
    broadcastMessage(message) {
        // 发送到popup和独立侧边栏
        try {
            chrome.runtime.sendMessage(message);
        } catch (error) {
            console.warn('发送消息失败:', error);
        }
    }
}

// 初始化DOM监听器
const domWatcher = new DOMAttributeWatcher();