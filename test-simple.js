// 简化测试版本
// console.log('=== DOM监听器简化测试脚本开始 ===');

// 创建一个简单的按钮来测试
function createTestButton() {
    // console.log('创建测试按钮');

    // 检查是否已存在
    if (document.getElementById('testButton')) {
        // console.log('测试按钮已存在');
        return;
    }

    const button = document.createElement('button');
    button.id = 'testButton';
    button.textContent = '🔍 测试';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: red;
        color: white;
        border: none;
        border-radius: 50%;
        z-index: 999999;
        cursor: pointer;
        font-size: 20px;
    `;

    document.body.appendChild(button);
    // console.log('测试按钮已创建');

    button.addEventListener('click', () => {
        alert('测试按钮工作正常！');
    });
}

// 尝试不同的时机创建按钮
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTestButton);
    // console.log('等待DOM加载完成');
} else {
    createTestButton();
    // console.log('立即创建测试按钮');
}

// 额外保险
setTimeout(createTestButton, 1000);

// console.log('=== DOM监听器简化测试脚本结束 ===');