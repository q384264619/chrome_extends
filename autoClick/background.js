// background.js - 后台服务逻辑

// 节假日管理模块（内联到background.js以避免模块导入问题）
class HolidayManager {
    constructor() {
        this.holidays = new Set();
        this.lastFetchDate = null;
        this.cacheExpiryDays = 7; // 缓存7天
    }

    // 从ICS文件获取节假日数据
    async fetchHolidays() {
        try {
            // 检查缓存是否有效
            if (this.isCacheValid()) {
                console.log('[节假日] 使用缓存数据');
                return this.holidays;
            }

            console.log('[节假日] 开始获取节假日数据...');

            // 尝试从GitHub获取ICS文件
            const response = await fetch('https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayCal.ics');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const icsText = await response.text();
            this.parseICS(icsText);

            // 更新缓存时间
            this.lastFetchDate = new Date();

            // 保存到storage
            await this.saveToStorage();

            console.log(`[节假日] 成功获取 ${this.holidays.size} 个节假日`);
            return this.holidays;

        } catch (error) {
            console.error('[节假日] 获取失败:', error);
            // 如果获取失败，尝试从storage加载缓存
            await this.loadFromStorage();
            return this.holidays;
        }
    }

    // 解析ICS文件格式
    parseICS(icsText) {
        this.holidays.clear();

        const lines = icsText.split('\n');
        let currentDate = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 查找VEVENT开始
            if (line === 'BEGIN:VEVENT') {
                currentDate = null;
            }

            // 提取日期（DTSTART格式：20240101）
            if (line.startsWith('DTSTART;VALUE=DATE:')) {
                const dateStr = line.replace('DTSTART;VALUE=DATE:', '');
                // 转换为 YYYY-MM-DD 格式
                if (dateStr.length === 8) {
                    const year = dateStr.substring(0, 4);
                    const month = dateStr.substring(4, 6);
                    const day = dateStr.substring(6, 8);
                    currentDate = `${year}-${month}-${day}`;
                }
            }

            // 检查是否是节假日（通过SUMMARY判断）
            if (line.startsWith('SUMMARY:') && currentDate) {
                const summary = line.replace('SUMMARY:', '').trim();
                // 如果摘要包含"休"或"假"，则是节假日
                if (summary.includes('休') || summary.includes('假') || summary.includes('节')) {
                    this.holidays.add(currentDate);
                }
            }

            // VEVENT结束
            if (line === 'END:VEVENT') {
                currentDate = null;
            }
        }
    }

    // 检查日期是否是节假日
    async isHoliday(date) {
        // 确保已加载节假日数据
        if (this.holidays.size === 0) {
            await this.fetchHolidays();
        }

        // 格式化日期为 YYYY-MM-DD
        const dateStr = this.formatDate(date);
        return this.holidays.has(dateStr);
    }

    // 检查日期是否是工作日（考虑调休）
    async isWorkday(date) {
        const isHoliday = await this.isHoliday(date);
        const dayOfWeek = date.getDay();

        // 周末且不是节假日 = 休息日
        // 工作日且不是节假日 = 工作日
        // 节假日 = 休息日
        return !isHoliday && dayOfWeek !== 0 && dayOfWeek !== 6;
    }

    // 格式化日期
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 检查缓存是否有效
    isCacheValid() {
        if (!this.lastFetchDate) return false;

        const now = new Date();
        const diffDays = (now - this.lastFetchDate) / (1000 * 60 * 60 * 24);
        return diffDays < this.cacheExpiryDays;
    }

    // 保存到storage
    async saveToStorage() {
        try {
            const data = {
                holidays: Array.from(this.holidays),
                lastFetchDate: this.lastFetchDate ? this.lastFetchDate.toISOString() : null
            };
            await chrome.storage.local.set({ holidayCache: data });
            console.log('[节假日] 缓存已保存');
        } catch (error) {
            console.error('[节假日] 保存缓存失败:', error);
        }
    }

    // 从storage加载
    async loadFromStorage() {
        try {
            const result = await chrome.storage.local.get(['holidayCache']);
            if (result.holidayCache) {
                this.holidays = new Set(result.holidayCache.holidays || []);
                this.lastFetchDate = result.holidayCache.lastFetchDate
                    ? new Date(result.holidayCache.lastFetchDate)
                    : null;
                console.log(`[节假日] 从缓存加载 ${this.holidays.size} 个节假日`);
            }
        } catch (error) {
            console.error('[节假日] 加载缓存失败:', error);
        }
    }

    // 清除缓存
    async clearCache() {
        this.holidays.clear();
        this.lastFetchDate = null;
        await chrome.storage.local.remove(['holidayCache']);
        console.log('[节假日] 缓存已清除');
    }
}

