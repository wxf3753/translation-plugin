// Content Script - 与页面交互
class ContentScriptManager {
    constructor() {
        this.init();
        this.bindEvents();
    }

    init() {
        console.log('初始化ContentScriptManager...');
        
        // 检查Chrome扩展环境
        if (typeof chrome === 'undefined') {
            console.error('Chrome扩展环境不可用');
            this.showToast('插件环境异常', 'error');
            return;
        }
        
        if (!chrome.runtime) {
            console.error('chrome.runtime不可用');
            this.showToast('插件运行时不可用', 'error');
            return;
        }
        
        console.log('Chrome扩展环境正常');
        
        // 创建浮动按钮
        this.createFloatingButton();
        
        // 监听来自侧边栏的消息
        this.listenToSidePanel();
    }

    createFloatingButton() {
        // 创建浮动翻译按钮
        const floatingBtn = document.createElement('div');
        floatingBtn.id = 'kimi-translate-float-btn';
        floatingBtn.innerHTML = '🌐';
        floatingBtn.title = '点击翻译选中内容';
        floatingBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
            transition: all 0.3s ease;
            opacity: 0;
            transform: scale(0.8);
        `;

        // 悬停效果
        floatingBtn.addEventListener('mouseenter', () => {
            floatingBtn.style.transform = 'scale(1.1)';
            floatingBtn.style.boxShadow = '0 6px 20px rgba(79, 172, 254, 0.4)';
        });

        floatingBtn.addEventListener('mouseleave', () => {
            floatingBtn.style.transform = 'scale(1)';
            floatingBtn.style.boxShadow = '0 4px 12px rgba(79, 172, 254, 0.3)';
        });

        // 点击事件
        floatingBtn.addEventListener('click', () => this.handleFloatingButtonClick());

        document.body.appendChild(floatingBtn);

        // 延迟显示按钮
        setTimeout(() => {
            floatingBtn.style.opacity = '1';
            floatingBtn.style.transform = 'scale(1)';
        }, 1000);
        
        // 添加右键菜单测试功能
        floatingBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            console.log('=== 右键点击测试 ===');
            console.log('Chrome扩展环境检查:');
            console.log('- chrome对象:', typeof chrome);
            console.log('- chrome.runtime:', typeof chrome.runtime);
            console.log('- chrome.runtime.id:', chrome.runtime?.id);
            console.log('- chrome.sidePanel:', typeof chrome.sidePanel);
            
            // 测试storage
            chrome.storage.local.get(['test'], (result) => {
                console.log('Storage测试结果:', result);
            });
        });
    }

    bindEvents() {
        // 监听文本选择
        document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
        
        // 监听键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // 监听页面滚动，隐藏浮动按钮
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            const btn = document.getElementById('kimi-translate-float-btn');
            if (btn) {
                btn.style.opacity = '0.3';
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    btn.style.opacity = '1';
                }, 500);
            }
        });
    }

    handleTextSelection(event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && selectedText.length > 0) {
            // 显示浮动按钮
            const btn = document.getElementById('kimi-translate-float-btn');
            if (btn) {
                btn.style.opacity = '1';
                btn.style.transform = 'scale(1)';
                
                // 更新按钮位置到选中文本附近
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                btn.style.top = `${Math.max(20, rect.top - 60)}px`;
                btn.style.right = '20px';
            }
        }
    }

    handleFloatingButtonClick() {
        const selectedText = window.getSelection().toString().trim();
        
        console.log('🔄 浮动按钮被点击，文本:', selectedText);
        
        if (!selectedText) {
            this.showToast('请先选中要翻译的文本', 'warning');
            return;
        }
        
        // 直接在页面内创建浮动翻译窗口
        this.createFloatingTranslationWindow(selectedText);
    }

    handleKeyboard(event) {
        // Ctrl+Shift+T 快速翻译选中内容
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
            event.preventDefault();
            this.handleFloatingButtonClick();
        }
    }

    listenToSidePanel() {
        // 检查Chrome扩展API是否可用
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            console.log('设置消息监听器...');
            
            // 监听来自侧边栏的消息
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log('收到消息:', request);
                if (request.action === 'getPageContent') {
                    const content = this.extractPageContent();
                    sendResponse({ content: content });
                }
            });
        } else {
            console.log('Chrome扩展API不可用，跳过消息监听器设置');
        }
    }

    extractPageContent() {
        // 提取页面主要内容
        let content = '';
        
        // 尝试获取文章内容
        const article = document.querySelector('article') || 
                      document.querySelector('[role="main"]') ||
                      document.querySelector('.content') ||
                      document.querySelector('.post-content') ||
                      document.querySelector('.entry-content');
        
        if (article) {
            content = this.cleanText(article.textContent);
        } else {
            // 如果没有找到特定容器，获取body内容
            const body = document.body;
            const paragraphs = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
            
            const textParts = [];
            paragraphs.forEach(p => {
                const text = p.textContent.trim();
                if (text.length > 20) { // 过滤掉太短的文本
                    textParts.push(text);
                }
            });
            
            content = textParts.join('\n\n');
        }
        
        // 限制内容长度
        if (content.length > 5000) {
            content = content.substring(0, 5000) + '...';
        }
        
        return content;
    }

    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')  // 合并多个空白字符
            .replace(/\n\s*\n/g, '\n\n')  // 清理多余的空行
            .trim();
    }

    showToast(message, type = 'info') {
        // 创建提示框
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // 创建浮动翻译窗口
    createFloatingTranslationWindow(selectedText) {
        try {
            console.log('🪟 创建浮动翻译窗口...');
            
            // 移除已存在的翻译窗口
            const existingWindow = document.getElementById('translation-floating-window');
            if (existingWindow) {
                existingWindow.remove();
            }
            
            // 创建浮动窗口容器
            const floatingWindow = document.createElement('div');
            floatingWindow.id = 'translation-floating-window';
            floatingWindow.innerHTML = this.getTranslationWindowHTML(selectedText);
            
            // 添加到页面
            document.body.appendChild(floatingWindow);
            
            // 绑定事件
            this.bindFloatingWindowEvents(floatingWindow, selectedText);
            
            this.showToast('✅ 翻译窗口已打开', 'success');
            
        } catch (error) {
            console.error('❌ 创建浮动窗口失败:', error);
            this.showToast('创建翻译窗口失败', 'error');
        }
    }

    // 获取翻译窗口HTML
    getTranslationWindowHTML(selectedText) {
        return `
            <div class="translation-window-content">
                <div class="translation-header">
                    <h3>🌐 智能助手</h3>
                    <button class="close-btn" id="close-translation-window">×</button>
                </div>
                <div class="translation-body">
                    <!-- 功能选择标签 -->
                    <div class="tab-section">
                        <button class="tab-btn active" data-tab="translate">🌐 翻译</button>
                        <button class="tab-btn" data-tab="summarize">📝 总结</button>
                        <button class="tab-btn" data-tab="page-summary">📄 页面总结</button>
                    </div>
                    
                    <!-- 翻译功能 -->
                    <div class="tab-content active" id="translate-tab">
                        <div class="input-section">
                            <label>待翻译文本：</label>
                            <textarea id="translation-input" readonly>${selectedText}</textarea>
                        </div>
                        <div class="controls-section">
                            <select id="target-language">
                                <option value="zh">中文</option>
                                <option value="en">English</option>
                                <option value="ja">日本語</option>
                                <option value="ko">한국어</option>
                                <option value="fr">Français</option>
                                <option value="de">Deutsch</option>
                                <option value="es">Español</option>
                            </select>
                            <button id="translate-btn" class="action-button">🚀 开始翻译</button>
                        </div>
                        <div class="result-section">
                            <label>翻译结果：</label>
                            <div id="translation-result" class="result-area">点击翻译按钮开始翻译...</div>
                        </div>
                    </div>
                    
                    <!-- 内容总结功能 -->
                    <div class="tab-content" id="summarize-tab">
                        <div class="input-section">
                            <label>待总结内容：</label>
                            <textarea id="summarize-input" placeholder="请输入要总结的内容...">${selectedText}</textarea>
                        </div>
                        <div class="controls-section">
                            <select id="summary-type">
                                <option value="brief">💡 简洁总结</option>
                                <option value="detailed">📋 详细总结</option>
                                <option value="keypoints">📌 要点提取</option>
                                <option value="outline">📝 大纲形式</option>
                            </select>
                            <button id="summarize-btn" class="action-button">📄 生成总结</button>
                        </div>
                        <div class="result-section">
                            <label>总结结果：</label>
                            <div id="summarize-result" class="result-area">点击生成总结按钮开始...</div>
                        </div>
                    </div>
                    
                    <!-- 页面总结功能 -->
                    <div class="tab-content" id="page-summary-tab">
                        <div class="input-section">
                            <label>页面内容：</label>
                            <div class="page-info">
                                <div class="page-title">📄 ${document.title}</div>
                                <div class="page-url">🔗 ${window.location.hostname}</div>
                            </div>
                        </div>
                        <div class="controls-section">
                            <select id="page-summary-type">
                                <option value="main">🎯 主要内容总结</option>
                                <option value="full">📄 全页面总结</option>
                                <option value="news">📰 新闻摘要</option>
                                <option value="article">📖 文章概要</option>
                            </select>
                            <button id="page-summarize-btn" class="action-button">🌐 总结页面</button>
                        </div>
                        <div class="result-section">
                            <label>页面总结：</label>
                            <div id="page-summary-result" class="result-area">点击总结页面按钮开始...</div>
                        </div>
                    </div>
                    
                    <!-- API设置 -->
                    <div class="api-section">
                        <input type="text" id="api-key-input" placeholder="请输入Kimi API Key" />
                        <button id="save-api-key" class="save-btn">保存</button>
                    </div>
                </div>
            </div>
        `;
    }

    // 绑定浮动窗口事件
    bindFloatingWindowEvents(window, selectedText) {
        // 关闭按钮
        const closeBtn = window.querySelector('#close-translation-window');
        closeBtn.addEventListener('click', () => {
            window.remove();
        });
        
        // 标签页切换
        const tabBtns = window.querySelectorAll('.tab-btn');
        const tabContents = window.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // 切换标签状态
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                const targetContent = window.querySelector(`#${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
        
        // 翻译按钮
        const translateBtn = window.querySelector('#translate-btn');
        translateBtn.addEventListener('click', () => {
            this.handleTranslation(window);
        });
        
        // 内容总结按钮
        const summarizeBtn = window.querySelector('#summarize-btn');
        summarizeBtn.addEventListener('click', () => {
            this.handleSummarization(window);
        });
        
        // 页面总结按钮
        const pageSummarizeBtn = window.querySelector('#page-summarize-btn');
        pageSummarizeBtn.addEventListener('click', () => {
            this.handlePageSummarization(window);
        });
        
        // 保存API Key按钮
        const saveBtn = window.querySelector('#save-api-key');
        saveBtn.addEventListener('click', () => {
            this.saveApiKey(window);
        });
        
        // 拖拽功能
        this.makeDraggable(window);
        
        // 加载保存的API Key
        this.loadApiKey(window);
    }

