# 节假日功能说明

## 📅 功能概述

自动点击助手现已集成中国节假日数据，支持智能跳过节假日执行任务。

## ✨ 主要特性

### 1. 自动获取节假日数据

- **数据源**：从 `https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayCal.ics` 获取官方节假日数据
- **格式**：ICS格式（iCalendar标准）
- **内容**：包含法定节假日、调休安排等

### 2. 智能缓存机制

- **本地缓存**：首次获取后保存到 `chrome.storage.local`
- **缓存有效期**：7天
- **自动更新**：超过7天后自动重新获取
- **手动刷新**：用户可随时手动刷新

### 3. 节假日判断逻辑

```javascript
// 判断某天是否是节假日
await holidayManager.isHoliday(date)  // 返回 true/false

// 判断某天是否是工作日（考虑调休）
await holidayManager.isWorkday(date)  // 返回 true/false
```

### 4. 在任务中使用

创建或编辑任务时，勾选"智能跳过节假日期"选项：

1. 打开插件弹窗
2. 添加或编辑任务
3. 选择"循环触发"模式
4. 勾选"智能跳过节假日期"复选框
5. 保存任务

系统会自动跳过以下日期：
- 法定节假日（元旦、春节、清明、劳动节、端午、中秋、国庆等）
- 周末（周六、周日）
- 其他官方公布的休息日

## 🔧 技术实现

### 文件结构

```
autoClick/
├── holidayManager.js      # 节假日管理模块
├── background.js          # 集成节假日检查
└── popup.html             # 添加刷新按钮
```

### HolidayManager类

```javascript
class HolidayManager {
    // 从ICS文件获取节假日数据
    async fetchHolidays()
    
    // 解析ICS格式
    parseICS(icsText)
    
    // 检查是否是节假日
    async isHoliday(date)
    
    // 检查是否是工作日
    async isWorkday(date)
    
    // 缓存管理
    saveToStorage()
    loadFromStorage()
    clearCache()
}
```

### ICS格式解析

ICS文件格式示例：
```
BEGIN:VEVENT
DTSTART;VALUE=DATE:20240101
SUMMARY:元旦节
END:VEVENT
```

解析逻辑：
1. 查找 `BEGIN:VEVENT` 和 `END:VEVENT` 之间的事件
2. 提取 `DTSTART` 的日期（格式：YYYYMMDD）
3. 检查 `SUMMARY` 是否包含"休"、"假"、"节"等关键字
4. 将符合条件的日期添加到节假日集合

### 背景服务集成

在 `background.js` 中：

```javascript
// 初始化时加载节假日数据
chrome.runtime.onInstalled.addListener(async () => {
    await holidayManager.fetchHolidays();
    await initializeTasks();
});

// 调度任务时检查节假日
async function isDateValidForCycle(date, task) {
    if (task.skipHolidays) {
        const isHoliday = await holidayManager.isHoliday(date);
        if (isHoliday) {
            return false; // 跳过节假日
        }
    }
    // ... 其他检查
}
```

## 🎯 使用场景

### 场景1：工作日签到

```
任务名称：工作日签到
目标元素：.checkin-btn
执行时间：09:00
触发模式：循环触发 - 每天
☑️ 智能跳过节假日期
```

**效果**：
- ✅ 周一至周五自动执行
- ❌ 周六、周日自动跳过
- ❌ 法定节假日自动跳过

### 场景2：每周一例会提醒

```
任务名称：例会提醒
目标元素：#meeting-btn
执行时间：10:00
触发模式：循环触发 - 每周
选择：星期一
☑️ 智能跳过节假日期
```

**效果**：
- ✅ 每周一执行
- ❌ 如果周一是节假日，自动跳过

### 场景3：每月1号发工资提醒

```
任务名称：工资提醒
目标元素：#salary-btn
执行时间：10:00
触发模式：循环触发 - 每月
日期：1
☑️ 智能跳过节假日期
```

