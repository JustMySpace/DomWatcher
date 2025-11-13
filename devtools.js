// DevTools主入口脚本
chrome.devtools.panels.create(
    "DOM监听器",
    "",
    "devtools-panel.html",
    function(panel) {
        // 面板显示时的处理
        panel.onShown.addListener(function(window) {
            console.log('DOM监听器面板已显示');
        });

        // 面板隐藏时的处理
        panel.onHidden.addListener(function(window) {
            console.log('DOM监听器面板已隐藏');
        });
    }
);