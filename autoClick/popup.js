// popup.js - 弹窗页面逻辑

let tasks = [];
let editingTaskId = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[UI] DOM加载完成');
    loadTasks();
    setupEventListeners();
    console.log('[UI] 事件监听器设置完成');
});

// 设置事件监听器
function setupEventListeners() {
    console.log('[UI] 开始设置事件监听器...');
    
    // 添加任务按钮
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => showConfigPage());
        console.log('[UI] addTaskBtn 事件绑定成功');
    } else {
        console.error('[UI] 找不到 addTaskBtn 元素');
    }
    
    // 刷新节假日按钮
    const refreshHolidaysBtn = document.getElementById('refreshHolidaysBtn');
    if (refreshHolidaysBtn) {
        refreshHolidaysBtn.addEventListener('click', refreshHolidays);
        console.log('[UI] refreshHolidaysBtn 事件绑定成功');
    } else {
        console.warn('[UI] 找不到 refreshHolidaysBtn 元素');
    }
    
    // 测试选择器按钮
    const testSelectorBtn = document.getElementById('testSelectorBtn');
    if (testSelectorBtn) {
        testSelectorBtn.addEventListener('click', testSelector);
        console.log('[UI] testSelectorBtn 事件绑定成功');
    } else {
        console.error('[UI] 找不到 testSelectorBtn 元素');
    }
    
    // 取消按钮
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', showListPage);
        console.log('[UI] cancelBtn 事件绑定成功');
    } else {
        console.error('[UI] 找不到 cancelBtn 元素');
    }
    
    // 表单提交
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleFormSubmit);
        console.log('[UI] taskForm 事件绑定成功');
    } else {
        console.error('[UI] 找不到 taskForm 元素');
    }
    
    // 时间模式切换
    document.querySelectorAll('input[name="timeMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const timeField = document.getElementById('timeField');
            if (e.target.value === 'specific') {
                timeField.classList.add('show');
            } else {
                timeField.classList.remove('show');
            }
        });
    });
    
    // 频率模式切换
    document.querySelectorAll('input[name="freqMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const freqField = document.getElementById('frequencyField');
            if (e.target.value === 'interval') {
                freqField.classList.add('show');
            } else {
                freqField.classList.remove('show');
            }
        });
    });
    
    // 触发模式切换
    document.querySelectorAll('input[name="triggerMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const cycleOptions = document.getElementById('cycleOptions');
            if (e.target.value === 'cycle') {
                cycleOptions.classList.add('show');
            } else {
                cycleOptions.classList.remove('show');
            }
        });
    });
    
    // 循环类型切换
    document.getElementById('cycleType').addEventListener('change', (e) => {
        const weeklyOptions = document.getElementById('weeklyOptions');
        const monthlyOptions = document.getElementById('monthlyOptions');
        
        weeklyOptions.classList.remove('show');
        monthlyOptions.classList.remove('show');
        
        if (e.target.value === 'weekly') {
            weeklyOptions.classList.add('show');
        } else if (e.target.value === 'monthly') {
            monthlyOptions.classList.add('show');
        }
    });
}

function storageGet(keys) {
    return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

function storageSet(items) {
    return new Promise(resolve => chrome.storage.sync.set(items, resolve));
}

// 加载任务列表
async function loadTasks() {
    try {
        console.log('[UI] 开始加载任务列表...');
        const result = await chrome.storage.sync.get(['tasks']);
        tasks = result.tasks || [];
        console.log(`[UI] 加载了 ${tasks.length} 个任务`);
        renderTaskList();
        
        // 启动倒计时更新定时器
        startCountdownTimer();
        
        // 监听Storage变化，实现自动刷新
        setupStorageChangeListener();
    } catch (error) {
        console.error('[UI] 加载任务失败:', error);
        // 即使失败也显示空列表
        tasks = [];
        renderTaskList();
    }
}

// Storage变化监听器
let storageListenerSetup = false;

function setupStorageChangeListener() {
    if (storageListenerSetup) {
        return; // 避免重复设置
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.tasks) {
            console.log('[UI] 检测到Storage中的任务变化，自动刷新...');
            
            // 获取最新的任务数据
            const newTasks = changes.tasks.newValue || [];
            
            // 检查是否有实质性变化（执行次数、状态等）
            const hasChanges = checkTaskHasChanges(tasks, newTasks);
            
            if (hasChanges) {
                console.log('[UI] 任务数据有变化，重新渲染列表');
                tasks = newTasks;
                renderTaskList();
                
                // 重新启动倒计时定时器
                startCountdownTimer();
            } else {
                console.log('[UI] 任务数据无实质性变化，跳过刷新');
            }
        }
    });
    
    storageListenerSetup = true;
    console.log('[UI] Storage变化监听器已设置');
}

