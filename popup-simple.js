// 简化的popup脚本 - 显示浮层面板状态
console.log('浮层面板状态popup脚本已加载');

class FloatingPanelPopupController {
    constructor() {
        this.currentTabId = null;
        this.init();
    }

    async init() {
        try {
            // 获取当前标签页ID
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTabId = tab.id;
            console.log('当前标签ID:', this.currentTabId);

            // 更新状态显示
            this.updateStatus();

            console.log('浮层面板popup初始化完成');
        } catch (error) {
            console.error('浮层面板popup初始化失败:', error);
        }
    }

    async updateStatus() {
        try {
            // 获取当前页面信息
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // 更新当前页面信息
            const currentTabElement = document.getElementById('currentTab');
            if (currentTabElement) {
                const title = tab.title ? tab.title.substring(0, 20) + (tab.title.length > 20 ? '...' : '') : '未知页面';
                currentTabElement.textContent = title;
            }

            // 尝试获取监听器状态
            try {
                const response = await chrome.tabs.sendMessage(this.currentTabId, {
                    action: 'getStatus'
                });

                if (response) {
                    // 更新监听状态
                    const watchingStatusElement = document.getElementById('watchingStatus');
                    if (watchingStatusElement) {
                        if (response.isWatching) {
                            watchingStatusElement.textContent = '正在监听';
                            watchingStatusElement.classList.add('active');
                        } else {
                            watchingStatusElement.textContent = '未开始';
                            watchingStatusElement.classList.remove('active');
                        }
                    }

                    // 更新日志数量
                    const logCountElement = document.getElementById('logCount');
                    if (logCountElement) {
                        logCountElement.textContent = response.logsCount || 0;
                    }
                }
            } catch (statusError) {
                console.log('无法获取状态，浮层面板可能还未加载');
                // 保持默认状态
            }

        } catch (error) {
            console.error('更新状态失败:', error);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化浮层面板popup控制器');
    try {
        new FloatingPanelPopupController();
        console.log('浮层面板popup控制器初始化完成');
    } catch (error) {
        console.error('浮层面板popup控制器初始化失败:', error);
    }
});