// 创建全局实例
const holidayManager = new HolidayManager();

// 工具函数：包装Chrome API为Promise
function storageGet(keys) {
    return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

function storageSet(items) {
    return new Promise(resolve => chrome.storage.sync.set(items, resolve));
}

function alarmsClearAll() {
    return new Promise(resolve => chrome.alarms.clearAll(resolve));
}

// 监听插件安装和启动事件
chrome.runtime.onInstalled.addListener(async () => {
    console.log('[自动点击助手] 插件已安装');
    // 初始化节假日数据
    await holidayManager.fetchHolidays();
    await initializeTasks();
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[自动点击助手] 浏览器启动');
    // 加载节假日缓存
    await holidayManager.loadFromStorage();
    await initializeTasks();
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TASKS_UPDATED') {
        // 异步调度任务
        scheduleAllTasks(message.tasks).then(() => {
            console.log('[消息处理] 任务调度完成');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('[消息处理] 任务调度失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
    } else if (message.type === 'REFRESH_HOLIDAYS') {
        // 手动刷新节假日数据
        holidayManager.clearCache().then(() => {
            return holidayManager.fetchHolidays();
        }).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
    }
});

// 初始化任务
async function initializeTasks() {
    try {
        const result = await storageGet(['tasks']);
        const tasks = result.tasks || [];
        console.log(`[自动点击助手] 初始化 ${tasks.length} 个任务`);
        await scheduleAllTasks(tasks);

        // 初始化badge显示
        await updateBadge(tasks);
    } catch (error) {
        console.error('[自动点击助手] 初始化失败:', error);
    }
}

// 调度所有任务
async function scheduleAllTasks(tasks) {
    try {
        await alarmsClearAll();
        console.log('[自动点击助手] 清除所有闹钟');

        let scheduledCount = 0;
        for (const task of tasks) {
            if (task.enabled && task.status !== 'completed') {
                scheduleTask(task);
                scheduledCount++;
            }
        }

        console.log(`[自动点击助手] 已调度 ${scheduledCount} 个任务`);
    } catch (error) {
        console.error('[自动点击助手] 调度任务失败:', error);
    }
}

// 调度单个任务
function scheduleTask(task) {
    try {
        // 任务ID已经包含task_前缀，直接使用作为闹钟名称
        const alarmName = task.id;
        const nextRunTime = calculateNextRunTime(task);

        if (!nextRunTime) {
            console.log(`[任务调度] 任务 "${task.name}" 不需要调度`);
            return;
        }

        const alarmOptions = { when: nextRunTime.getTime() };
        const intervalSeconds = Number(task.intervalSeconds);

        if (task.freqMode === 'interval' && intervalSeconds > 0) {
            // Chrome闹钟API的periodInMinutes最小值是1分钟
            // 如果间隔小于60秒，不使用周期性闹钟，而是在每次执行后重新调度
            if (intervalSeconds < 60) {
                console.log(`[任务调度] 任务 "${task.name}" 将在 ${nextRunTime.toLocaleString()} 首次执行，之后每 ${intervalSeconds} 秒执行（使用延迟调度模式）`);
            } else {
                // 间隔>=60秒，转换为分钟
                const intervalMinutes = Math.floor(intervalSeconds / 60);
                alarmOptions.periodInMinutes = intervalMinutes;
                console.log(`[任务调度] 任务 "${task.name}" 将在 ${nextRunTime.toLocaleString()} 首次执行，之后每 ${intervalMinutes} 分钟执行`);
            }
        } else {
            console.log(`[任务调度] 任务 "${task.name}" 将在 ${nextRunTime.toLocaleString()} 执行`);
        }

        // 先清除可能存在的旧闹钟，避免重复
        chrome.alarms.clear(alarmName, (wasCleared) => {
            if (wasCleared) {
                console.log(`[任务调度] 已清除任务 "${task.name}" 的旧闹钟`);
            }

            // 创建新闹钟
            chrome.alarms.create(alarmName, alarmOptions);
            console.log(`[任务调度] 闹钟 "${alarmName}" 已创建`);
        });
    } catch (error) {
        console.error(`[任务调度] 任务 "${task.name}" 调度失败:`, error);
    }
}

// 计算下次执行时间
function calculateNextRunTime(task) {
    try {
        const now = new Date();

        // 单次触发且已执行过
        if (task.triggerMode === 'single' && task.lastExecuted) {
            return null;
        }

        // 对于有间隔的任务，基于上次执行时间计算
        if (task.freqMode === 'interval' && task.intervalSeconds && task.lastExecuted) {
            const lastExec = new Date(task.lastExecuted);
            let targetTime = new Date(lastExec.getTime() + task.intervalSeconds * 1000);

            // 如果计算出的时间已经过去（比如浏览器休眠后恢复），使用当前时间+间隔
            if (targetTime <= now) {
                targetTime = new Date(now.getTime() + task.intervalSeconds * 1000);
            }

            console.log(`[任务调度] 基于上次执行时间 ${lastExec.toLocaleString()} + ${task.intervalSeconds}秒 = ${targetTime.toLocaleString()}`);
            return targetTime;
        }

        // Chrome Alarms API限制：闹钟必须在至少1分钟后才能触发
        // ⚠️ 注意：这个限制只适用于首次调度，不适用于秒级间隔任务的重新调度
        const minAlarmTime = new Date(now.getTime() + 60000); // 当前时间 + 1分钟

        // 默认立即执行（1秒后）
        let targetTime = new Date(now.getTime() + 1000);

        // 如果设定了具体时间
        if (task.timeMode === 'specific' && task.execTime) {
            const [hours, minutes] = task.execTime.split(':').map(Number);
            targetTime = new Date(now);
            targetTime.setHours(hours, minutes, 0, 0);

            // ✅ 添加随机时间偏移（使用用户设置的值）
            const maxOffset = Number(task.randomOffsetSeconds) || 30; // 默认30秒

            if (maxOffset > 0) {
                // 生成 -maxOffset 到 +maxOffset 秒之间的随机数
                const randomOffset = Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset;
                targetTime.setSeconds(targetTime.getSeconds() + randomOffset);

                console.log(`[任务调度] 设定时间 ${task.execTime}，用户设置最大偏移 ${maxOffset}秒，实际随机偏移 ${randomOffset}秒，实际执行时间 ${targetTime.toLocaleTimeString()}`);
            } else {
                console.log(`[任务调度] 设定时间 ${task.execTime}，无随机偏移`);
            }

            // 如果今天的时间已过，设置为明天
            if (targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 1);
                // 明天的时间也需要添加随机偏移
                if (maxOffset > 0) {
                    const tomorrowRandomOffset = Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset;
                    targetTime.setSeconds(targetTime.getSeconds() + tomorrowRandomOffset);
                    console.log(`[任务调度] 调整为明天，再次添加随机偏移 ${tomorrowRandomOffset}秒`);
                }
            }
        }

        // ✅ Chrome Alarms API限制检查：确保闹钟至少在1分钟后
        // ⚠️ 但对于秒级间隔任务，这个检查在首次调度时可能会导致问题
        // 解决方案：如果是秒级间隔且是首次执行，允许设置较短的延迟
        const intervalSeconds = Number(task.intervalSeconds);
        const isShortIntervalTask = task.freqMode === 'interval' && intervalSeconds > 0 && intervalSeconds < 60;

        // ✅ 新增：对于"立即执行"的任务（无具体时间设置且无间隔），允许立即执行
        const isImmediateTask = task.timeMode !== 'specific' && (!task.freqMode || task.freqMode !== 'interval');

        if (isShortIntervalTask && !task.lastExecuted) {
            // 秒级间隔任务的首次执行：允许设置在1分钟内
            // 因为updateTaskAfterExecution会处理后续的重新调度
            console.log(`[任务调度] 秒级间隔任务首次执行，允许设置在1分钟内 (${targetTime.toLocaleString()})`);
        } else if (isImmediateTask) {
            // 立即执行的任务：允许设置在1分钟内，实际会在1秒后执行
            console.log(`[任务调度] 立即执行任务，允许设置在1分钟内 (${targetTime.toLocaleString()})`);
        } else if (targetTime < minAlarmTime) {
            console.log(`[任务调度] 目标时间 ${targetTime.toLocaleString()} 距离现在不足1分钟，调整为 ${minAlarmTime.toLocaleString()}`);
            targetTime = minAlarmTime;
        }

        // 如果是循环触发，检查日期是否符合要求
        if (task.triggerMode === 'cycle') {
            let attempts = 0;
            const maxAttempts = 400; // 最多查找400天

            while (!isDateValidForCycle(targetTime, task) && attempts < maxAttempts) {
                targetTime.setDate(targetTime.getDate() + 1);
                attempts++;
            }

            if (attempts >= maxAttempts) {
                console.warn(`[任务调度] 任务 "${task.name}" 在${maxAttempts}天内找不到合适的执行日期`);
                return null;
            }
        }

        return targetTime;
    } catch (error) {
        console.error('[任务调度] 计算执行时间失败:', error);
        return null;
    }
}

// 检查日期是否符合循环周期要求
async function isDateValidForCycle(date, task) {
    try {
        // 如果启用了跳过节假日，检查是否是节假日
        if (task.skipHolidays) {
            const isHoliday = await holidayManager.isHoliday(date);
            if (isHoliday) {
                console.log(`[节假日检查] ${formatDate(date)} 是节假日，跳过`);
                return false;
            }
        }

        // 如果没有设定循环类型或为每天，直接返回true
        if (!task.cycleType || task.cycleType === 'daily') {
            return true;
        }

        // 每周循环
        if (task.cycleType === 'weekly') {
            const dayOfWeek = date.getDay();
            const isValid = Array.isArray(task.weekdays) && task.weekdays.includes(dayOfWeek);
            if (!isValid) {
                console.log(`[周期检查] ${formatDate(date)} 不是选定的星期`);
            }
            return isValid;
        }

        // 每月循环
        if (task.cycleType === 'monthly') {
            const dayOfMonth = date.getDate();
            const targetDay = Number(task.monthlyDay) || 1;
            const isValid = dayOfMonth === targetDay;
            if (!isValid) {
                console.log(`[周期检查] ${formatDate(date)} 不是每月的${targetDay}日`);
            }
            return isValid;
        }

        return true;
    } catch (error) {
        console.error('[周期检查] 失败:', error);
        return true; // 出错时默认允许执行
    }
}

// 格式化日期
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 从闹钟名称解析任务ID（现在闹钟名称就是任务ID）
function parseTaskIdFromAlarmName(name) {
    // 闹钟名称现在是完整的任务ID，直接返回
    if (!name || !name.startsWith('task_')) {
        console.warn('[闹钟触发] 无效的闹钟名称:', name);
        return null;
    }
    return name;
}

// 监听闹钟触发事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        console.log(`[闹钟触发] === 开始处理闹钟: ${alarm.name} ===`);
        console.log(`[闹钟触发] 预定时间: ${new Date(alarm.scheduledTime).toLocaleString()}`);
        console.log(`[闹钟触发] 当前时间: ${new Date().toLocaleString()}`);

        const taskId = parseTaskIdFromAlarmName(alarm.name);
        if (!taskId) {
            console.warn('[闹钟触发] 无法解析任务ID:', alarm.name);
            return;
        }

        console.log(`[闹钟触发] 解析的任务ID: ${taskId}`);

        const result = await chrome.storage.sync.get(['tasks']);
        const tasks = result.tasks || [];
        const task = tasks.find(t => t.id === taskId);

        if (!task) {
            console.warn('[闹钟触发] 任务不存在:', taskId);
            console.log('[闹钟触发] 所有任务IDs:', tasks.map(t => t.id));
            return;
        }

        console.log(`[闹钟触发] 找到任务: ${task.name}`);
        console.log(`[闹钟触发] 任务状态: enabled=${task.enabled}, status=${task.status}`);

        if (!task.enabled) {
            console.log(`[闹钟触发] 任务 "${task.name}" 已禁用，跳过执行`);
            return;
        }

        if (task.status === 'completed') {
            console.log(`[闹钟触发] 任务 "${task.name}" 已完成，跳过执行`);
            // 取消这个不应该存在的闹钟
            chrome.alarms.clear(alarm.name);
            console.log(`[闹钟触发] 已取消已完成任务的闹钟`);
            return;
        }

        console.log(`[闹钟触发] 准备执行任务...`);

        // 执行任务（executeTask内部会调用updateTaskAfterExecution更新状态）
        await executeTask(task);

        console.log(`[闹钟触发] 任务执行完成，获取最新状态...`);

        // 获取更新后的任务状态
        const updatedResult = await chrome.storage.sync.get(['tasks']);
        const updatedTasks = updatedResult.tasks || [];
        const updatedTask = updatedTasks.find(t => t.id === task.id);

        console.log(`[闹钟触发] 更新后的任务状态: enabled=${updatedTask?.enabled}, status=${updatedTask?.status}`);

        // 检查是否需要重新调度
        if (updatedTask && updatedTask.enabled && updatedTask.status !== 'completed') {
            const intervalSeconds = Number(updatedTask.intervalSeconds);

            // 对于秒级间隔任务（<60秒），updateTaskAfterExecution已经处理了重新调度
            // 这里不需要再次调度，避免重复
            if (updatedTask.freqMode === 'interval' && intervalSeconds > 0 && intervalSeconds < 60) {
                console.log(`[闹钟触发] 任务 "${updatedTask.name}" 使用秒级间隔，已由updateTaskAfterExecution处理重新调度`);
            } else {
                // 对于分钟级间隔或无间隔任务，需要在这里重新调度
                console.log(`[闹钟触发] 任务需要重新调度`);
                await scheduleTask(updatedTask);
                console.log(`[闹钟触发] 任务 "${updatedTask.name}" 已重新调度`);
            }
        } else {
            console.log(`[闹钟触发] 任务 "${task.name}" 不再需要调度（enabled=${updatedTask?.enabled}, status=${updatedTask?.status}）`);
            // 确保取消闹钟
            chrome.alarms.clear(alarm.name, (wasCleared) => {
                console.log(`[闹钟触发] 闹钟清除结果: ${wasCleared ? '成功' : '失败或不存在'}`);
            });
        }

        console.log(`[闹钟触发] === 闹钟处理完成 ===`);

    } catch (error) {
        console.error('[闹钟触发] 处理失败:', error);
    }
});