// 检查任务是否有实质性变化
function checkTaskHasChanges(oldTasks, newTasks) {
    // 数量不同
    if (oldTasks.length !== newTasks.length) {
        return true;
    }
    
    // 检查每个任务的关键字段
    for (let i = 0; i < oldTasks.length; i++) {
        const oldTask = oldTasks[i];
        const newTask = newTasks.find(t => t.id === oldTask.id);
        
        if (!newTask) {
            return true; // 任务被删除
        }
        
        // 检查关键字段是否变化
        if (oldTask.executionCount !== newTask.executionCount ||
            oldTask.status !== newTask.status ||
            oldTask.enabled !== newTask.enabled ||
            oldTask.lastExecuted !== newTask.lastExecuted) {
            return true;
        }
    }
    
    return false;
}

// 倒计时定时器ID
let countdownTimerId = null;

// 启动倒计时更新定时器
function startCountdownTimer() {
    // 清除旧的定时器
    if (countdownTimerId) {
        clearInterval(countdownTimerId);
    }
    
    // 每秒更新一次倒计时
    countdownTimerId = setInterval(() => {
        updateCountdownDisplay();
    }, 1000);
}

// 更新倒计时显示
function updateCountdownDisplay() {
    const nextRunElements = document.querySelectorAll('.next-run-time');
    
    nextRunElements.forEach(el => {
        const timestamp = parseInt(el.dataset.nextTime);
        if (!timestamp) return;
        
        const now = Date.now();
        const diff = timestamp - now;
        
        if (diff <= 0) {
            el.textContent = '即将执行';
            return;
        }
        
        // 格式化倒计时文本
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        let timeText = '';
        if (hours > 0) {
            timeText += `${hours}小时`;
        }
        if (minutes > 0) {
            timeText += `${minutes}分钟`;
        }
        if (seconds > 0 || timeText === '') {
            timeText += `${seconds}秒`;
        }
        
        el.textContent = `${timeText}后`;
    });
}

// 渲染任务列表
function renderTaskList() {
    const taskListEl = document.getElementById('taskList');
    
    if (tasks.length === 0) {
        taskListEl.innerHTML = `
            <div class="empty-state">
                <p>暂无任务</p>
                <p style="font-size: 14px;">点击"添加任务"创建新任务</p>
            </div>
        `;
        return;
    }
    
    taskListEl.innerHTML = tasks.map(task => createTaskHTML(task)).join('');
    
    // 绑定任务操作事件
    tasks.forEach(task => {
        const editBtn = document.getElementById(`edit-${task.id}`);
        const toggleBtn = document.getElementById(`toggle-${task.id}`);
        const deleteBtn = document.getElementById(`delete-${task.id}`);
        
        if (editBtn) {
            editBtn.addEventListener('click', () => editTask(task.id));
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => toggleTask(task.id));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
        }
    });
}

