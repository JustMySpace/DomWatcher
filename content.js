// DOM属性监听器 - 内容脚本
class DOMAttributeWatcher {
    constructor() {
        this.watchers = new Map(); // Map<watcherId, {element, selector, attribute, observer, name}>
        this.logs = [];
        this.isCapturing = false;
        this.highlightElement = null;
        this.watcherIdCounter = 1;
        this.nextSerialNumber = 1; // 全局序号计数器
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
            if (event.data && event.data.type === 'DOM_WATCHER_MESSAGE' && event.data.message) {
                this.handleMessage(event.data.message);
            }

            // 处理来自浮层面板的消息
            if (event.data && event.data.type === 'DOM_WATCHER_MESSAGE_TO_CONTENT' && event.data.data) {
                this.handleFloatingPanelMessage(event.data.data);
            }
        });

        // 监听页面刷新，清理所有存储数据
        window.addEventListener('beforeunload', () => {
            // 页面刷新时清理所有存储，确保下次是全新状态
            chrome.storage.local.remove(['domWatcherState']);
        });

        // 注入通信脚本
        this.injectCommunicationScript();

        // 注入浮层面板脚本
        this.injectFloatingPanelScript();

        // 从存储中恢复状态
        this.loadState();
    }

    async handleMessage(request, sendResponse) {
        // 检查request是否有效
        if (!request || typeof request !== 'object') {
            return;
        }

        switch (request.action) {
            case 'startCapture':
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
                    connected: true,
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

        // 为元素添加临时选择标识，确保后续能准确找到这个元素
        const tempId = `selected-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        element.setAttribute('data-dom-watcher-selected', tempId);

        // console.log(`=== 用户选择了元素 ===`);
        // console.log(`元素:`, element);
        // console.log(`临时选择标识: ${tempId}`);
        // console.log(`CSS选择器: ${cssSelector}`);

        // 发送调试信息到页面（用于调试页面显示）
        try {
            window.postMessage({
                type: 'DOM_WATCHER_DEBUG',
                selector: cssSelector,
                element: element.tagName.toLowerCase(),
                tempId: tempId  // 发送临时ID
            }, '*');
        } catch (error) {
        }

        // 通知popup元素已被选择，包含临时标识
        this.broadcastMessage({
            action: 'elementSelected',
            elementInfo: elementInfo,
            tempId: tempId  // 添加临时标识
        });

        // 保存选择状态 - 保存DOM元素、CSS选择器和临时标识
        this.targetElement = element;
        this.targetElementSelector = cssSelector;
        this.targetTempId = tempId;
        // 不保存状态，保持全新
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

        // 生成确保唯一的选择器
        const uniqueSelector = this.generateUniqueSelector(element);
        if (uniqueSelector && this.validateSelector(uniqueSelector, element)) {
            return uniqueSelector;
        }

        // 回退到原有策略
        const devToolsSelector = this.getDevToolsSelector(element);
        if (devToolsSelector && this.validateSelector(devToolsSelector, element)) {
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
                return selector;
            }
        }

        // 如果所有策略都失败，使用完整路径作为最后手段
        const fullpathSelector = this.getFullpathSelector(element);
        return fullpathSelector;
    }

    // 生成确保唯一的选择器
    generateUniqueSelector(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        // 调试信息：查看元素详情
        // console.log('=== 选择元素详情 ===', {
        //     tagName: element.tagName,
        //     id: element.id,
        //     className: element.className,
        //     name: element.name,
        //     type: element.type,
        //     placeholder: element.placeholder,
        //     value: element.value,
        //     allAttributes: Array.from(element.attributes).map(a => ({name: a.name, value: a.value})),
        //     parentElement: element.parentElement ? element.parentElement.tagName : null,
        //     parentClassName: element.parentElement ? element.parentElement.className : null,
        //     siblings: element.parentElement ? Array.from(element.parentElement.children).map((child, idx) => ({
        //         index: idx,
        //         tagName: child.tagName,
        //         className: child.className
        //     })) : null,
        //     nthOfType: element.parentElement ? Array.from(element.parentElement.children)
        //         .filter(child => child.tagName === element.tagName)
        //         .indexOf(element) + 1 : null
        // });

        // 策略1: 优先使用唯一ID（排除root）
        if (element.id && element.id !== 'root' && this.validateSelector(`#${element.id}`, element)) {
            return `#${element.id}`;
        }

        // 策略2: 使用name属性（对表单元素特别重要）
        if (element.name && this.validateSelector(`[name="${element.name}"]`, element)) {
            const tagName = element.tagName.toLowerCase();
            const result = this.validateSelector(`${tagName}[name="${element.name}"]`, element);
            if (result && document.querySelectorAll(`${tagName}[name="${element.name}"]`).length === 1) {
                return `${tagName}[name="${element.name}"]`;
            }
        }

        // 策略3: 使用更强的属性组合
        const tagName = element.tagName.toLowerCase();
        let selector = tagName;

        // 收集所有有意义的属性
        const attributes = [];

        // 对于表单元素，优先使用type和name
        if (element.type) {
            attributes.push(`[type="${element.type}"]`);
        }

        if (element.name) {
            attributes.push(`[name="${element.name}"]`);
        }

        // 使用placeholder（对input元素特别有效）
        if (element.placeholder && element.placeholder.trim()) {
            // 转义特殊字符并取前20个字符
            const safePlaceholder = element.placeholder.replace(/["\\]/g, '\\$&').substring(0, 20);
            attributes.push(`[placeholder*="${safePlaceholder}"]`);
        }

        // 使用value（对文本框特别重要）
        if (element.value !== undefined && element.value !== null) {
            const safeValue = String(element.value).replace(/["\\]/g, '\\$&').substring(0, 15);
            if (safeValue) {
                attributes.push(`[value="${safeValue}"]`);
            }
        }

        // 使用data属性
        const dataAttrs = Array.from(element.attributes)
            .filter(attr => {
                const name = attr.name;
                const value = attr.value;
                return name.startsWith('data-') && value && value.length > 0 && value.length < 30;
            })
            .slice(0, 2); // 最多使用2个data属性

        dataAttrs.forEach(attr => {
            const safeValue = attr.value.replace(/["\\]/g, '\\$&');
            attributes.push(`[${attr.name}="${safeValue}"]`);
        });

        // 添加属性到选择器
        if (attributes.length > 0) {
            selector += attributes.join('');
        }

        // 添加稳定类名
        const stableClasses = this.getStableClasses(element);
        if (stableClasses.length > 0) {
            selector += `.${stableClasses.join('.')}`;
        }

        // 添加nth-of-type确保唯一性
        if (element.parentElement) {
            const siblings = Array.from(element.parentElement.children)
                .filter(child => child.tagName === element.tagName);
            const index = siblings.indexOf(element) + 1;
            if (index > 0) {
                selector += `:nth-of-type(${index})`;
            }
        }

        // 验证选择器是否唯一
        if (this.validateSelector(selector, element) &&
            document.querySelectorAll(selector).length === 1) {
            return selector;
        }

        // 如果不唯一，尝试构建更长的路径
        return this.buildPathSelector(element);
    }

    // 构建路径选择器
    buildPathSelector(element) {
        const path = [];
        let current = element;

        // 向上最多查找4层父元素
        while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 4 && current !== document.body) {
            const segment = this.buildSelectorSegment(current);
            path.unshift(segment);
            current = current.parentElement;
        }

        // 如果没有找到足够信息，使用完整路径
        if (path.length === 0) {
            return this.getFullpathSelector(element);
        }

        const fullSelector = path.join(' > ');

        // 验证完整路径选择器
        if (this.validateSelector(fullSelector, element) &&
            document.querySelectorAll(fullSelector).length === 1) {
            return fullSelector;
        }

        // 最后的备选方案
        return this.getFullpathSelector(element);
    }

    // 构建单个选择器段
    buildSelectorSegment(element) {
        const tagName = element.tagName.toLowerCase();

        // 如果有ID且不是root，直接返回
        if (element.id && element.id !== 'root') {
            return `#${element.id}`;
        }

        let segment = tagName;

        // 添加关键属性
        const importantAttrs = [];

        if (element.name) {
            importantAttrs.push(`[name="${element.name}"]`);
        }

        if (element.type && element.type !== 'text') {
            importantAttrs.push(`[type="${element.type}"]`);
        }

        if (importantAttrs.length > 0) {
            segment += importantAttrs.join('');
        }

        // 添加稳定类名
        const stableClasses = this.getStableClasses(element);
        if (stableClasses.length > 0) {
            segment += `.${stableClasses.join('.')}`;
        }

        // 添加nth-of-type
        if (element.parentElement) {
            const siblings = Array.from(element.parentElement.children)
                .filter(child => child.tagName === element.tagName);
            const index = siblings.indexOf(element) + 1;
            if (index > 0) {
                segment += `:nth-of-type(${index})`;
            }
        }

        return segment;
    }

    // 获取稳定类名（优化版）
    getStableClasses(element) {
        if (!element.className || typeof element.className !== 'string') {
            return [];
        }

        const classes = element.className.trim().split(/\s+/);

        // 更严格的稳定类名过滤
        return classes.filter(cls => {
            // 跳过动态和状态类名
            return !(
                cls.match(/^css-[a-f0-9]+$/) ||           // css-xxxxx
                cls.match(/[a-f0-9]{6,}/) ||             // 包含长哈希值
                cls.match(/^_\d+[a-f0-9]*$/) ||          // _1xxxx
                cls.includes('is-') ||                    // 状态类前缀
                cls.includes('-active') ||                // 激活状态
                cls.includes('-focused') ||               // 聚焦状态
                cls.includes('-hover') ||                 // 悬停状态
                cls.includes('-selected') ||              // 选中状态
                cls.includes('ng-') ||                    // Angular类
                cls.includes('react-') ||                 // React类
                cls.includes('vue-') ||                   // Vue类
                cls.length === 1 ||                       // 单字符类
                cls.match(/^[a-z]\d+/) ||                // 字母+数字开头
                cls.match(/^[A-Z][a-z]*$/)               // 大写开头的组件类
            );
        }).slice(0, 2); // 最多使用2个稳定类名
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

            return selector;
        } catch (error) {
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
            return false;
        }
    }

    async startWatching(elementSelector, attribute) {
        try {

            // 如果已经在监听，先停止当前监听
            if (this.isWatching || this.observer) {
                this.stopWatching();
            }

            // 查找目标元素
            this.targetElement = this.findElementBySelector(elementSelector);
            if (!this.targetElement) {
                throw new Error(`找不到目标元素 (选择器: ${elementSelector})`);
            }


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

                                // 异步记录日志，避免频繁的消息发送
                                this.addLogAsync('变化', newValue);
                                lastValue = newValue;
                            }
                        });
                    } catch (error) {
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


            // 不保存状态，保持全新

            // 通知状态更新
            this.broadcastMessage({
                action: 'watchingStarted',
                elementInfo: this.getElementInfo(this.targetElement),
                attribute: attribute
            });

            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 根据选择器查找元素（支持特殊选择器）
    findElementBySelector(selector, useTempId = null) {
        try {
            // console.log('查找元素，选择器:', selector);

            // 如果有临时标识，优先使用
            if (useTempId) {
                const element = document.querySelector(`[data-dom-watcher-selected="${useTempId}"]`);
                if (element) {
                    // console.log('通过临时标识找到元素:', element);
                    // 找到后清理临时标识
                    element.removeAttribute('data-dom-watcher-selected');
                    return element;
                } else {
                    // console.log('临时标识未找到元素:', useTempId);
                }
            }

            // 首先尝试标准CSS选择器
            const elements = document.querySelectorAll(selector);
            // console.log('匹配到的元素数量:', elements.length);

            if (elements.length === 0) {
                // 如果标准选择器失败，尝试处理特殊选择器
                if (selector.includes('[text=')) {
                    const element = this.findElementByText(selector);
                    // console.log('通过文本找到的元素:', element);
                    return element;
                }
                return null;
            }

            if (elements.length === 1) {
                // console.log('精确匹配到唯一元素:', elements[0]);
                return elements[0];
            }

            // 如果匹配到多个元素，尝试更精确的匹配
            // const elementsInfo = Array.from(elements).map(el => ({
            //     tagName: el.tagName,
            //     className: el.className,
            //     id: el.id,
            //     name: el.name,
            //     type: el.type,
            //     value: el.value,
            //     placeholder: el.placeholder,
            //     textContent: el.textContent ? el.textContent.substring(0, 50) : ''
            // }));
            // console.log('匹配到多个元素，尝试精确匹配:', elementsInfo);

            return this.findBestMatch(selector, elements);
        } catch (error) {
            // console.error('查找元素时出错:', error);
            return null;
        }
    }

    // 在多个匹配元素中找到最佳匹配
    findBestMatch(selector, elements) {
        // 如果有ID，优先选择有ID的元素
        const withId = Array.from(elements).filter(el => el.id && el.id !== 'root');
        if (withId.length === 1) {
            // console.log('通过ID找到唯一元素:', withId[0]);
            return withId[0];
        }

        // 如果有name属性，优先选择有name的元素
        const withName = Array.from(elements).filter(el => el.name);
        if (withName.length === 1) {
            // console.log('通过name找到唯一元素:', withName[0]);
            return withName[0];
        }

        // 尝试使用更复杂的选择器重新精确匹配
        return this.preciseElementMatch(selector, elements);
    }

    // 精确元素匹配
    preciseElementMatch(originalSelector, elements) {
        // console.log('尝试精确匹配，原始选择器:', originalSelector);

        // 对于表单元素，添加更多属性进行匹配
        const elementDetails = Array.from(elements).map(el => ({
            element: el,
            details: {
                tagName: el.tagName.toLowerCase(),
                id: el.id,
                className: el.className,
                name: el.name || '',
                type: el.type || '',
                value: el.value || '',
                placeholder: el.placeholder || '',
                maxLength: el.maxLength || '',
                required: el.required,
                disabled: el.disabled,
                readonly: el.readOnly,
                attributes: Array.from(el.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                }))
            }
        }));

        // 分析选择器中的关键信息
        const selectorInfo = this.analyzeSelector(originalSelector);
        // console.log('选择器分析:', selectorInfo);

        // 根据选择器中的信息找到最匹配的元素
        let bestMatch = null;
        let bestScore = -1;

        // 如果选择器信息为空，使用其他策略
        if (!selectorInfo.name && !selectorInfo.id && !selectorInfo.type && selectorInfo.classes.length === 0) {
            // 尝试使用位置信息进行匹配
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                // 优先选择有name或id的元素
                if (element.name) {
                    bestMatch = element;
                    bestScore = 100;
                    // console.log(`通过name属性找到元素:`, element);
                    break;
                }
                if (element.id && element.id !== 'root') {
                    bestMatch = element;
                    bestScore = 200;
                    // console.log(`通过ID找到元素:`, element);
                    break;
                }
            }
        }

        for (const { element, details } of elementDetails) {
            let score = 0;

            // ID匹配（最高分）
            if (selectorInfo.id && details.id === selectorInfo.id) {
                score += 1000;
            }

            // Name属性匹配
            if (selectorInfo.name && details.name === selectorInfo.name) {
                score += 500;
            }

            // Type属性匹配
            if (selectorInfo.type && details.type === selectorInfo.type) {
                score += 200;
            }

            // Class匹配 - 改进计算
            if (selectorInfo.classes && selectorInfo.classes.length > 0) {
                const matchedClasses = selectorInfo.classes.filter(cls => details.className.includes(cls));
                score += 100 * matchedClasses.length;

                // 所有类名都匹配的额外奖励
                if (matchedClasses.length === selectorInfo.classes.length) {
                    score += 50;
                }
            }

            // Value匹配 - 改进匹配逻辑
            if (selectorInfo.value !== null) {
                if (selectorInfo.isExactValueMatch) {
                    // 精确匹配得分最高
                    if (details.value === selectorInfo.value) {
                        score += 400;
                    }
                } else {
                    // 包含匹配
                    if (details.value && details.value.includes(selectorInfo.value)) {
                        score += 150;
                    }
                }
            }

            // Placeholder匹配
            if (selectorInfo.placeholder !== null) {
                if (selectorInfo.isExactPlaceholderMatch) {
                    // 精确匹配
                    if (details.placeholder === selectorInfo.placeholder) {
                        score += 300;
                    }
                } else {
                    // 包含匹配
                    if (details.placeholder && details.placeholder.includes(selectorInfo.placeholder)) {
                        score += 200;
                    }
                }
            }

            // 属性匹配
            if (Object.keys(selectorInfo.attributes).length > 0) {
                for (const [attrName, attrValue] of Object.entries(selectorInfo.attributes)) {
                    const hasAttr = details.attributes.some(attr => attr.name === attrName && attr.value === attrValue);
                    if (hasAttr) {
                        score += 150;
                    }
                }
            }

            // 如果所有属性都不匹配，至少给基本分数
            if (score === 0) {
                score = 10; // 基础分，避免所有元素都是0分
            }

            // 添加位置权重（后面的元素可能更符合用户选择意图）
            const index = Array.from(elements).indexOf(element);
            score += index * 0.1;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = element;
                // console.log(`找到更好的匹配，得分: ${score} (索引: ${index})`, element);
            }
        }

        // console.log('最佳匹配元素:', bestMatch, '得分:', bestScore);
        return bestMatch;
    }

    // 分析选择器中的关键信息
    analyzeSelector(selector) {
        const info = {
            id: null,
            name: null,
            type: null,
            classes: [],
            value: null,
            placeholder: null,
            attributes: {}
        };

        // 提取ID（排除#root）
        const idMatch = selector.match(/#([^:\[\s>]+)/);
        if (idMatch && idMatch[1] !== 'root') {
            info.id = idMatch[1];
        }

        // 提取属性 - 改进正则表达式
        const attrMatches = selector.matchAll(/\[([^\]=]+?)(?:\*?=)?"([^"]*)"|\[([^\]=]+?)(?:\*=?)?"([^"]*)"/g);
        if (attrMatches) {
            for (const match of attrMatches) {
                let attrName, attrValue, isExactMatch = true;

                if (match[2]) { // [attr="value"]
                    [attrName, attrValue] = [match[1], match[2]];
                } else if (match[4]) { // [attr="value*"]
                    [attrName, attrValue] = [match[3], match[4]];
                    isExactMatch = false;
                } else if (match[5]) { // [attr=value]
                    [attrName, attrValue] = [match[5], ''];
                }

                if (attrName === 'name') {
                    info.name = attrValue;
                } else if (attrName === 'type') {
                    info.type = attrValue;
                } else if (attrName === 'value') {
                    info.value = attrValue;
                    info.isExactValueMatch = isExactMatch;
                } else if (attrName === 'placeholder') {
                    info.placeholder = attrValue;
                    info.isExactPlaceholderMatch = isExactMatch;
                } else if (attrName.startsWith('data-')) {
                    info.attributes[attrName] = attrValue;
                }
            }
        }

        // 提取类名 - 改进正则表达式
        const classMatches = selector.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g);
        if (classMatches) {
            info.classes = classMatches.map(cls => cls.substring(1));
        }

        // console.log('选择器分析结果:', info);
        return info;
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
            return null;
        }
    }

    stopWatching() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }


        // 清理所有状态
        this.isWatching = false;
        this.targetElement = null;
        this.targetElementSelector = null;
        this.targetAttribute = null;

        // 保存清理后的状态
        // 不保存状态，保持全新

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

        // 不保存状态，保持全新

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
        this.logs = [];

        if (isPageRefresh) {
            // 页面刷新时清理所有监听器
            for (const [id, watcher] of this.watchers) {
                // 停止观察器
                if (watcher.observer) {
                    watcher.observer.disconnect();
                    watcher.observer = null;
                }

                // 移除元素上的标识属性
                if (watcher.element && watcher.uniqueId) {
                    const currentId = watcher.element.getAttribute('data-dom-watcher-id');
                    if (currentId === watcher.uniqueId) {
                        watcher.element.removeAttribute('data-dom-watcher-id');
                        // console.log(`页面刷新时移除监听器 ${id} 的元素标识: ${watcher.uniqueId}`);
                    }
                }

                // 清理引用
                watcher.element = null;
            }

            // 清空所有监听器
            this.watchers.clear();

            // 重置序号计数器
            this.nextSerialNumber = 1;
        } else {
            // 主动清空日志时，保留监听器，只清空日志
            // console.log('主动清空日志，保留监听器');
        }

        // 不保存状态，保持全新

        if (!isPageRefresh) {
            // 主动清空时通知
            this.broadcastMessage({
                action: 'logsCleared'
            });
        }
    }

    // saveState方法已移除 - 不再保存状态，每次刷新都是全新

    async loadState() {
        // 不加载状态，保持全新
        // 清理之前的存储数据
        try {
            await chrome.storage.local.remove(['domWatcherState']);
        } catch (error) {
            // 忽略清理错误
        }
    }

    // 注入通信脚本到页面
    injectCommunicationScript() {
        // 检查是否已经注入过脚本
        if (document.querySelector('script[src*="injected.js"]')) {
            return;
        }

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected.js');
        script.onload = function() {
            this.remove();
        };
        script.onerror = function() {
            this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }

    // 注入浮层面板脚本到页面
    injectFloatingPanelScript() {

        // 先注入简化测试版本
        if (!document.getElementById('testButton')) {
            const testScript = document.createElement('script');
            testScript.src = chrome.runtime.getURL('test-simple.js');
            testScript.onload = () => {
            };
            testScript.onerror = () => {
            };
            (document.head || document.documentElement).appendChild(testScript);
        }

        // 检查是否已经存在浮层UI
        if (document.getElementById('domWatcherTrigger')) {
            return;
        }

        // 检查是否已经注入过脚本
        if (document.querySelector('script[src*="floating-panel.js"]')) {
            return;
        }

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('floating-panel-v2.js');
        script.onload = () => {
            // 等待一小段时间确保脚本执行完成
            setTimeout(() => {
                if (!document.getElementById('domWatcherTrigger')) {
                } else {
                }
            }, 500);
        };
        script.onerror = (error) => {
            // 尝试重试一次
            setTimeout(() => {
                this.injectFloatingPanelScript();
            }, 1000);
        };
        (document.head || document.documentElement).appendChild(script);

    }

  // 处理来自浮层面板的消息
    async handleFloatingPanelMessage(message) {
        // 检查message是否有效
        if (!message || typeof message !== 'object') {
            return;
        }

        try {
            let response;
            switch (message.action) {
                case 'startCapture':
                    response = { success: true };
                    this.startElementCapture();
                    break;

                case 'stopCapture':
                    response = { success: true };
                    this.stopElementCapture();
                    break;

                case 'addWatcher':
                    response = await this.addWatcher(message.elementSelector, message.attribute, message.name, message.tempId);
                    break;

                case 'removeWatcher':
                    response = { success: true };
                    this.removeWatcher(message.watcherId);
                    break;

                case 'toggleWatcher':
                    response = await this.toggleWatcher(message.watcherId);
                    break;

                case 'getStatus':
                    response = {
                        connected: true,
                        watchers: Array.from(this.watchers.entries()).map(([id, watcher]) => ({
                            id,
                            name: watcher.name,
                            selector: watcher.selector,
                            attribute: watcher.attribute,
                            isWatching: !!watcher.observer,
                            elementInfo: watcher.element ? this.getElementInfo(watcher.element) : null,
                            serialNumber: watcher.serialNumber  // 包含序号
                        })),
                        logs: this.logs,
                        logsCount: this.logs.length
                    };
                    break;

                case 'clearLogs':
                    response = { success: true };
                    this.clearLogs(false);
                    break;

                default:
                    response = { error: 'Unknown action' };
            }

            // 发送响应回浮层面板
            window.postMessage({
                type: 'DOM_WATCHER_RESPONSE',
                id: message.id,
                data: response
            }, '*');

        } catch (error) {
            // 发送错误响应
            window.postMessage({
                type: 'DOM_WATCHER_RESPONSE',
                id: message.id,
                error: error.message
            }, '*');
        }
    }

    // 添加新的监听器
    async addWatcher(elementSelector, attribute, name, tempId = null) {
        try {
            // console.log('内容脚本：收到addWatcher请求', { elementSelector, attribute, name, tempId });

            // 查找目标元素，优先使用临时标识
            const element = this.findElementBySelector(elementSelector, tempId);
            if (!element) {
                throw new Error(`找不到目标元素 (选择器: ${elementSelector})`);
            }

            // 检查是否已存在相同的监听器 - 基于实际元素检查而不是选择器
            for (const [id, watcher] of this.watchers) {
                if (watcher.element) {
                    // 检查是否是对同一元素的同一属性监听
                    if (watcher.element === element && watcher.attribute === attribute) {
                        throw new Error('该元素的此属性已在监听中');
                    }
                }
            }

            // console.log(`=== 添加新监听器 ===`);
            // console.log(`原始选择器: ${elementSelector}`);
            // console.log(`属性: ${attribute}`);
            // console.log(`找到的元素:`, element);

            const watcherId = this.watcherIdCounter++;

            // 使用全局序号计数器确保序号唯一且连续
            const serialNumber = this.nextSerialNumber++;

            // 为元素添加唯一标识属性，包含监听器ID和序号
            const uniqueId = `watch${serialNumber}#${watcherId}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;

            // console.log(`新监听器ID: ${watcherId}, 序号: ${serialNumber}`);
            // console.log(`唯一标识: ${uniqueId}`);

            // 检查元素是否已有其他监听器的标识
            const existingWatcherAttr = element.getAttribute('data-dom-watcher-id');
            if (existingWatcherAttr) {
                // console.log('警告：此元素已有监听器标识:', existingWatcherAttr);
                // console.log('这可能会导致多个监听器绑定到同一元素');

                // 查找哪个监听器在使用这个标识
                const existingWatcher = Array.from(this.watchers.values()).find(w => w.uniqueId === existingWatcherAttr);
                if (existingWatcher) {
                    // console.log(`发现冲突：监听器 ${existingWatcher.name} (ID: ${existingWatcher.id}) 已在使用此元素`);
                    throw new Error('该元素已被监听器 "' + existingWatcher.name + '" 使用，请选择其他元素');
                } else {
                    // 标识存在但找不到对应监听器，可能是残留数据，可以安全覆盖
                    // console.log('清理残留的标识:', existingWatcherAttr);
                }
            }

            element.setAttribute('data-dom-watcher-id', uniqueId);
            // console.log('已设置新元素标识:', element.getAttribute('data-dom-watcher-id'));

            // 使用优化的选择器（优先使用我们的唯一属性）
            const optimizedSelector = `[data-dom-watcher-id="${uniqueId}"]`;

            const watcher = {
                id: watcherId,
                name: name || `监听器${watcherId}`,
                element: element,
                selector: optimizedSelector,
                originalSelector: elementSelector, // 保存原始选择器用于显示
                attribute: attribute,
                observer: null,
                lastValue: null,
                serialNumber: serialNumber,
                uniqueId: uniqueId
            };

            this.watchers.set(watcherId, watcher);

            // 开始监听
            await this.startWatchingForWatcher(watcher);

            // 不再保存状态，每次刷新都是全新

            // 通知状态更新
            this.broadcastMessage({
                action: 'watcherAdded',
                watcherId: watcherId,
                watcher: {
                    id: watcherId,
                    name: watcher.name,
                    selector: elementSelector, // 显示原始选择器
                    attribute: watcher.attribute,
                    isWatching: true,
                    serialNumber: serialNumber  // 添加序号
                }
            });

            return { success: true, watcherId: watcherId };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 移除监听器
    removeWatcher(watcherId) {
        const watcher = this.watchers.get(watcherId);
        if (!watcher) {
            // console.log(`监听器 ${watcherId} 不存在`);
            return;
        }

        // console.log(`正在移除监听器 ${watcherId} (${watcher.name})，序号: ${watcher.serialNumber}`);

        // 停止监听
        if (watcher.observer) {
            watcher.observer.disconnect();
            watcher.observer = null;
        }

        // 移除元素上的唯一标识属性（只有当前这个监听器的标识）
        if (watcher.element && watcher.uniqueId) {
            const currentId = watcher.element.getAttribute('data-dom-watcher-id');
            if (currentId === watcher.uniqueId) {
                watcher.element.removeAttribute('data-dom-watcher-id');
                // console.log(`已移除元素标识: ${watcher.uniqueId}`);
            } else {
                // console.log(`元素标识已变化，跳过清理。当前: ${currentId}, 要移除: ${watcher.uniqueId}`);
            }
        }

        // 清理引用
        watcher.element = null;

        // 从列表中移除
        this.watchers.delete(watcherId);

        // 不保存状态，保持全新

        // 通知状态更新
        this.broadcastMessage({
            action: 'watcherRemoved',
            watcherId: watcherId
        });
    }

    // 切换监听器状态
    async toggleWatcher(watcherId) {
        const watcher = this.watchers.get(watcherId);
        if (!watcher) {
            throw new Error('监听器不存在');
        }

        if (watcher.observer) {
            // 停止监听
            watcher.observer.disconnect();
            watcher.observer = null;

            this.broadcastMessage({
                action: 'watcherStopped',
                watcherId: watcherId
            });
        } else {
            // 重新开始监听
            await this.startWatchingForWatcher(watcher);

            this.broadcastMessage({
                action: 'watcherStarted',
                watcherId: watcherId,
                elementInfo: this.getElementInfo(watcher.element)
            });
        }

        // 不保存状态，保持全新
        return { success: true };
    }

    // 为特定监听器开始监听
    async startWatchingForWatcher(watcher) {
        if (watcher.observer) {
            watcher.observer.disconnect();
        }

        // console.log(`开始监听 ${watcher.name} (ID: ${watcher.id}, 序号: ${watcher.serialNumber})`);
        // console.log(`唯一标识: ${watcher.uniqueId}`);

        // 优先使用唯一属性查找元素
        let element = null;
        if (watcher.uniqueId) {
            element = document.querySelector(`[data-dom-watcher-id="${watcher.uniqueId}"]`);
            // console.log(`通过唯一标识找到元素:`, element);
        }

        // 如果唯一属性找不到，回退到原始选择器
        if (!element) {
            // console.log(`唯一标识未找到，尝试原始选择器: ${watcher.originalSelector}`);
            element = this.findElementBySelector(watcher.originalSelector);
            if (element) {
                // 重新添加唯一标识
                element.setAttribute('data-dom-watcher-id', watcher.uniqueId);
                // console.log(`通过原始选择器找到元素，重新添加标识: ${watcher.uniqueId}`);
            }
        }

        if (!element) {
            throw new Error('目标元素已被移除且无法重新找到');
        }

        // 验证元素唯一性
        const allElementsWithId = document.querySelectorAll(`[data-dom-watcher-id="${watcher.uniqueId}"]`);
        if (allElementsWithId.length > 1) {
            // console.warn(`警告：找到多个元素使用相同标识 ${watcher.uniqueId}，数量: ${allElementsWithId.length}`);
        }

        watcher.element = element;
        // console.log(`监听器 ${watcher.name} 已绑定到元素:`, element);

        // 获取初始值
        let lastValue;
        if (watcher.element.hasAttribute(watcher.attribute)) {
            lastValue = watcher.element.getAttribute(watcher.attribute);
        } else if (watcher.attribute === 'textContent') {
            lastValue = watcher.element.textContent || '';
        } else if (watcher.attribute === 'innerText') {
            lastValue = watcher.element.innerText || '';
        } else if (watcher.attribute === 'innerHTML') {
            lastValue = watcher.element.innerHTML || '';
        } else {
            lastValue = watcher.element.getAttribute(watcher.attribute);
        }

        watcher.lastValue = lastValue;

        // 记录开始监听日志
        this.addLogForWatcher(watcher, '开始监听', lastValue);

        // 创建MutationObserver - 立刻响应变化
        watcher.observer = new MutationObserver((mutations) => {
            try {
                // 检查元素是否仍然存在
                if (!document.contains(watcher.element)) {
                    this.removeWatcher(watcher.id);
                    return;
                }

                mutations.forEach((mutation) => {
                    let newValue;
                    let shouldLog = false;

                    if (mutation.type === 'attributes' && mutation.attributeName === watcher.attribute) {
                        newValue = watcher.element.getAttribute(watcher.attribute);
                        shouldLog = true;
                    } else if (mutation.type === 'characterData' || (mutation.type === 'childList' && watcher.attribute.includes('text'))) {
                        if (watcher.attribute === 'textContent') {
                            newValue = watcher.element.textContent || '';
                        } else if (watcher.attribute === 'innerText') {
                            newValue = watcher.element.innerText || '';
                        } else if (watcher.attribute === 'innerHTML') {
                            newValue = watcher.element.innerHTML || '';
                        } else {
                            return;
                        }
                        shouldLog = true;
                    }

                    // 避免重复记录相同的变化
                    if (shouldLog && newValue !== watcher.lastValue) {
                        this.addLogForWatcher(watcher, '变化', newValue);
                        watcher.lastValue = newValue;
                    }
                });
            } catch (error) {
            }
        });

        // 确定观察配置 - 严格控制监听范围
        const observeConfig = {
            attributes: true,
            attributeFilter: [watcher.attribute],
            attributeOldValue: true
        };

        // 只有监听文本内容时才使用更广的观察范围
        if (watcher.attribute === 'textContent' || watcher.attribute === 'innerText' || watcher.attribute === 'innerHTML') {
            observeConfig.childList = true;
            observeConfig.characterData = true;
            // 不要设置 subtree: true，避免监听过多不相关的子元素变化
        }

        // 开始观察特定元素
        watcher.observer.observe(watcher.element, observeConfig);

    }

    // 为特定监听器添加日志
    addLogForWatcher(watcher, type, newValue) {
        const logEntry = {
            id: Date.now() + Math.random(),
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
            watcherId: watcher.id,
            watcherName: watcher.name,
            watcherSerialNumber: watcher.serialNumber,  // 添加序号
            elementInfo: this.getElementInfo(watcher.element),
            attribute: watcher.attribute,
            newValue
        };

        this.logs.unshift(logEntry);

        // 限制日志数量
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }

        // 不保存状态，保持全新

        // 通知有新日志
        this.broadcastMessage({
            action: 'newLog',
            logEntry: logEntry
        });
    }

    // 简化的消息发送方法，支持popup、独立侧边栏和浮层面板通信
    broadcastMessage(message) {
        // 发送到浮层面板（优先，因为总是可用）
        try {
            window.postMessage({
                type: 'DOM_WATCHER_MESSAGE',
                data: message
            }, '*');
        } catch (error) {
            // console.error('发送消息到浮层面板失败:', error);
        }

        // 发送到popup和独立侧边栏（仅在可用时）
        try {
            chrome.runtime.sendMessage(message).catch(error => {
                // 静默处理连接错误，这是正常的
                // // console.log('Popup不可用，跳过发送:', error.message);
            });
        } catch (error) {
            // 静默处理
        }
    }
}

// 初始化DOM监听器
const domWatcher = new DOMAttributeWatcher();