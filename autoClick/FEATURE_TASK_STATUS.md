元素# 任务状态显示功能说明

## 🎯 功能概述

为任务列表添加了实时状态显示功能，让用户能够清楚地看到：
1. **执行次数** - 任务已经执行了多少次
2. **下次执行时间** - 距离下次执行还有多长时间（实时倒计时）

---

## ✨ 新增功能

### 1. 执行次数显示

**显示位置**：任务信息区域

**显示格式**：
- 单次触发且已完成：`已执行 1 次`
- 其他情况：`已执行 X 次`

**特点**：
- ✅ 绿色高亮显示
- ✅ 每次执行后自动更新
- ✅ 持久化保存到Storage

---

### 2. 下次执行时间倒计时

**显示位置**：任务信息区域

**显示格式**：
- `即将执行` - 1秒内执行
- `X秒后` - 不到1分钟
- `X分钟Y秒后` - 不到1小时
- `X小时Y分钟Z秒后` - 超过1小时

**特点**：
- ✅ 红色高亮显示
- ✅ 每秒实时更新
- ✅ 脉冲动画效果
- ✅ 智能计算（考虑频率、时间设置等）

---

## 🔧 技术实现

### 前端实现（popup.js）

#### 1. 修改createTaskHTML函数

添加执行次数和下次执行时间的显示：

```javascript
// 计算执行次数
const execCount = task.executionCount || 0;
const execCountText = task.triggerMode === 'single' && task.status === 'completed' 
    ? '已执行 1 次' 
    : `已执行 ${execCount} 次`;

// 计算下次执行时间
const nextRunText = getNextRunTimeText(task);

// 在HTML中显示
<div><label>执行次数:</label><span class="exec-count">${execCountText}</span></div>
${nextRunText ? `<div><label>下次执行:</label><span class="next-run-time">${nextRunText.text}</span></div>` : ''}
```

#### 2. 添加getNextRunTimeText函数

智能计算下次执行时间：

```javascript
function getNextRunTimeText(task) {
    // 如果任务已禁用或已完成，不显示
    if (!task.enabled || task.status === 'completed') {
        return null;
    }
    
    // 根据任务配置计算下次执行时间
    // - 考虑频率设置（intervalMinutes）
    // - 考虑具体时间设置（execTime）
    // - 考虑上次执行时间（lastExecuted）
    // - 返回格式化的倒计时文本
    
    return {
        text: 'X小时Y分钟Z秒后',
        timestamp: 下次执行的Unix时间戳
    };
}
```

#### 3. 添加倒计时定时器

每秒更新倒计时显示：

```javascript
let countdownTimerId = null;

function startCountdownTimer() {
    // 清除旧的定时器
    if (countdownTimerId) {
        clearInterval(countdownTimerId);
    }
    
    // 每秒更新一次
    countdownTimerId = setInterval(() => {
        updateCountdownDisplay();
    }, 1000);
}

function updateCountdownDisplay() {
    // 遍历所有任务的下次执行时间元素
    // 根据timestamp重新计算剩余时间
    // 更新显示文本
}
```

---

### 后端实现（background.js）

#### 修改updateTaskAfterExecution函数

在任务执行后增加执行次数：

```javascript
async function updateTaskAfterExecution(task) {
    // ... 获取任务列表
    
    // 增加执行次数
    if (!allTasks[taskIndex].executionCount) {
        allTasks[taskIndex].executionCount = 0;
    }
    allTasks[taskIndex].executionCount++;
    console.log(`[任务状态] 任务 "${task.name}" 执行次数: ${allTasks[taskIndex].executionCount}`);
    
    // ... 保存任务列表
}
```

---

### CSS样式（popup.html）

添加视觉效果：

```css
/* 执行次数样式 - 绿色 */
.exec-count {
    color: #27ae60;
    font-weight: 600;
}

/* 下次执行时间样式 - 红色 + 脉冲动画 */
.next-run-time {
    color: #e74c3c;
    font-weight: 600;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

---

## 📋 使用示例

### 示例1：单次触发任务

```
创建任务：
- 名称：提交表单
- 选择器：#submit-btn
- 触发模式：单次触发

执行前显示：
┌─────────────────────────────┐
│ 提交表单              [启用] │
│ 目标元素: #submit-btn       │
│ 执行时间: 立即执行          │
│ 执行频率: 无间隔            │
│ 触发模式: 单次触发          │
│ 执行次数: 已执行 0 次       │
│ 下次执行: 即将执行          │ ← 红色闪烁
└─────────────────────────────┘

执行后显示：
┌─────────────────────────────┐
│ 提交表单           [已完成]  │
│ 目标元素: #submit-btn       │
│ 执行时间: 立即执行          │
│ 执行频率: 无间隔            │
│ 触发模式: 单次触发          │
│ 执行次数: 已执行 1 次       │ ← 绿色
└─────────────────────────────┘
```

---

### 示例2：循环任务（每5分钟）

```
创建任务：
- 名称：刷新页面
- 选择器：#refresh-btn
- 触发模式：循环触发
- 执行频率：每 5 分钟

