# 插件问题诊断指南

## 🔍 常见问题排查

### 问题1：无法添加任务

**症状**：点击"保存"按钮后没有反应或报错

**诊断步骤**：

#### 步骤1：检查Console错误

1. 打开插件弹窗
2. 右键点击弹窗 → "检查弹出内容"
3. 查看Console标签的错误信息

**常见错误及解决**：

```javascript
// 错误1: storage API不可用
Error: chrome.storage is undefined
→ 解决：确认manifest.json中已声明"storage"权限

// 错误2: 表单验证失败
错误：请输入任务名称 / 请输入CSS选择器
→ 解决：确保填写了所有必填字段

// 错误3: sendMessage失败
Error: Could not establish connection
→ 解决：重新加载插件，确保background.js正常运行
```

#### 步骤2：检查Storage权限

在popup的Console中执行：
```javascript
// 测试storage是否可用
chrome.storage.sync.get(['test'], (result) => {
    console.log('Storage测试结果:', result);
});

// 应该输出: Storage测试结果: {}
// 如果报错，说明权限配置有问题
```

#### 步骤3：检查manifest.json

确认包含以下权限：
```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "alarms",
    "notifications"
  ]
}
```

---

### 问题2：任务添加成功但不执行

**症状**：任务出现在列表中，但到达时间后没有执行

**诊断步骤**：

#### 步骤1：检查Background Service Worker

1. 打开 `chrome://extensions/`
2. 找到"自动点击助手"
3. 点击"service worker"链接
4. 查看Console日志

**预期日志**：
```javascript
[自动点击助手] 初始化 X 个任务
[任务调度] 任务 "XXX" 将在 XXXX-XX-XX XX:XX:XX 执行
```

**如果没有日志**：
- Background可能未正确加载
- 尝试刷新插件（chrome://extensions/ → 刷新按钮）

#### 步骤2：检查闹钟是否创建

在background的Console中执行：
```javascript
// 查看所有闹钟
chrome.alarms.getAll((alarms) => {
    console.log('当前闹钟:', alarms);
});

// 应该看到类似：
// [{ name: "task_xxx", scheduledTime: xxx }]
```

**如果没有闹钟**：
- 任务可能被禁用
- 任务状态可能是"completed"
- 时间计算可能有问题

#### 步骤3：手动触发测试

在background的Console中执行：
```javascript
// 获取所有任务
chrome.storage.sync.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    console.log('所有任务:', tasks);
    
    // 找到一个启用的任务
    const task = tasks.find(t => t.enabled && t.status !== 'completed');
    if (task) {
        console.log('测试任务:', task);
        // 手动执行
        executeTask(task);
    }
});
```

---

### 问题3：点击元素失败

**症状**：任务执行了，但页面上的元素没有被点击

**诊断步骤**：

#### 步骤1：检查目标页面

1. 确保目标页面已打开
2. 按F12打开开发者工具
3. 查看Console日志

**预期日志**：
```javascript
[自动点击助手] 成功点击元素: #your-selector
```

**可能的错误**：
```javascript
// 错误1: 元素未找到
[自动点击助手] 未找到选择器 "#xxx" 对应的元素
→ 解决：检查选择器是否正确

// 错误2: 元素不可见
[自动点击助手] 元素 "#xxx" 不可见或不可交互
→ 解决：确保元素可见且未被禁用

// 错误3: 跨域限制
Error: Cannot access contents of the page
→ 解决：确认host_permissions配置正确
```

#### 步骤2：测试选择器

在目标页面的Console中执行：
```javascript
// 测试选择器是否能找到元素
const element = document.querySelector('#your-selector');
console.log('找到的元素:', element);

// 检查元素是否可见
const style = window.getComputedStyle(element);
console.log('display:', style.display);
console.log('visibility:', style.visibility);
console.log('尺寸:', element.offsetWidth, 'x', element.offsetHeight);
```

---

## 🛠️ 完整诊断脚本

在浏览器Console中执行以下代码进行全面诊断：

