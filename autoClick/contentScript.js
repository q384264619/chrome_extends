// contentScript.js - 内容脚本，在页面中执行点击操作

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CLICK_ELEMENT') {
        const result = clickElementBySelector(message.selector);
        sendResponse({ success: result });
    }
});

// 点击指定选择器的元素
function clickElementBySelector(selector) {
    try {
        const element = document.querySelector(selector);
        
        if (!element) {
            console.log(`[自动点击助手] 未找到选择器 "${selector}" 对应的元素`);
            return false;
        }
        
        // 检查元素是否可见且可交互
        if (!isElementVisible(element)) {
            console.log(`[自动点击助手] 元素 "${selector}" 不可见或不可交互`);
            return false;
        }
        
        // 模拟真实用户点击
        simulateHumanClick(element);
        
        console.log(`[自动点击助手] 成功点击元素: ${selector}`);
        return true;
    } catch (error) {
        console.error('[自动点击助手] 点击元素时出错:', error);
        return false;
    }
}

// 检查元素是否可见且可交互
function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    
    // 检查CSS属性
    if (style.display === 'none' || 
        style.visibility === 'hidden' || 
        style.opacity === '0' ||
        style.pointerEvents === 'none') {
        return false;
    }
    
    // 检查尺寸
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        return false;
    }
    
    // 检查是否被禁用
    if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
        return false;
    }
    
    return true;
}

// 模拟真实用户点击
function simulateHumanClick(element) {
    // 滚动到元素位置
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
    
    // 聚焦元素
    element.focus({ preventScroll: true });
    
    // 触发mousedown事件
    element.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
    }));
    
    // 触发mouseup事件
    element.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
    }));
    
    // 触发click事件
    element.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    }));
    
    // 也调用原生的click方法
    if (typeof element.click === 'function') {
        element.click();
    }
}

// 页面加载完成后，检查是否有需要立即执行的任务
document.addEventListener('DOMContentLoaded', () => {
    checkAndExecuteImmediateTasks();
});

// 检查并执行立即任务
async function checkAndExecuteImmediateTasks() {
    try {
        const result = await chrome.storage.sync.get(['tasks']);
        const tasks = result.tasks || [];
        
        // 查找需要立即执行的任务（没有设定时间或频率的任务）
        const immediateTasks = tasks.filter(task => {
            return task.enabled && 
                   task.status !== 'completed' &&
                   (task.timeMode !== 'specific' || !task.execTime) &&
                   task.freqMode !== 'interval';
        });
        
        // 执行这些任务
        for (const task of immediateTasks) {
            // 检查当前页面是否包含目标元素
            const element = document.querySelector(task.selector);
            if (element && isElementVisible(element)) {
                setTimeout(() => {
                    clickElementBySelector(task.selector);
                }, 1000); // 延迟1秒执行，确保页面完全加载
            }
        }
    } catch (error) {
        console.error('[自动点击助手] 检查立即任务时出错:', error);
    }
}