// 执行任务
async function executeTask(task) {
    try {
        console.log(`[任务执行] 开始执行任务: "${task.name}"`);

        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            console.log('[任务执行] 当前窗口未返回活动标签页，尝试使用 lastFocusedWindow');
            tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        }

        if (!tabs || tabs.length === 0) {
            console.log('[任务执行] 仍未找到激活标签页，尝试查询所有标签页');
            tabs = await chrome.tabs.query({});
        }

        if (!tabs || tabs.length === 0) {
            console.warn('[任务执行] 没有可用的标签页');
            return;
        }

        let executed = false;

        for (const tab of tabs) {
            // 跳过无效标签页
            if (!tab.id || typeof tab.url !== 'string' || !/^https?:\/\//.test(tab.url)) {
                continue;
            }

            // 跳过未完全加载的页面
            if (tab.status && tab.status !== 'complete') {
                continue;
            }

            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: clickElementBySelector,
                    args: [task.selector]
                });

                if (results && results[0] && results[0].result) {
                    console.log(`[任务执行] 任务 "${task.name}" 在标签页 ${tab.url} 中执行成功`);

                    // 发送通知
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: '自动点击助手',
                        message: `任务 "${task.name}" 已成功执行`
                    });

                    executed = true;
                    break;
                }
            } catch (error) {
                console.warn(`[任务执行] 在标签页 ${tab.url} 中执行失败:`, error);
            }
        }

        if (!executed) {
            console.warn(`[任务执行] 任务 "${task.name}" 未在任何标签页中执行`);
        } else {
            // 执行成功后更新任务状态
            await updateTaskAfterExecution(task);
        }

    } catch (error) {
        console.error('[任务执行] 执行失败:', error);
    }
}

