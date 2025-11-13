// 简化的popup脚本 - 只负责打开侧边栏
console.log('简化popup脚本已加载');

class SimplePopupController {
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

            // 绑定打开侧边栏按钮
            this.bindEvents();

            console.log('简化popup初始化完成');
        } catch (error) {
            console.error('简化popup初始化失败:', error);
        }
    }

    bindEvents() {
        const openSidebarBtn = document.getElementById('openSidebar');
        if (openSidebarBtn) {
            openSidebarBtn.addEventListener('click', () => {
                this.openSidebar();
            });
        }
    }

    async openSidebar() {
        console.log('打开侧边栏');
        try {
            // 使用Chrome sidePanel API打开侧边栏
            await chrome.sidePanel.open({ tabId: this.currentTabId });
            console.log('侧边栏已打开');

            // 关闭popup
            window.close();
        } catch (error) {
            console.error('打开侧边栏失败:', error);
            alert('打开侧边栏失败: ' + error.message);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化简化popup控制器');
    try {
        new SimplePopupController();
        console.log('简化popup控制器初始化完成');
    } catch (error) {
        console.error('简化popup控制器初始化失败:', error);
    }
});