```javascript
// ===== 自动点击助手诊断脚本 =====

console.log('=== 开始诊断 ===\n');

// 1. 检查扩展权限
console.log('1. 检查权限配置...');
chrome.permissions.getAll((permissions) => {
    console.log('  已授予权限:', permissions);
});

// 2. 检查Storage
console.log('\n2. 检查Storage...');
chrome.storage.sync.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    console.log(`  任务数量: ${tasks.length}`);
    console.log('  任务列表:', tasks.map(t => ({
        id: t.id,
        name: t.name,
        enabled: t.enabled,
        status: t.status
    })));
});

// 3. 检查Alarms
console.log('\n3. 检查Alarms...');
chrome.alarms.getAll((alarms) => {
    console.log(`  闹钟数量: ${alarms.length}`);
    console.log('  闹钟列表:', alarms.map(a => ({
        name: a.name,
        scheduledTime: new Date(a.scheduledTime).toLocaleString()
    })));
});

// 4. 检查Runtime
console.log('\n4. 检查Runtime...');
console.log('  Extension ID:', chrome.runtime.id);
console.log('  Manifest Version:', chrome.runtime.getManifest().manifest_version);

console.log('\n=== 诊断完成 ===');
```

---

## ✅ 快速修复步骤

如果遇到问题，按以下步骤操作：

### 步骤1：完全重新加载插件

1. 打开 `chrome://extensions/`
2. 找到"自动点击助手"
3. 点击"移除"
4. 重新点击"加载已解压的扩展程序"
5. 选择 autoClick 文件夹

### 步骤2：清除Storage数据

在background的Console中执行：
```javascript
// 清除所有任务数据
chrome.storage.sync.clear(() => {
    console.log('Storage已清除');
    // 重新加载插件
});
```

### 步骤3：检查文件完整性

运行测试脚本：
```bash
cd /Users/petter.he/chrome_extends/autoClick
bash test.sh
```

### 步骤4：查看详细日志

1. 打开Popup Console（右键弹窗 → 检查）
2. 打开Background Console（chrome://extensions/ → service worker）
3. 打开目标页面Console（F12）
4. 重现问题
5. 查看三个Console的日志

---

## 📋 检查清单

安装和使用时请确认：

- [ ] Chrome版本 ≥ 88（支持Manifest V3）
- [ ] 开发者模式已开启
- [ ] 插件已成功加载（工具栏显示图标）
- [ ] manifest.json包含所有必要权限
- [ ] 所有JS文件语法正确（运行test.sh）
- [ ] Background Service Worker正常运行
- [ ] 目标页面已打开
- [ ] CSS选择器正确（在Console测试）
- [ ] 元素可见且可交互
- [ ] 网络连接正常（用于节假日数据）

---

## 🐛 已知问题和解决

### 问题：首次安装后任务不执行

**原因**：Background Service Worker可能需要时间初始化

**解决**：
1. 等待10-30秒
2. 或刷新插件
3. 或重启浏览器

### 问题：消息通信失败

**原因**：Service Worker可能处于休眠状态

**解决**：
```javascript
// 在popup.js中，sendMessage时添加回调
chrome.runtime.sendMessage({ type: 'TASKS_UPDATED', tasks }, (response) => {
    if (chrome.runtime.lastError) {
        console.warn('Background未就绪，稍后重试');
        // 可以添加重试逻辑
    }
});
```

### 问题：跨域脚本注入失败

**原因**：某些网站有严格的CSP策略

**解决**：
- 确认host_permissions设置为"<all_urls>"
- 或使用declarativeContent API

---

## 📞 获取帮助

如果以上方法都无法解决问题：

1. **收集信息**：
   - Chrome版本号
   - 操作系统版本
   - Console错误截图
   - manifest.json内容
   - 任务配置详情

2. **查看日志**：
   - Popup Console日志
   - Background Console日志
   - 目标页面Console日志

3. **提供复现步骤**：
   - 详细操作步骤
   - 预期结果
   - 实际结果

---

**最后更新**：2026-06-03