// 创建任务HTML
function createTaskHTML(task) {
    const statusClass = task.enabled ? 
        (task.status === 'completed' ? 'status-completed' : 'status-enabled') : 
        'status-disabled';
    
    const statusText = task.enabled ? 
        (task.status === 'completed' ? '已完成' : '启用') : 
        '禁用';
    
    const toggleText = task.enabled ? '禁用' : '启用';
    const toggleClass = task.enabled ? 'btn-toggle' : 'btn-toggle disabled';
    
    let timeInfo = '立即执行';
    if (task.timeMode === 'specific' && task.execTime) {
        timeInfo = `每天 ${task.execTime}`;
    }
    
    let freqInfo = '无间隔';
    if (task.freqMode === 'interval' && task.intervalSeconds) {
        freqInfo = `每 ${task.intervalSeconds} 秒`;
    }
    
    let triggerInfo = '单次触发';
    if (task.triggerMode === 'cycle') {
        triggerInfo = `循环触发 (${getCycleText(task)})`;
    }
    
    // 计算执行次数
    const execCount = task.executionCount || 0;
    const execCountText = task.triggerMode === 'single' && task.status === 'completed' 
        ? '已执行 1 次' 
        : `已执行 ${execCount} 次`;
    
    // 计算下次执行时间
    const nextRunText = getNextRunTimeText(task);
    
    return `
        <div class="task-item" data-task-id="${task.id}">
            <div class="task-header">
                <div class="task-name">${escapeHtml(task.name)}</div>
                <div class="task-status ${statusClass}">${statusText}</div>
            </div>
            <div class="task-info">
                <div><label>目标元素:</label>${escapeHtml(task.selector)}</div>
                <div><label>执行时间:</label>${timeInfo}</div>
                <div><label>执行频率:</label>${freqInfo}</div>
                <div><label>触发模式:</label>${triggerInfo}</div>
                <div><label>执行次数:</label><span class="exec-count">${execCountText}</span></div>
                ${nextRunText ? `<div><label>下次执行:</label><span class="next-run-time" data-next-time="${nextRunText.timestamp}">${nextRunText.text}</span></div>` : ''}
            </div>
            <div class="task-actions">
                <button id="edit-${task.id}" class="btn-action btn-edit">编辑</button>
                <button id="toggle-${task.id}" class="btn-action ${toggleClass}">${toggleText}</button>
                <button id="delete-${task.id}" class="btn-action btn-delete">删除</button>
            </div>
        </div>
    `;
}

// 获取循环周期文本
function getCycleText(task) {
    if (!task.cycleType) return '每天';
    
    switch (task.cycleType) {
        case 'daily':
            return '每天';
        case 'weekly':
            const days = task.weekdays || [];
            const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
            return `每周${days.map(d => dayNames[d]).join('、')}`;
        case 'monthly':
            return `每月${task.monthlyDay || 1}日`;
        default:
            return '每天';
    }
}

// 计算下次执行时间文本
function getNextRunTimeText(task) {
    // 如果任务已禁用或已完成，不显示下次执行时间
    if (!task.enabled || task.status === 'completed') {
        return null;
    }
    
    try {
        const now = new Date();
        let nextTime;
        
        // 单次触发且已执行过
        if (task.triggerMode === 'single' && task.lastExecuted) {
            return null;
        }
        
        // 如果有频率设置，计算下次执行时间
        if (task.freqMode === 'interval' && task.intervalSeconds) {
            if (task.lastExecuted) {
                // 基于上次执行时间计算
                const lastExec = new Date(task.lastExecuted);
                nextTime = new Date(lastExec.getTime() + task.intervalSeconds * 1000);
            } else {
                // 首次执行，基于当前时间或设定时间
                if (task.timeMode === 'specific' && task.execTime) {
                    const [hours, minutes] = task.execTime.split(':').map(Number);
                    nextTime = new Date(now);
                    nextTime.setHours(hours, minutes, 0, 0);
                    if (nextTime <= now) {
                        nextTime.setDate(nextTime.getDate() + 1);
                    }
                } else {
                    // 立即执行，显示"即将执行"
                    return { text: '即将执行', timestamp: Date.now() + 1000 };
                }
            }
        } else {
            // 无频率设置，基于设定时间
            if (task.timeMode === 'specific' && task.execTime) {
                const [hours, minutes] = task.execTime.split(':').map(Number);
                nextTime = new Date(now);
                nextTime.setHours(hours, minutes, 0, 0);
                if (nextTime <= now) {
                    nextTime.setDate(nextTime.getDate() + 1);
                }
            } else {
                // 立即执行
                return { text: '即将执行', timestamp: Date.now() + 1000 };
            }
        }
        
        // 计算倒计时
        const diff = nextTime.getTime() - now.getTime();
        
        if (diff <= 0) {
            return { text: '即将执行', timestamp: Date.now() + 1000 };
        }
        
        // 格式化倒计时文本
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        let timeText = '';
        if (hours > 0) {
            timeText += `${hours}小时`;
        }
        if (minutes > 0) {
            timeText += `${minutes}分钟`;
        }
        if (seconds > 0 || timeText === '') {
            timeText += `${seconds}秒`;
        }
        
        return {
            text: `${timeText}后`,
            timestamp: nextTime.getTime()
        };
    } catch (error) {
        console.error('[UI] 计算下次执行时间失败:', error);
        return null;
    }
}

