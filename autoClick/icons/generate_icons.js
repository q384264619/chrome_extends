#!/usr/bin/env node

/**
 * 图标生成脚本
 * 由于无法直接使用canvas，这里提供手动创建图标的说明
 */

const fs = require('fs');
const path = require('path');

console.log('=== 自动点击助手 - 图标生成说明 ===\n');

const iconDir = __dirname;
const sizes = [16, 48, 128];

console.log('请按照以下步骤创建图标文件：\n');
console.log('方法1：使用在线工具（推荐）');
console.log('1. 访问 https://favicon.io/ 或 https://realfavicongenerator.net/');
console.log('2. 上传一个靶心图案的图片或使用文字"⌖"');
console.log('3. 下载生成的图标文件');
console.log('4. 将文件重命名为 icon16.png, icon48.png, icon128.png');
console.log('5. 放置到 icons 文件夹中\n');

console.log('方法2：使用设计软件');
console.log('1. 使用 Photoshop、GIMP 或其他图片编辑软件');
console.log('2. 创建三个尺寸的画布：16x16, 48x48, 128x128');
console.log('3. 绘制蓝色圆形背景 (#3498db)');
console.log('4. 添加白色靶心图案');
console.log('5. 导出为 PNG 格式\n');

console.log('方法3：使用SVG转换（如果有ImageMagick）');
console.log('运行命令：');
sizes.forEach(size => {
    console.log(`  convert icon.svg -resize ${size}x${size} icon${size}.png`);
});
console.log('');

console.log('临时方案：');
console.log('如果暂时没有图标，插件仍可正常使用，只是不会显示自定义图标。\n');

// 检查是否已有图标文件
let hasIcons = true;
sizes.forEach(size => {
    const iconPath = path.join(iconDir, `icon${size}.png`);
    if (!fs.existsSync(iconPath)) {
        console.log(`⚠️  缺少: icon${size}.png`);
        hasIcons = false;
    }
});

if (hasIcons) {
    console.log('✅ 所有图标文件已存在');
} else {
    console.log('\n请创建缺失的图标文件后重新加载插件');
}