运行时显示：
┌─────────────────────────────┐
│ 刷新页面              [启用] │
│ 目标元素: #refresh-btn      │
│ 执行时间: 立即执行          │
│ 执行频率: 每 5 分钟         │
│ 触发模式: 循环触发 (每天)   │
│ 执行次数: 已执行 3 次       │ ← 绿色
│ 下次执行: 2分钟35秒后       │ ← 红色闪烁，每秒更新
└─────────────────────────────┘

倒计时变化：
2分钟35秒后 → 2分钟34秒后 → 2分钟33秒后 → ... → 即将执行
```

---

### 示例3：定时任务（每天10:30）

```
创建任务：
- 名称：每日备份
- 选择器：#backup-btn
- 执行时间：10:30
- 触发模式：循环触发

当前时间：09:15

显示：
┌─────────────────────────────┐
│ 每日备份              [启用] │
│ 目标元素: #backup-btn       │
│ 执行时间: 每天 10:30        │
│ 执行频率: 无间隔            │
│ 触发模式: 循环触发 (每天)   │
│ 执行次数: 已执行 5 次       │
│ 下次执行: 1小时15分钟后     │ ← 红色闪烁
└─────────────────────────────┘
```

---

## 🎨 视觉效果

### 颜色方案

| 元素 | 颜色 | 说明 |
|------|------|------|
| 执行次数 | #27ae60 (绿色) | 表示已完成的动作 |
| 下次执行 | #e74c3c (红色) | 表示即将到来的事件 |

### 动画效果

**脉冲动画**：
- 持续时间：2秒
- 效果：透明度从1 → 0.7 → 1
- 目的：吸引用户注意力

---

## 🔍 计算逻辑

### 下次执行时间计算规则

#### 场景1：有频率设置

```javascript
if (task.freqMode === 'interval' && task.intervalMinutes) {
    if (task.lastExecuted) {
        // 基于上次执行时间 + 间隔
        nextTime = lastExecuted + intervalMinutes * 60 * 1000
    } else {
        // 首次执行
        if (有设定时间) {
            nextTime = 今天的设定时间（或明天）
        } else {
            nextTime = 立即（1秒后）
        }
    }
}
```

#### 场景2：无频率设置

```javascript
else {
    if (有设定时间) {
        nextTime = 今天的设定时间（或明天）
    } else {
        nextTime = 立即（1秒后）
    }
}
```

#### 场景3：任务已禁用或已完成

```javascript
if (!task.enabled || task.status === 'completed') {
    return null;  // 不显示下次执行时间
}
```

---

## 💡 使用提示

### 如何查看执行状态

1. **打开插件弹窗**
   - 点击浏览器工具栏的插件图标 🎯

2. **查看任务列表**
   - 每个任务都会显示执行次数
   - 启用的任务会显示下次执行时间

3. **观察倒计时**
   - 红色文字每秒更新
   - 脉冲动画提醒注意

---

### 注意事项

1. **执行次数统计**
   - 从任务创建开始累计
   - 删除任务后统计数据清空
   - 编辑任务不会重置计数

2. **倒计时精度**
   - 每秒更新一次
   - 实际执行时间可能有±1秒误差
   - 这是正常的浏览器行为

3. **性能影响**
   - 定时器每秒执行一次
   - 只更新DOM文本，性能开销极小
   - 关闭弹窗后定时器自动停止

---

## 🐛 故障排查

### 问题1：执行次数不更新

**可能原因**：
- Background未正确更新任务
- Storage同步延迟

**解决**：
1. 查看Background Console日志
2. 确认看到"[任务状态] 任务 XXX 执行次数: X"
3. 刷新弹窗重新加载

---

### 问题2：倒计时不更新

**可能原因**：
- 定时器未启动
- JavaScript错误

**解决**：
1. 打开Popup Console
2. 查看是否有错误
3. 确认看到"[UI] 加载了 X 个任务"
4. 检查是否有"startCountdownTimer"相关日志

---

### 问题3：下次执行时间不准确

**可能原因**：
- 任务配置复杂
- 时区问题

**解决**：
1. 检查任务的时间设置
2. 确认系统时间和时区正确
3. 查看Background Console的调度日志

---

## ✨ 总结

**新增功能**：
- ✅ 执行次数显示（绿色）
- ✅ 下次执行倒计时（红色+动画）
- ✅ 每秒实时更新
- ✅ 智能计算逻辑

**用户体验提升**：
- ✅ 清楚知道任务执行了多少次
- ✅ 实时了解下次执行时间
- ✅ 直观的视觉反馈
- ✅ 便于监控和管理任务

**技术亮点**：
- ✅ 前后端协同更新
- ✅ 高效的定时器管理
- ✅ 智能的时间计算
- ✅ 优雅的动画效果

---

**版本**：v1.1  
**更新日期**：2026-06-03  
**状态**：✅ 已完成并验证
