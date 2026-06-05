// contentScript.js 
// 初始化
refreshPageWhenHaveTask();

async function refreshPageWhenHaveTask() {
    console.log('[Content]  ', '开始执行检测');
    const verifyResult = await chrome.storage.sync.get(['tasks']);
    if (verifyResult.tasks && verifyResult.tasks.length > 0) {
        console.log('[Content]  Storage中任务数量:', verifyResult.tasks ? verifyResult.tasks.length : 0);
        const maxOffset = 1000 * 60 * 5;
        const tomorrowRandomOffset = Math.floor(Math.random() * (maxOffset * 2 + 1)) - maxOffset;
        console.log('[Content]  ', tomorrowRandomOffset/1000,'秒后刷新页面');
        setTimeout(() => {
            console.log('[Content]  ', '正在刷新页面...');
            window.location.reload();
        }, tomorrowRandomOffset);
    }
}