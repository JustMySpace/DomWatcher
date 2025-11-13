// 生成图标文件 - 这个文件用于生成图标，不需要包含在最终的扩展包中

const fs = require('fs');
const { createCanvas } = require('canvas');

// 生成不同尺寸的图标
function generateIcons() {
    const sizes = [16, 32, 48, 128];

    sizes.forEach(size => {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // 绘制背景
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(0, 0, size, size);

        // 绘制放大镜图标
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, size / 16);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.3;

        // 画圆形
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // 画手柄
        ctx.beginPath();
        ctx.moveTo(centerX + radius * 0.7, centerY + radius * 0.7);
        ctx.lineTo(centerX + radius * 1.3, centerY + radius * 1.3);
        ctx.stroke();

        // 保存为PNG
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`icon${size}.png`, buffer);

        console.log(`Generated icon${size}.png`);
    });
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateIcons };
}