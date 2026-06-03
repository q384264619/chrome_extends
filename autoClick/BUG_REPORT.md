# 业务逻辑问题检测与修复报告

## 📋 检测日期
2026-06-03

## 🔍 发现的问题

### ❌ 问题1：toggleTask函数使用了未定义的storageSet

**位置**：popup.js 第478行

**问题代码**：
```javascript
async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.enabled = !task.enabled;
        await storageSet({ tasks });  // ❌ storageSet 未定义
        
        chrome.runtime.sendMessage({
            type: 'TASKS_UPDATED',
            tasks: tasks
        });
        
        renderTaskList();
    }
}
```

**影响**：
- 切换任务启用/禁用状态时会报错
- 任务状态无法保存
- 用户操作无响应

**修复方案**：
使用 `chrome.storage.sync.set` 替代 `storageSet`

---

### ❌ 问题2：deleteTask函数使用了未定义的storageSet

**位置**：popup.js 第500行左右

**问题代码**：
```javascript
async function deleteTask(taskId) {
    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(t => t.id !== taskId);
        await storageSet({ tasks });  // ❌ storageSet 未定义
        
        chrome.runtime.sendMessage({
            type: 'TASKS_UPDATED',
            tasks: tasks
        });
        
        renderTaskList();
    }
}
```

**影响**：
- 删除任务时会报错
- 任务无法被删除
- 数据不一致

**修复方案**：
使用 `chrome.storage.sync.set` 替代 `storageSet`

---

### ⚠️ 问题3：消息发送缺少错误处理

**位置**：popup.js 多处

**问题代码**：
```javascript
// toggleTask 和 deleteTask 中
chrome.runtime.sendMessage({
    type: 'TASKS_UPDATED',
    tasks: tasks
});
// ❌ 没有回调函数，无法知道是否成功
```

**影响**：
- 无法检测消息是否发送成功
- Background未就绪时静默失败
- 难以调试

**修复方案**：
添加回调函数检查 `chrome.runtime.lastError`

---

### ⚠️ 问题4：validateForm中的cycleError元素不存在

**位置**：popup.js 第410-420行

**问题代码**：
```javascript
if (cycleType === 'weekly') {
    const selectedWeekdays = Array.from(document.querySelectorAll('#weeklyOptions input:checked'))
        .map(cb => parseInt(cb.value));
    if (selectedWeekdays.length === 0) {
        showError('cycleError', '请选择至少一个星期');  // ❌ cycleError元素不存在
        isValid = false;
    }
}
```

**影响**：
- 验证错误无法显示
- 用户可以提交无效的循环配置
- 可能导致调度失败

**修复方案**：
在popup.html中添加cycleError元素，或使用现有的错误提示方式

---

### ⚠️ 问题5：编辑任务时未保留原有属性

**位置**：popup.js 第317行

**问题代码**：
```javascript
if (editingTaskId) {
    // 更新任务
    const index = tasks.findIndex(t => t.id === editingTaskId);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...formData };  // ⚠️ 可能覆盖重要属性
    }
}
```

**潜在风险**：
- 如果formData中包含undefined值，可能覆盖原有的有效值
- lastExecuted、createdAt等系统字段可能被意外修改

**修复方案**：
只更新用户可编辑的字段，保留系统字段

---

### ⚠️ 问题6：时间+频率组合逻辑不完整

**位置**：background.js calculateNextRunTime函数

**当前逻辑**：
```javascript
// 如果设定了具体时间
if (task.timeMode === 'specific' && task.execTime) {
    // 设置今天的指定时间，或明天
}

// 如果有频率，创建周期性闹钟
if (task.freqMode === 'interval' && interval > 0) {
    alarmOptions.periodInMinutes = interval;
}
```

**问题**：
- 需求要求："同时设定时间与频率：在指定时间首次执行，后续按频率循环执行"
- 当前实现：设置了periodInMinutes后，闹钟会从首次执行时间开始每隔X分钟执行
- **这是正确的**，但需要验证是否符合预期

---

### ✅ 问题7：单次触发逻辑正确

**检查结果**：
```javascript
// 单次触发且已执行过
if (task.triggerMode === 'single' && task.lastExecuted) {
    return null;  // ✅ 正确：不再调度
}

// 执行后标记为完成
if (task.triggerMode === 'single') {
    task.status = 'completed';
    task.enabled = false;  // ✅ 正确：自动禁用
}
```

**结论**：单次触发逻辑正确 ✅

---

### ✅ 问题8：节假日跳过逻辑正确

**检查结果**：
```javascript
async function isDateValidForCycle(date, task) {
    if (task.skipHolidays) {
        const isHoliday = await holidayManager.isHoliday(date);
        if (isHoliday) {
            return false;  // ✅ 正确：跳过节假日
        }
    }
    // ... 其他检查
}
```

**结论**：节假日跳过逻辑正确 ✅

---

## 🔧 修复方案

### 修复1：替换storageSet为chrome.storage.sync.set

**文件**：popup.js

**修改位置**：
1. toggleTask函数（约478行）
2. deleteTask函数（约500行）

---

### 修复2：添加消息发送的错误处理

**文件**：popup.js

**修改位置**：
1. toggleTask函数
2. deleteTask函数

---

### 修复3：添加cycleError元素或改进验证提示

**文件**：popup.html + popup.js

**方案A**：在HTML中添加cycleError元素
**方案B**：使用alert或其他提示方式

---

### 修复4：优化编辑任务的属性合并

**文件**：popup.js

**修改**：明确指定要更新的字段，避免覆盖系统字段

---

## 📊 优先级排序

| 优先级 | 问题 | 影响 | 修复难度 |
|--------|------|------|----------|
| 🔴 P0 | storageSet未定义 | 功能完全不可用 | 低 |
| 🟡 P1 | 消息发送无错误处理 | 难以调试 | 低 |
| 🟡 P1 | cycleError元素缺失 | 验证失效 | 低 |
| 🟢 P2 | 编辑任务属性合并 | 潜在风险 | 中 |
| 🟢 P3 | 时间+频率逻辑验证 | 需确认需求 | 低 |

---

## ✅ 立即执行的修复

我将立即修复P0和P1级别的问题。
