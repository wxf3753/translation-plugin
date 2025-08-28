// 侧边栏功能实现
class SidePanelManager {
    constructor() {
        this.init();
        this.loadSettings();
        this.bindEvents();
        this.optimizeForWindow();
    }

    init() {
        this.elements = {
            translateInput: document.getElementById('translateInput'),
            translateBtn: document.getElementById('translateBtn'),
            translateResult: document.getElementById('translateResult'),
            summarizeInput: document.getElementById('summarizeInput'),
            summarizeBtn: document.getElementById('summarizeBtn'),
            summarizeResult: document.getElementById('summarizeResult'),
            kimiApiKey: document.getElementById('kimiApiKey'),
            saveApiKey: document.getElementById('saveApiKey'),
            targetLanguage: document.getElementById('targetLanguage'),
            statusText: document.getElementById('statusText'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            testBtn: document.getElementById('testBtn'),
            debugBtn: document.getElementById('debugBtn')
        };
    }

    bindEvents() {
        // 翻译功能
        this.elements.translateBtn.addEventListener('click', () => this.handleTranslate());
        
        // 总结功能
        this.elements.summarizeBtn.addEventListener('click', () => this.handleSummarize());
        
        // 保存API Key
        this.elements.saveApiKey.addEventListener('click', () => this.saveApiKey());
        
        // 测试按钮
        if (this.elements.testBtn) {
            this.elements.testBtn.addEventListener('click', () => this.handleTest());
        }
        
        // 调试按钮
        if (this.elements.debugBtn) {
            this.elements.debugBtn.addEventListener('click', () => this.handleDebug());
        }
        

        
        // 监听选中文本
        this.elements.translateInput.addEventListener('input', () => this.handleInputChange());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async loadSettings() {
        try {
            // 加载设置
            const result = await chrome.storage.sync.get(['kimiApiKey', 'targetLanguage']);
            if (result.kimiApiKey) {
                this.elements.kimiApiKey.value = result.kimiApiKey;
            }
            if (result.targetLanguage) {
                this.elements.targetLanguage.value = result.targetLanguage;
            }
            
            // 检查是否有文本需要加载
            await this.loadSelectedText();
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    async loadSelectedText() {
        try {
            // 1. 检查URL参数
            const urlParams = new URLSearchParams(window.location.search);
            let text = urlParams.get('selectedText') || urlParams.get('text');
            
            // 2. 如果URL没有，检查storage
            if (!text) {
                const result = await chrome.storage.local.get(['selectedText']);
                text = result.selectedText;
            }
            
            // 3. 如果有文本，设置并自动翻译
            if (text) {
                console.log('📝 加载文本:', text);
                this.elements.translateInput.value = text;
                this.showStatus(`已加载文本: ${text.substring(0, 30)}...`, 'success');
                
                // 自动翻译
                setTimeout(() => {
                    this.handleTranslate();
                }, 500);
                
                // 清理storage
                chrome.storage.local.remove(['selectedText']);
            }
        } catch (error) {
            console.error('加载文本失败:', error);
        }
    }

    async checkStorageForSelectedText() {
        try {
            console.log('检查storage中是否有选中的文本...');
            
            // 尝试从多个storage源获取文本
            let selectedText = null;
            
            // 1. 先检查localStorage
            try {
                const localResult = await chrome.storage.local.get(['selectedText']);
                console.log('localStorage结果:', localResult);
                if (localResult.selectedText) {
                    selectedText = localResult.selectedText;
                    console.log('从localStorage获取到文本');
                }
            } catch (localError) {
                console.log('localStorage检查失败:', localError);
            }
            
            // 2. 如果localStorage没有，检查sessionStorage
            if (!selectedText) {
                try {
                    const sessionResult = await chrome.storage.session.get(['selectedText']);
                    console.log('sessionStorage结果:', sessionResult);
                    if (sessionResult.selectedText) {
                        selectedText = sessionResult.selectedText;
                        console.log('从sessionStorage获取到文本');
                    }
                } catch (sessionError) {
                    console.log('sessionStorage不可用，继续使用localStorage');
                }
            }
            
            // 3. 如果都没有，尝试从URL参数获取
            if (!selectedText) {
                const urlParams = new URLSearchParams(window.location.search);
                const urlText = urlParams.get('selectedText');
                if (urlText) {
                    selectedText = urlText;
                    console.log('从URL参数获取到文本');
                }
            }
            
            if (selectedText) {
                console.log('最终获取到选中的文本:', selectedText);
                this.elements.translateInput.value = selectedText;
                
                // 显示成功提示
                this.showStatus(`已加载选中的文本: ${selectedText.substring(0, 30)}...`, 'success');
                
                // 自动触发翻译
                setTimeout(() => {
                    console.log('自动触发翻译...');
                    this.handleTranslate();
                }, 500);
                
                // 延迟清除所有storage中的文本，避免重复使用
                setTimeout(async () => {
                    try {
                        await chrome.storage.local.remove(['selectedText']);
                        await chrome.storage.session.remove(['selectedText']);
                        console.log('已清除所有storage中的选中文本');
                    } catch (clearError) {
                        console.log('清除storage失败:', clearError);
                    }
                }, 5000); // 增加延迟时间，确保翻译完成
            } else {
                console.log('所有来源都没有找到选中的文本');
            }
        } catch (error) {
            console.error('检查storage中的选中文本失败:', error);
        }
    }

    checkUrlParams() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            let selectedText = urlParams.get('selectedText') || urlParams.get('text');
            
            if (selectedText) {
                console.log('🎯 从URL参数获取到选中的文本:', selectedText);
                this.elements.translateInput.value = selectedText;
                
                // 显示成功提示
                this.showStatus(`✅ 已加载选中文本: ${selectedText.substring(0, 30)}...`, 'success');
                
                // 自动翻译
                setTimeout(() => {
                    console.log('🚀 自动开始翻译...');
                    this.handleTranslate();
                }, 500);
            }
        } catch (error) {
            console.error('❌ 检查URL参数失败:', error);
        }
    }

    // 设置选中的文本
    setSelectedText(text) {
        if (text && this.elements.translateInput) {
            console.log('设置选中的文本到翻译输入框:', text);
            this.elements.translateInput.value = text;
        }
    }

    async saveApiKey() {
        const apiKey = this.elements.kimiApiKey.value.trim();
        if (!apiKey) {
            this.showStatus('请输入API Key', 'error');
            return;
        }

        try {
            await chrome.storage.sync.set({ kimiApiKey: apiKey });
            this.showStatus('API Key已保存', 'success');
        } catch (error) {
            this.showStatus('保存失败', 'error');
            console.error('保存API Key失败:', error);
        }
    }

    async handleTranslate() {
        const text = this.elements.translateInput.value.trim();
        if (!text) {
            this.showStatus('请输入要翻译的内容', 'error');
            return;
        }

        const apiKey = this.elements.kimiApiKey.value.trim();
        if (!apiKey) {
            this.showStatus('请先设置Kimi API Key', 'error');
            return;
        }

        this.setLoading(true);
        this.showStatus('正在翻译...', 'info');

        try {
            const targetLang = this.elements.targetLanguage.value;
            const result = await this.callKimiAPI(apiKey, text, 'translate', targetLang);
            this.elements.translateResult.textContent = result;
            this.showStatus('翻译完成', 'success');
        } catch (error) {
            this.elements.translateResult.textContent = `翻译失败: ${error.message}`;
            this.showStatus('翻译失败', 'error');
            console.error('翻译失败:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async handleSummarize() {
        const text = this.elements.summarizeInput.value.trim();
        if (!text) {
            // 如果没有输入内容，尝试获取当前页面内容
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                const result = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
                if (result && result.content) {
                    this.elements.summarizeInput.value = result.content.substring(0, 1000) + '...';
                } else {
                    this.showStatus('无法获取页面内容，请手动输入', 'error');
                    return;
                }
            } catch (error) {
                this.showStatus('无法获取页面内容，请手动输入', 'error');
                return;
            }
        }

        const apiKey = this.elements.kimiApiKey.value.trim();
        if (!apiKey) {
            this.showStatus('请先设置Kimi API Key', 'error');
            return;
        }

        this.setLoading(true);
        this.showStatus('正在生成总结...', 'info');

        try {
            const content = this.elements.summarizeInput.value.trim();
            const result = await this.callKimiAPI(apiKey, content, 'summarize');
            this.elements.summarizeResult.textContent = result;
            this.showStatus('总结完成', 'success');
        } catch (error) {
            this.elements.summarizeResult.textContent = `总结失败: ${error.message}`;
            this.showStatus('总结失败', 'error');
            console.error('总结失败:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async callKimiAPI(apiKey, text, action, targetLang = 'zh') {
        // 使用正确的API端点
        const baseURL = 'https://api.moonshot.cn/v1/chat/completions';
        
        let prompt;
        if (action === 'translate') {
            prompt = `请将以下内容翻译成${this.getLanguageName(targetLang)}，保持原文的格式和语气：\n\n${text}`;
        } else if (action === 'summarize') {
            prompt = `请对以下内容进行简洁明了的总结，提取关键信息：\n\n${text}`;
        }

        const requestBody = {
            model: "moonshot-v1-8k", // 使用合适的模型
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            stream: false,
            temperature: 0.7,
            max_tokens: 4000
        };

        console.log('发送API请求到:', baseURL);
        console.log('请求内容:', requestBody);

        const response = await fetch(baseURL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('API响应状态:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API成功响应:', data);
        
        if (data.error) {
            throw new Error(data.error.message || 'API返回错误');
        }

        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('API返回数据格式错误');
        }
    }

    getLanguageName(code) {
        const languages = {
            'zh': '中文',
            'en': '英文',
            'ja': '日文',
            'ko': '韩文',
            'fr': '法文',
            'de': '德文',
            'es': '西班牙文'
        };
        return languages[code] || '中文';
    }

    handleInputChange() {
        // 实时更新状态
        const text = this.elements.translateInput.value.trim();
        if (text) {
            this.showStatus(`准备翻译 ${text.length} 个字符`, 'info');
        } else {
            this.showStatus('就绪', 'info');
        }
    }

    handleKeyboard(event) {
        // Ctrl+Enter 快速翻译
        if (event.ctrlKey && event.key === 'Enter') {
            if (document.activeElement === this.elements.translateInput) {
                this.handleTranslate();
            } else if (document.activeElement === this.elements.summarizeInput) {
                this.handleSummarize();
            }
        }
    }

    setLoading(loading) {
        this.elements.translateBtn.disabled = loading;
        this.elements.summarizeBtn.disabled = loading;
        this.elements.loadingSpinner.style.display = loading ? 'block' : 'none';
    }

    showStatus(message, type = 'info') {
        if (this.elements.statusText) {
            this.elements.statusText.textContent = message;
            this.elements.statusText.className = `status-${type}`;
            
            console.log(`状态更新: ${message} (${type})`);
            
            // 3秒后自动清除状态
            setTimeout(() => {
                if (this.elements.statusText && this.elements.statusText.textContent === message) {
                    this.elements.statusText.textContent = '就绪';
                    this.elements.statusText.className = '';
                }
            }, 3000);
        }
    }

    // 测试功能
    async handleTest() {
        try {
            this.showStatus('正在测试连接...', 'info');
            
            // 测试storage功能
            const testText = '测试文本 - ' + new Date().toLocaleTimeString();
            await chrome.storage.local.set({ testData: testText });
            const result = await chrome.storage.local.get(['testData']);
            
            if (result.testData === testText) {
                this.showStatus('Storage功能正常', 'success');
                console.log('Storage测试成功');
            } else {
                this.showStatus('Storage功能异常', 'error');
                console.error('Storage测试失败');
            }
            
            // 清理测试数据
            await chrome.storage.local.remove(['testData']);
            
        } catch (error) {
            this.showStatus('测试失败: ' + error.message, 'error');
            console.error('测试失败:', error);
        }
    }

    // 调试功能
    async handleDebug() {
        try {
            this.showStatus('正在获取调试信息...', 'info');
            
            // 检查storage中的内容
            const localResult = await chrome.storage.local.get(null);
            const sessionResult = await chrome.storage.session.get(null);
            
            console.log('=== 调试信息 ===');
            console.log('localStorage内容:', localResult);
            console.log('sessionStorage内容:', sessionResult);
            console.log('当前翻译输入框内容:', this.elements.translateInput.value);
            console.log('当前API Key:', this.elements.kimiApiKey.value);
            console.log('当前目标语言:', this.elements.targetLanguage.value);
            console.log('Chrome sidePanel API:', typeof chrome.sidePanel);
            console.log('当前页面URL:', window.location.href);
            console.log('================');
            
            this.showStatus('调试信息已输出到控制台', 'success');
            
        } catch (error) {
            this.showStatus('调试失败: ' + error.message, 'error');
            console.error('调试失败:', error);
        }
    }

    // 优化窗口显示
    optimizeForWindow() {
        try {
            console.log('🪟 优化窗口显示...');
            
            // 强制设置窗口大小
            if (window.resizeTo) {
                window.resizeTo(400, 600);
            }
            
            // 强制设置窗口位置（如果是弹出窗口）
            if (window.moveTo && screen.width > 800) {
                window.moveTo(screen.width - 420, 100);
            }
            
            // 检测窗口类型
            console.log('窗口信息:');
            console.log('- 窗口内宽度:', window.innerWidth);
            console.log('- 窗口内高度:', window.innerHeight);
            console.log('- 屏幕宽度:', screen.width);
            console.log('- 屏幕高度:', screen.height);
            console.log('- 是否为弹出窗口:', window.opener !== null);
            
            // 添加窗口调整事件
            window.addEventListener('resize', () => {
                console.log('窗口大小已调整:', window.innerWidth, 'x', window.innerHeight);
            });
            
        } catch (error) {
            console.error('窗口优化失败:', error);
        }
    }


}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.sidePanelManager = new SidePanelManager();
});

// 监听来自background script和content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('侧边栏收到消息:', request);
    
    if (request.action === 'setSelectedText') {
        // 设置选中的文本到翻译输入框
        if (request.text) {
            console.log('收到选中的文本:', request.text);
            const translateInput = document.getElementById('translateInput');
            if (translateInput) {
                translateInput.value = request.text;
                console.log('已设置文本到输入框');
                
                // 显示成功提示
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = `已加载选中文本: ${request.text.substring(0, 30)}...`;
                    statusText.className = 'status-success';
                }
                
                // 自动触发翻译
                setTimeout(() => {
                    console.log('收到消息后自动触发翻译...');
                    const sidePanelManager = window.sidePanelManager;
                    if (sidePanelManager && sidePanelManager.handleTranslate) {
                        sidePanelManager.handleTranslate();
                    }
                }, 500);
                
                sendResponse({ success: true });
            } else {
                console.error('找不到翻译输入框');
                sendResponse({ error: '找不到翻译输入框' });
            }
        }
    } else if (request.action === 'getSelectedText') {
        // 获取选中的文本并填入翻译输入框
        if (request.text) {
            document.getElementById('translateInput').value = request.text;
            sendResponse({ success: true });
        }
    }
    
    return true; // 保持消息通道开放
});