// 在页面中点击元素的函数（将在页面上下文中执行）
function clickElementBySelector(selector) {
    try {
        const elements = document.querySelectorAll(selector);

        if (!elements || elements.length === 0) {
            console.log(`[自动点击] 未找到选择器 "${selector}" 对应的元素`);
            return false;
        }

        console.log(`[自动点击] 找到 ${elements.length} 个匹配元素`);

        let successCount = 0;
        let failCount = 0;

        // 遍历所有匹配的元素并点击
        elements.forEach((element, index) => {
            try {
                // 检查元素是否可见
                const style = window.getComputedStyle(element);
                if (style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.opacity === '0' ||
                    element.offsetWidth === 0 ||
                    element.offsetHeight === 0 ||
                    style.pointerEvents === 'none') {
                    console.log(`[自动点击] 元素 [${index + 1}] 不可见或不可交互，跳过`);
                    failCount++;
                    return;
                }

                // 滚动到元素位置
                element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });

                // 聚焦元素
                element.focus({ preventScroll: true });

                // 模拟真实用户点击 - 只使用原生click方法，避免重复触发
                // ⚠️ 不要同时使用dispatchEvent和原生click，会导致事件触发两次
                if (typeof element.click === 'function') {
                    element.click();
                } else {
                    // 如果元素没有原生click方法，使用dispatchEvent
                    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }

                console.log(`[自动点击] 成功点击元素 [${index + 1}]:`, element.tagName, element.id || '', element.className || '');
                successCount++;
            } catch (error) {
                console.error(`[自动点击] 点击元素 [${index + 1}] 时出错:`, error);
                failCount++;
            }
        });

        console.log(`[自动点击] 完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);

        // ✅ 修改：只要找到了元素就返回true，即使部分元素点击失败
        // 这样可以确保任务被标记为已执行，而不是因为部分元素失败而被认为未执行
        return true;
    } catch (error) {
        console.error('[自动点击] 点击元素时出错:', error);
        return false;
    }
}

// 更新任务执行后的状态
async function updateTaskAfterExecution(task) {
    try {
        // 获取最新的任务列表
        const result = await chrome.storage.sync.get(['tasks']);
        const allTasks = result.tasks || [];

        // 找到当前任务并更新
        const taskIndex = allTasks.findIndex(t => t.id === task.id);
        if (taskIndex === -1) {
            console.warn(`[任务状态] 找不到任务 "${task.name}"`);
            return;
        }

        // 更新最后执行时间
        allTasks[taskIndex].lastExecuted = new Date().toISOString();

        // 增加执行次数
        if (!allTasks[taskIndex].executionCount) {
            allTasks[taskIndex].executionCount = 0;
        }
        allTasks[taskIndex].executionCount++;
        console.log(`[任务状态] 任务 "${task.name}" 执行次数: ${allTasks[taskIndex].executionCount}`);

        // 如果是单次触发，标记为已完成
        if (allTasks[taskIndex].triggerMode === 'single') {
            allTasks[taskIndex].status = 'completed';
            allTasks[taskIndex].enabled = false;
            console.log(`[任务状态] 任务 "${task.name}" 已完成并禁用`);

            // 取消闹钟
            try {
                await chrome.alarms.clear(task.id);
                console.log(`[任务调度] 已取消任务 "${task.name}" 的闹钟`);
            } catch (error) {
                console.warn('[任务调度] 取消闹钟失败:', error);
            }
        } else {
            console.log(`[任务状态] 任务 "${task.name}" 已执行，等待下次调度`);

            // 对于秒级间隔的任务（<60秒），需要在每次执行后重新调度
            const intervalSeconds = Number(allTasks[taskIndex].intervalSeconds);
            if (allTasks[taskIndex].freqMode === 'interval' && intervalSeconds > 0 && intervalSeconds < 60) {
                console.log(`[任务状态] 任务 "${task.name}" 使用秒级间隔(${intervalSeconds}秒)，将在执行后重新调度`);
                // 延迟一下再重新调度，确保状态已保存
                setTimeout(async () => {
                    await scheduleTask(allTasks[taskIndex]);
                    console.log(`[任务状态] 任务 "${task.name}" 已重新调度`);
                }, 100);
            } else {
                // 重新调度（对于循环任务或分钟级间隔）
                await scheduleTask(allTasks[taskIndex]);
            }
        }

        // 保存更新后的任务列表
        await chrome.storage.sync.set({ tasks: allTasks });
        console.log(`[任务状态] 任务列表已保存`);

        // 更新badge显示
        await updateBadge(allTasks);

    } catch (error) {
        console.error('[任务状态] 更新失败:', error);
    }
}

// 更新插件图标badge显示
async function updateBadge(tasks) {
    try {
        if (!tasks || tasks.length === 0) {
            // 没有任务，清除badge
            await chrome.action.setBadgeText({ text: '' });
            await chrome.action.setBadgeBackgroundColor({ color: '#95a5a6' });
            return;
        }

        // 统计任务状态
        const enabledCount = tasks.filter(t => t.enabled && t.status !== 'completed').length;
        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const totalCount = tasks.length;

        // 计算总执行次数
        const totalExecutions = tasks.reduce((sum, t) => sum + (t.executionCount || 0), 0);

        // 根据状态设置badge文本和颜色
        let badgeText = '';
        let badgeColor = '#95a5a6'; // 默认灰色

        if (enabledCount > 0) {
            // 有启用的任务
            badgeText = `${enabledCount}`;
            badgeColor = '#27ae60'; // 绿色

            // 如果有执行次数，显示简要信息
            if (totalExecutions > 0) {
                // 在title中显示详细信息
                await chrome.action.setTitle({
                    title: `自动点击助手\n启用任务: ${enabledCount}\n已完成: ${completedCount}\n总执行: ${totalExecutions}次`
                });
            }
        } else if (completedCount > 0) {
            // 所有任务都已完成
            badgeText = '✓';
            badgeColor = '#3498db'; // 蓝色
            await chrome.action.setTitle({
                title: `自动点击助手\n已完成: ${completedCount}/${totalCount}\n总执行: ${totalExecutions}次`
            });
        } else {
            // 所有任务都禁用
            badgeText = '✗';
            badgeColor = '#e74c3c'; // 红色
            await chrome.action.setTitle({
                title: `自动点击助手\n所有任务已禁用 (${totalCount})`
            });
        }

        // 设置badge
        await chrome.action.setBadgeText({ text: badgeText });
        await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

        console.log(`[Badge] 更新完成 - 启用:${enabledCount}, 完成:${completedCount}, 总执行:${totalExecutions}`);
    } catch (error) {
        console.error('[Badge] 更新失败:', error);
    }
}

// 监听storage变化，自动更新badge
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.tasks) {
        const newTasks = changes.tasks.newValue || [];
        await updateBadge(newTasks);
    }
});
