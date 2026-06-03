// holidayManager.js - 节假日管理模块

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
