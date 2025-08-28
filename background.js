// 翻译助手 - 小窗口模式
console.log('🚀 插件启动');

let translationWindow = null; // 存储翻译窗口引用

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 收到消息:', message);
    
    if (message.action === 'openSidePanel') {
        console.log('🎯 打开翻译窗口请求');
        
        // 立即响应
        sendResponse({ success: true });
        
        // 存储文本
        if (message.selectedText) {
            chrome.storage.local.set({ selectedText: message.selectedText });
            console.log('💾 文本已存储');
        }
        
        // 打开翻译窗口
        openTranslationWindow();
    }
    
    return true;
});

// 监听图标点击
chrome.action.onClicked.addListener(() => {
    console.log('🖱️ 图标被点击');
    openTranslationWindow();
});

// 打开翻译窗口函数
async function openTranslationWindow() {
    try {
        console.log('🪟 尝试打开翻译窗口...');
        
        // 如果窗口已存在，先检查是否还有效
        if (translationWindow) {
            try {
                await chrome.windows.get(translationWindow.id);
                // 窗口存在，激活它
                await chrome.windows.update(translationWindow.id, { focused: true });
                console.log('✅ 激活现有翻译窗口');
                return;
            } catch (error) {
                // 窗口不存在了，清除引用
                translationWindow = null;
            }
        }
        
        // 尝试多种方法创建小窗口
        let window;
        
        // 方法1: 使用popup类型
        try {
            console.log('🔧 尝试方法1: popup类型窗口');
            window = await chrome.windows.create({
                url: chrome.runtime.getURL('sidepanel.html'),
                type: 'popup',
                width: 400,
                height: 600,
                left: Math.max(0, screen.width - 420),
                top: 100,
                focused: true,
                state: 'normal'
            });
            
            // 验证是否真的是popup窗口
            const windowInfo = await chrome.windows.get(window.id);
            if (windowInfo.type === 'popup') {
                console.log('✅ 成功创建popup窗口');
            } else {
                throw new Error('创建的不是popup窗口');
            }
            
        } catch (error1) {
            console.log('⚠️ 方法1失败:', error1.message);
            
            // 方法2: 强制创建小窗口
            try {
                console.log('🔧 尝试方法2: 强制小窗口');
                window = await chrome.windows.create({
                    url: chrome.runtime.getURL('sidepanel.html'),
                    width: 400,
                    height: 600,
                    left: Math.max(0, screen.width - 420),
                    top: 100,
                    focused: true
                });
                
                // 立即调整窗口属性
                await chrome.windows.update(window.id, {
                    width: 400,
                    height: 600,
                    left: Math.max(0, screen.width - 420),
                    top: 100,
                    focused: true,
                    state: 'normal'
                });
                
                console.log('✅ 方法2: 强制创建小窗口成功');
                
            } catch (error2) {
                console.log('⚠️ 方法2失败:', error2.message);
                throw new Error('所有窗口创建方法都失败');
            }
        }
        
        translationWindow = window;
        console.log('✅ 翻译窗口创建成功，ID:', window.id, '类型:', window.type);
        
        // 监听窗口关闭
        chrome.windows.onRemoved.addListener((windowId) => {
            if (translationWindow && windowId === translationWindow.id) {
                translationWindow = null;
                console.log('🗑️ 翻译窗口已关闭');
            }
        });
        
    } catch (error) {
        console.error('❌ 创建翻译窗口失败:', error);
        
        // 备用方案：普通标签页
        chrome.tabs.create({
            url: chrome.runtime.getURL('sidepanel.html'),
            active: true
        });
    }
}

console.log('✅ Background script 初始化完成');