    // 处理翻译
    async handleTranslation(window) {
        const resultArea = window.querySelector('#translation-result');
        const translateBtn = window.querySelector('#translate-btn');
        const targetLang = window.querySelector('#target-language').value;
        const apiKeyInput = window.querySelector('#api-key-input');
        const textInput = window.querySelector('#translation-input');
        
        const apiKey = apiKeyInput.value.trim();
        const text = textInput.value.trim();
        
        if (!apiKey) {
            resultArea.textContent = '❌ 请先输入Kimi API Key';
            return;
        }
        
        if (!text) {
            resultArea.textContent = '❌ 请输入要翻译的文本';
            return;
        }
        
        translateBtn.disabled = true;
        translateBtn.textContent = '⏳ 翻译中...';
        resultArea.textContent = '正在翻译，请稍候...';
        
        try {
            const result = await this.callKimiAPI(apiKey, text, 'translate', targetLang);
            resultArea.textContent = result;
        } catch (error) {
            resultArea.textContent = `❌ 翻译失败: ${error.message}`;
        } finally {
            translateBtn.disabled = false;
            translateBtn.textContent = '🚀 开始翻译';
        }
    }

    // 处理内容总结
    async handleSummarization(window) {
        const resultArea = window.querySelector('#summarize-result');
        const summarizeBtn = window.querySelector('#summarize-btn');
        const summaryType = window.querySelector('#summary-type').value;
        const apiKeyInput = window.querySelector('#api-key-input');
        const textInput = window.querySelector('#summarize-input');
        
        const apiKey = apiKeyInput.value.trim();
        const text = textInput.value.trim();
        
        if (!apiKey) {
            resultArea.textContent = '❌ 请先输入Kimi API Key';
            return;
        }
        
        if (!text) {
            resultArea.textContent = '❌ 请输入要总结的内容';
            return;
        }
        
        summarizeBtn.disabled = true;
        summarizeBtn.textContent = '⏳ 总结中...';
        resultArea.textContent = '正在生成总结，请稍候...';
        
        try {
            const result = await this.callKimiAPI(apiKey, text, 'summarize', summaryType);
            resultArea.textContent = result;
        } catch (error) {
            resultArea.textContent = `❌ 总结失败: ${error.message}`;
        } finally {
            summarizeBtn.disabled = false;
            summarizeBtn.textContent = '📄 生成总结';
        }
    }