// 显示配置页面
function showConfigPage(taskId = null) {
    editingTaskId = taskId;
    document.getElementById('listPage').classList.add('hidden');
    document.getElementById('configPage').classList.add('active');
    resetForm();
    
    if (taskId) {
        // 编辑模式
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('configTitle').textContent = '编辑任务';
            fillForm(task);
        }
    } else {
        // 新增模式
        document.getElementById('configTitle').textContent = '新建任务';
    }
}

// 显示列表页面
function showListPage() {
    console.log('[UI] 切换到列表页面');
    
    const listPage = document.getElementById('listPage');
    const configPage = document.getElementById('configPage');
    
    if (!listPage || !configPage) {
        console.error('[UI] 找不到页面元素');
        return;
    }
    
    listPage.classList.remove('hidden');
    configPage.classList.remove('active');
    editingTaskId = null;
    resetForm();
    
    console.log('[UI] 列表页面显示完成');
}

// 填充表单
function fillForm(task) {
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskName').value = task.name;
    document.getElementById('selector').value = task.selector;
    
    // 时间设置
    if (task.timeMode === 'specific') {
        document.getElementById('setTime').checked = true;
        document.getElementById('timeField').classList.add('show');
        document.getElementById('execTime').value = task.execTime || '';
        
        // ✅ 填充随机时间偏移
        const randomOffsetInput = document.getElementById('randomOffsetSeconds');
        if (randomOffsetInput) {
            randomOffsetInput.value = task.randomOffsetSeconds !== undefined ? task.randomOffsetSeconds : 30;
        }
    } else {
        document.getElementById('noTime').checked = true;
        document.getElementById('timeField').classList.remove('show');
    }
    
    // 频率设置
    if (task.freqMode === 'interval') {
        document.getElementById('setFrequency').checked = true;
        document.getElementById('frequencyField').classList.add('show');
        document.getElementById('intervalSeconds').value = task.intervalSeconds || '';
    } else {
        document.getElementById('noFrequency').checked = true;
        document.getElementById('frequencyField').classList.remove('show');
    }
    
    // 触发模式
    if (task.triggerMode === 'cycle') {
        document.getElementById('cycleTrigger').checked = true;
        document.getElementById('cycleOptions').classList.add('show');
        document.getElementById('cycleType').value = task.cycleType || 'daily';
        
        // 星期选择
        if (task.weekdays) {
            task.weekdays.forEach(day => {
                const checkbox = document.querySelector(`input[value="${day}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // 月度日期
        if (task.monthlyDay) {
            document.getElementById('monthlyDay').value = task.monthlyDay;
        }
        
        // 跳过节假日
        document.getElementById('skipHolidays').checked = task.skipHolidays || false;
        
        // 显示对应的选项
        if (task.cycleType === 'weekly') {
            document.getElementById('weeklyOptions').classList.add('show');
        } else if (task.cycleType === 'monthly') {
            document.getElementById('monthlyOptions').classList.add('show');
        }
    } else {
        document.getElementById('singleTrigger').checked = true;
        document.getElementById('cycleOptions').classList.remove('show');
    }
}

// 重置表单
function resetForm() {
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('timeField').classList.remove('show');
    document.getElementById('frequencyField').classList.remove('show');
    document.getElementById('cycleOptions').classList.remove('show');
    document.getElementById('weeklyOptions').classList.remove('show');
    document.getElementById('monthlyOptions').classList.remove('show');
    hideAllErrors();
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('=== 开始处理表单提交 ===');
    console.log('当前tasks数量:', tasks.length);
    console.log('editingTaskId:', editingTaskId);
    
    if (!validateForm()) {
        console.log('❌ 表单验证失败，请检查错误提示');
        return;
    }
    
    console.log('✅ 表单验证通过');
    
    const formData = getFormData();
    console.log('表单数据:', formData);
    
    if (editingTaskId) {
        // 更新任务 - 编辑时清除所有执行状态，重新开始
        const index = tasks.findIndex(t => t.id === editingTaskId);
        if (index !== -1) {
            const existingTask = tasks[index];
            console.log(`[任务编辑] 清除任务 "${existingTask.name}" 的旧状态`);
            
            tasks[index] = {
                ...existingTask,  // 保留原有所有字段
                // 更新用户可编辑的字段
                name: formData.name,
                selector: formData.selector,
                timeMode: formData.timeMode,
                freqMode: formData.freqMode,
                triggerMode: formData.triggerMode,
                execTime: formData.execTime,
                intervalSeconds: formData.intervalSeconds,
                cycleType: formData.cycleType,
                skipHolidays: formData.skipHolidays,
                weekdays: formData.weekdays,
                monthlyDay: formData.monthlyDay,
                
                // ⚠️ 清除所有执行状态，重新开始
                executionCount: 0,              // 重置执行次数
                lastExecuted: null,             // 清除最后执行时间
                status: 'pending',              // 重置状态为待执行
                enabled: true                   // 确保任务启用
            };
            
            console.log(`[任务编辑] 任务 "${formData.name}" 已更新，状态已重置`);
            console.log(`[任务编辑] 执行次数: 0, 状态: pending, 最后执行时间: null`);
        } else {
            console.error('[任务编辑] 找不到任务ID:', editingTaskId);
        }
    } else {
        // 新增任务
        formData.id = generateId();
        formData.enabled = true;
        formData.status = 'pending';
        formData.createdAt = new Date().toISOString();
        tasks.push(formData);
        console.log(`[任务创建] 任务 "${formData.name}" 已创建，ID: ${formData.id}`);
        console.log('更新后tasks数量:', tasks.length);
    }
    
    console.log('准备保存到Storage...');
    
    // 保存任务
    try {
        await chrome.storage.sync.set({ tasks });
        console.log('✅ 任务已保存到Storage');
        
        // 验证保存
        const verifyResult = await chrome.storage.sync.get(['tasks']);
        console.log('验证 - Storage中任务数量:', verifyResult.tasks ? verifyResult.tasks.length : 0);
    } catch (error) {
        console.error('❌ 保存到Storage失败:', error);
        alert('保存任务失败：' + error.message);
        return;
    }
    
    // 通知background更新调度（异步发送，不等待响应）
    try {
        chrome.runtime.sendMessage({
            type: 'TASKS_UPDATED',
            tasks: tasks
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('[任务保存] Background未响应:', chrome.runtime.lastError.message);
            } else {
                console.log('[任务保存] Background已通知');
            }
        });
    } catch (error) {
        console.error('[任务保存] 发送消息失败:', error);
    }
    
    console.log('准备返回列表页...');
    
    // 返回列表页
    showListPage();
    renderTaskList();
    
    console.log('=== 表单提交处理完成 ===');
}

// 验证表单
function validateForm() {
    hideAllErrors();
    let isValid = true;
    
    // 验证任务名称
    const taskName = document.getElementById('taskName').value.trim();
    if (!taskName) {
        showError('taskNameError', '请输入任务名称');
        isValid = false;
    }
    
    // 验证CSS选择器
    const selector = document.getElementById('selector').value.trim();
    if (!selector) {
        showError('selectorError', '请输入CSS选择器');
        isValid = false;
    } else if (!isValidSelector(selector)) {
        showError('selectorError', '选择器格式错误');
        isValid = false;
    }
    
    // 验证时间
    const timeMode = document.querySelector('input[name="timeMode"]:checked').value;
    if (timeMode === 'specific') {
        const execTime = document.getElementById('execTime').value;
        if (!execTime) {
            showError('timeError', '请选择执行时间');
            isValid = false;
        } else if (!/^\d{2}:\d{2}$/.test(execTime)) {
            showError('timeError', '时间格式错误');
            isValid = false;
        }
    }
    
    // 验证频率
    const freqMode = document.querySelector('input[name="freqMode"]:checked').value;
    if (freqMode === 'interval') {
        const interval = document.getElementById('intervalSeconds').value;
        if (!interval) {
            showError('frequencyError', '请输入时间间隔');
            isValid = false;
        } else if (!/^\d+$/.test(interval) || parseInt(interval) < 1) {
            showError('frequencyError', '频率必须为正整数（秒）');
            isValid = false;
        }
    }

    // 验证循环触发设置
    const triggerMode = document.querySelector('input[name="triggerMode"]:checked').value;
    if (triggerMode === 'cycle') {
        const cycleType = document.getElementById('cycleType').value;
        if (cycleType === 'weekly') {
            const selectedWeekdays = Array.from(document.querySelectorAll('#weeklyOptions input:checked'))
                .map(cb => parseInt(cb.value));
            if (selectedWeekdays.length === 0) {
                showError('cycleError', '请选择至少一个星期');
                isValid = false;
            }
        }
        if (cycleType === 'monthly') {
            const monthlyDay = document.getElementById('monthlyDay').value;
            if (!/^[1-9]\d?$|^3[01]$/.test(monthlyDay) || parseInt(monthlyDay) < 1 || parseInt(monthlyDay) > 31) {
                showError('cycleError', '请选择有效日期');
                isValid = false;
            }
        }
    }
    
    return isValid;
}

// 验证CSS选择器
function isValidSelector(selector) {
    try {
        // 创建一个临时div来测试选择器语法是否有效
        const div = document.createElement('div');
        div.innerHTML = '<span></span>';
        
        // 只检查选择器语法是否有效，不检查是否存在
        // 使用querySelectorAll而不是querySelector，因为后者在某些情况下会抛出异常
        div.querySelectorAll(selector);
        return true;
    } catch (e) {
        // 如果抛出SyntaxError，说明选择器语法无效
        if (e instanceof DOMException && e.name === 'SyntaxError') {
            return false;
        }
        // 其他情况认为选择器语法有效
        return true;
    }
}

// 获取表单数据
function getFormData() {
    const data = {
        name: document.getElementById('taskName').value.trim(),
        selector: document.getElementById('selector').value.trim(),
        timeMode: document.querySelector('input[name="timeMode"]:checked').value,
        freqMode: document.querySelector('input[name="freqMode"]:checked').value,
        triggerMode: document.querySelector('input[name="triggerMode"]:checked').value
    };
    
    if (data.timeMode === 'specific') {
        data.execTime = document.getElementById('execTime').value;
        // ✅ 添加随机时间偏移设置
        const randomOffsetInput = document.getElementById('randomOffsetSeconds');
        data.randomOffsetSeconds = randomOffsetInput ? parseInt(randomOffsetInput.value) || 0 : 30;
    } else {
        // 如果没有设定具体时间，随机偏移无效
        data.randomOffsetSeconds = 0;
    }
    
    if (data.freqMode === 'interval') {
        data.intervalSeconds = parseInt(document.getElementById('intervalSeconds').value);
    }
    
    if (data.triggerMode === 'cycle') {
        data.cycleType = document.getElementById('cycleType').value;
        data.skipHolidays = document.getElementById('skipHolidays').checked;
        
        if (data.cycleType === 'weekly') {
            data.weekdays = Array.from(document.querySelectorAll('#weeklyOptions input:checked'))
                .map(cb => parseInt(cb.value));
        }
        
        if (data.cycleType === 'monthly') {
            data.monthlyDay = parseInt(document.getElementById('monthlyDay').value) || 1;
        }
    }
    
    return data;
}

// 编辑任务
function editTask(taskId) {
    showConfigPage(taskId);
}

// 切换任务状态
async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.enabled = !task.enabled;
        
        // 保存到storage
        try {
            await chrome.storage.sync.set({ tasks });
            console.log(`[任务状态] 任务 "${task.name}" 已${task.enabled ? '启用' : '禁用'}`);
        } catch (error) {
            console.error('[任务状态] 保存失败:', error);
            alert('保存任务状态失败：' + error.message);
            return;
        }
        
        // 通知background更新调度
        try {
            chrome.runtime.sendMessage({
                type: 'TASKS_UPDATED',
                tasks: tasks
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('[任务状态] Background未响应:', chrome.runtime.lastError.message);
                } else {
                    console.log('[任务状态] Background已通知');
                }
            });
        } catch (error) {
            console.error('[任务状态] 发送消息失败:', error);
        }
        
        renderTaskList();
    }
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }
    
    const taskName = tasks.find(t => t.id === taskId)?.name || '未知任务';
    tasks = tasks.filter(t => t.id !== taskId);
    
    // 保存到storage
    try {
        await chrome.storage.sync.set({ tasks });
        console.log(`[任务删除] 任务 "${taskName}" 已删除`);
    } catch (error) {
        console.error('[任务删除] 保存失败:', error);
        alert('删除任务失败：' + error.message);
        return;
    }
    
    // 通知background更新调度
    try {
        chrome.runtime.sendMessage({
            type: 'TASKS_UPDATED',
            tasks: tasks
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('[任务删除] Background未响应:', chrome.runtime.lastError.message);
            } else {
                console.log('[任务删除] Background已通知');
            }
        });
    } catch (error) {
        console.error('[任务删除] 发送消息失败:', error);
    }
    
    renderTaskList();
}

// 显示错误信息
function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.add('show');
}

// 隐藏所有错误
function hideAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.classList.remove('show');
    });
}

// 生成唯一ID
function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 测试 CSS选择器
async function testSelector() {
    console.log('[选择器测试] 开始测试...');
    
    const selectorInput = document.getElementById('selector');
    const resultDiv = document.getElementById('selectorTestResult');
    const testBtn = document.getElementById('testSelectorBtn');
    
    if (!selectorInput || !resultDiv || !testBtn) {
        console.error('[选择器测试] 找不到必要的DOM元素');
        return;
    }
    
    const selector = selectorInput.value.trim();
    console.log('[选择器测试] 输入的选择器:', selector);
    
    // 验证输入
    if (!selector) {
        console.log('[选择器测试] 选择器为空');
        showTestResult('error', '❌ 请输入CSS选择器');
        return;
    }
    
    // 验证选择器语法
    if (!isValidSelector(selector)) {
        console.log('[选择器测试] 选择器语法无效');
        showTestResult('error', `❌ CSS选择器语法错误：<code>${escapeHtml(selector)}</code>`);
        return;
    }
    
    console.log('[选择器测试] 选择器语法有效，准备测试...');
    
    // 显示测试中状态
    testBtn.classList.add('testing');
    testBtn.disabled = true;
    testBtn.textContent = '⏳ 测试中...';
    showTestResult('warning', '⏳ 正在当前页面测试选择器...');
    
    try {
        console.log('[选择器测试] 获取当前活动标签页...');
        
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('[选择器测试] 无法获取当前标签页');
            showTestResult('error', '❌ 无法获取当前标签页');
            resetTestButton();
            return;
        }
        
        console.log('[选择器测试] 当前标签页:', tab.url);
        
        // 检查标签页URL
        if (!tab.url || !tab.url.startsWith('http')) {
            console.warn('[选择器测试] 当前页面不支持:', tab.url);
            showTestResult('warning', 
                '⚠️ 当前页面不支持元素测试<br>' +
                '<small>请切换到网页（http/https）后再测试</small>'
            );
            resetTestButton();
            return;
        }
        
        console.log('[选择器测试] 在页面中执行脚本...');
        
        // 在页面中执行脚本测试选择器
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: testSelectorInPage,
            args: [selector]
        });
        
        console.log('[选择器测试] 脚本执行完成，结果:', results);
        
        const result = results[0]?.result;
        
        if (!result) {
            console.error('[选择器测试] 未返回结果');
            showTestResult('error', '❌ 测试执行失败，未返回结果');
            resetTestButton();
            return;
        }
        
        // 显示测试结果
        if (result.found) {
            console.log(`[选择器测试] 找到 ${result.count} 个元素`);
            let details = `
                <strong>✅ 找到 ${result.count} 个匹配元素</strong>
                <ul>
                    <li>选择器：<code>${escapeHtml(selector)}</code></li>
                    <li>页面：${escapeHtml(tab.title)}</li>
            `;
            
            if (result.elements && result.elements.length > 0) {
                details += '<li>元素信息：</li><ul>';
                result.elements.slice(0, 3).forEach((elem, index) => {
                    details += `<li>[${index + 1}] ${escapeHtml(elem.tagName)}${elem.id ? '#' + elem.id : ''}${elem.className ? '.' + elem.className.split(' ').join('.') : ''}</li>`;
                });
                if (result.elements.length > 3) {
                    details += `<li>...还有 ${result.elements.length - 3} 个元素</li>`;
                }
                details += '</ul>';
            }
            
            details += '</ul>';
            showTestResult('success', details);
        } else {
            console.log('[选择器测试] 未找到匹配元素');
            showTestResult('error', 
                `❌ 未找到匹配的元素<br>` +
                `<small>选择器：<code>${escapeHtml(selector)}</code></small><br>` +
                `<small>页面：${escapeHtml(tab.title)}</small><br>` +
                `<small style="color: #856404;">💡 提示：请确认选择器是否正确，或切换到包含目标元素的页面</small>`
            );
        }
        
    } catch (error) {
        console.error('[选择器测试] 错误:', error);
        
        let errorMsg = '❌ 测试失败';
        if (error.message.includes('Cannot access')) {
            errorMsg = '⚠️ 无法访问此页面<br><small>可能是浏览器内部页面或权限受限</small>';
        } else {
            errorMsg += `<br><small>${escapeHtml(error.message)}</small>`;
        }
        
        showTestResult('error', errorMsg);
    } finally {
        console.log('[选择器测试] 重置按钮状态');
        resetTestButton();
    }
}

// 在页面中测试选择器的函数（将在页面上下文中执行）
function testSelectorInPage(selector) {
    try {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length === 0) {
            return { found: false, count: 0 };
        }
        
        // 检查元素是否可见的内联函数
        function isElementVisible(el) {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   el.offsetWidth > 0 && 
                   el.offsetHeight > 0;
        }
        
        // 收集元素信息（只取前5个，避免数据过多）
        const elementInfo = Array.from(elements).slice(0, 5).map(el => ({
            tagName: el.tagName.toLowerCase(),
            id: el.id,
            className: el.className,
            textContent: el.textContent?.substring(0, 50) || '',
            visible: isElementVisible(el)
        }));
        
        return {
            found: true,
            count: elements.length,
            elements: elementInfo
        };
    } catch (error) {
        return { error: error.message };
    }
}

// 显示测试结果
function showTestResult(type, message) {
    const resultDiv = document.getElementById('selectorTestResult');
    const contentDiv = resultDiv.querySelector('.test-result-content');
    
    resultDiv.className = 'selector-test-result ' + type;
    contentDiv.innerHTML = message;
    resultDiv.style.display = 'block';
}

// 重置测试按钮状态
function resetTestButton() {
    const testBtn = document.getElementById('testSelectorBtn');
    testBtn.classList.remove('testing');
    testBtn.disabled = false;
    testBtn.textContent = '🔍 测试';
}

// 刷新节假日数据
async function refreshHolidays() {
    const btn = document.getElementById('refreshHolidaysBtn');
    if (!btn) return;
    
    const originalText = btn.textContent;
    btn.textContent = '⏳ 刷新中...';
    btn.disabled = true;
    
    try {
        // 发送消息到background刷新节假日
        const response = await chrome.runtime.sendMessage({ type: 'REFRESH_HOLIDAYS' });
        
        if (response && response.success) {
            // 显示成功提示
            btn.textContent = '✅ 已更新';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
            
            console.log('[节假日] 刷新成功');
        } else {
            throw new Error(response?.error || '刷新失败');
        }
    } catch (error) {
        console.error('[节假日] 刷新失败:', error);
        btn.textContent = '❌ 失败';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }
}