**效果**：
- ✅ 每月1号执行
- ❌ 如果1号是节假日，自动跳过并顺延到下一个工作日

## 🔄 手动刷新节假日

### 方法1：通过UI刷新

1. 打开插件弹窗
2. 点击右上角的"🔄 节假日"按钮
3. 等待刷新完成（约1-2秒）
4. 看到"✅ 已更新"提示

### 方法2：通过消息API刷新

```javascript
chrome.runtime.sendMessage({ type: 'REFRESH_HOLIDAYS' }, (response) => {
    if (response.success) {
        console.log('节假日数据已更新');
    }
});
```

### 方法3：清除缓存重新获取

```javascript
// 在控制台执行
holidayManager.clearCache().then(() => {
    return holidayManager.fetchHolidays();
});
```

## 📊 数据说明

### 节假日类型

系统识别以下类型的节假日：

1. **固定节假日**
   - 元旦（1月1日）
   - 劳动节（5月1日）
   - 国庆节（10月1日-7日）
   - 等等

2. **农历节假日**
   - 春节（农历正月初一）
   - 清明节（农历清明）
   - 端午节（农历五月初五）
   - 中秋节（农历八月十五）
   - 等等

3. **调休安排**
   - 官方公布的调休工作日/休息日

### 数据来源

- **主数据源**：GitHub上的 `china-holiday-calender` 项目
- **更新频率**：每年年底发布下一年的节假日数据
- **权威性**：基于国务院办公厅发布的官方安排

## ⚠️ 注意事项

### 1. 网络依赖

- 首次使用需要联网获取数据
- 之后可以使用缓存数据（7天内有效）
- 如果网络不可用，会使用本地缓存

### 2. 数据时效性

- 缓存有效期为7天
- 建议定期手动刷新以获取最新数据
- 特别是临近节假日时

### 3. 准确性

- 基于官方发布的节假日安排
- 包含调休等特殊安排
- 如有政策调整，需要刷新数据

### 4. 性能影响

- 节假日检查异步执行，不影响主流程
- 缓存机制减少网络请求
- 对任务调度性能影响极小

## 🐛 故障排查

### 问题1：节假日刷新失败

**症状**：点击刷新按钮后显示"❌ 失败"

**解决方法**：
1. 检查网络连接是否正常
2. 查看Console日志了解详细错误
3. 尝试再次刷新
4. 如果持续失败，可以继续使用缓存数据

### 问题2：节假日判断不准确

**症状**：任务在节假日仍然执行

**解决方法**：
1. 确认任务已勾选"智能跳过节假日期"
2. 手动刷新节假日数据
3. 检查Console日志中的节假日检查结果
4. 确认日期格式正确

### 问题3：缓存数据过期

**症状**：Console显示"缓存已过期"

**解决方法**：
1. 手动刷新节假日数据
2. 或等待下次任务调度时自动刷新

## 📝 开发指南

### 扩展节假日来源

如果需要添加其他数据源，修改 `holidayManager.js`：

```javascript
async fetchHolidays() {
    // 尝试主数据源
    try {
        const response = await fetch('主数据源URL');
        // ... 解析逻辑
    } catch (error) {
        // 尝试备用数据源
        const response = await fetch('备用数据源URL');
        // ... 解析逻辑
    }
}
```

### 自定义节假日判断

可以添加自定义的节假日规则：

```javascript
async isHoliday(date) {
    // 先检查官方节假日
    const isOfficialHoliday = await this.checkOfficialHolidays(date);
    
    // 再检查自定义规则
    const isCustomHoliday = this.checkCustomRules(date);
    
    return isOfficialHoliday || isCustomHoliday;
}
```

## 🎉 总结

节假日功能为自动点击助手增添了智能化特性：

- ✅ 自动获取官方节假日数据
- ✅ 智能缓存减少网络请求
- ✅ 准确判断工作日和休息日
- ✅ 简单易用的UI操作
- ✅ 完善的错误处理

让您的自动化任务更加智能和人性化！