    // 处理页面总结
    async handlePageSummarization(window) {
        const resultArea = window.querySelector('#page-summary-result');
        const pageSummarizeBtn = window.querySelector('#page-summarize-btn');
        const summaryType = window.querySelector('#page-summary-type').value;
        const apiKeyInput = window.querySelector('#api-key-input');
        
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            resultArea.textContent = '❌ 请先输入Kimi API Key';
            return;
        }
        
        pageSummarizeBtn.disabled = true;
        pageSummarizeBtn.textContent = '⏳ 总结中...';
        resultArea.textContent = '正在提取页面内容并总结，请稍候...';
        
        try {
            // 提取页面内容
            const pageContent = this.extractPageContent();
            if (!pageContent) {
                resultArea.textContent = '❌ 无法提取页面内容';
                pageSummarizeBtn.disabled = false;
                pageSummarizeBtn.textContent = '🌐 总结页面';
                return;
            }
            
            const result = await this.callKimiAPI(apiKey, pageContent, 'page-summarize', summaryType);
            resultArea.textContent = result;
        } catch (error) {
            resultArea.textContent = `❌ 页面总结失败: ${error.message}`;
        } finally {
            pageSummarizeBtn.disabled = false;
            pageSummarizeBtn.textContent = '🌐 总结页面';
        }
    }

    // 调用Kimi API
    async callKimiAPI(apiKey, text, action, param) {
        let prompt;
        
        switch (action) {
            case 'translate':
                const langNames = {
                    'zh': '中文',
                    'en': 'English',
                    'ja': '日本語',
                    'ko': '한국어',
                    'fr': 'Français',
                    'de': 'Deutsch',
                    'es': 'Español'
                };
                prompt = `请将以下内容翻译成${langNames[param]}，保持原文的格式和语气：\n\n${text}`;
                break;
                
            case 'summarize':
                const summaryTypes = {
                    'brief': '请对以下内容进行简洁明了的总结，提取核心要点：',
                    'detailed': '请对以下内容进行详细全面的总结，包含主要观点和重要细节：',
                    'keypoints': '请提取以下内容的关键要点，以条目形式列出：',
                    'outline': '请为以下内容生成大纲形式的总结：'
                };
                prompt = `${summaryTypes[param] || summaryTypes.brief}\n\n${text}`;
                break;
                
            case 'page-summarize':
                const pageTypes = {
                    'main': '请总结这个网页的主要内容：',
                    'full': '请对这个网页进行全面的内容总结：',
                    'news': '请以新闻摘要的形式总结这个网页：',
                    'article': '请以文章概要的形式总结这个网页：'
                };
                prompt = `${pageTypes[param] || pageTypes.main}\n\n网页标题：${document.title}\n网页内容：\n${text}`;
                break;
                
            default:
                throw new Error('未知的操作类型');
        }
        
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "moonshot-v1-8k",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: false,
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('API返回数据格式错误');
        }
    }

    // 提取页面内容
    extractPageContent() {
        try {
            // 尝试多种方法提取页面主要内容
            let content = '';
            
            // 方法1: 查找常见的文章容器
            const articleSelectors = [
                'article',
                '[role="main"]',
                'main',
                '.content',
                '.article-content',
                '.post-content',
                '.entry-content',
                '#content',
                '#main-content'
            ];
            
            for (const selector of articleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    content = element.innerText;
                    break;
                }
            }
            
            // 方法2: 如果没找到特定容器，提取body中的段落
            if (!content) {
                const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
                content = Array.from(paragraphs)
                    .map(p => p.innerText.trim())
                    .filter(text => text.length > 20)
                    .join('\n\n');
            }
            
            // 方法3: 最后的备用方案
            if (!content) {
                content = document.body.innerText;
            }
            
            // 清理和限制内容长度
            content = content.replace(/\s+/g, ' ').trim();
            
            // 限制内容长度（避免超过API限制）
            if (content.length > 8000) {
                content = content.substring(0, 8000) + '...';
            }
            
            return content;
        } catch (error) {
            console.error('提取页面内容失败:', error);
            return null;
        }
    }

    // 保存API Key
    saveApiKey(window) {
        const apiKeyInput = window.querySelector('#api-key-input');
        const apiKey = apiKeyInput.value.trim();
        
        if (apiKey) {
            chrome.storage.sync.set({ kimiApiKey: apiKey }, () => {
                this.showToast('✅ API Key已保存', 'success');
            });
        }
    }

    // 加载API Key
    loadApiKey(window) {
        chrome.storage.sync.get(['kimiApiKey'], (result) => {
            if (result.kimiApiKey) {
                const apiKeyInput = window.querySelector('#api-key-input');
                apiKeyInput.value = result.kimiApiKey;
            }
        });
    }

    // 使窗口可拖拽
    makeDraggable(window) {
        const header = window.querySelector('.translation-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === header || e.target.tagName === 'H3') {
                isDragging = true;
                header.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                window.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            header.style.cursor = 'grab';
        });
        
        header.style.cursor = 'grab';
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContentScriptManager();
    });
} else {
    new ContentScriptManager();
}

// 导出类供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentScriptManager;
}
