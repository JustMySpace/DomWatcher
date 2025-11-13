// 最小化的popup脚本
console.log('Minimal popup script loaded');

function showBasicAlert() {
    alert('按钮点击成功！');
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded in popup');

    // 绑定按钮事件
    const testButton = document.getElementById('testButton');
    if (testButton) {
        testButton.addEventListener('click', showBasicAlert);
        console.log('Button event listener attached');
    } else {
        console.error('Test button not found');
    }

    // 显示加载成功的消息
    setTimeout(() => {
        alert('弹出窗口加载成功！');
    }, 100);
});