/**
 * Markdown功能模块
 * 提供Markdown编辑器常用功能
 */
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * Markdown编辑器的可复用逻辑
 * @param {Object} options 配置选项
 * @returns {Object} Markdown相关方法和状态
 */
export function useMarkdown(options = {}) {
  const {
    initialContent = '',
    autoSave = false,
    storageKey = 'markdown_content',
  } = options;

  // 初始化配置
  const config = {
    maxHistoryLength: options.maxHistoryLength || 50,
    placeholder: options.placeholder || '请输入Markdown内容...'
  };

  // Markdown内容
  const content = ref(initialContent);
  
  // 历史记录，用于撤销/重做
  const history = ref([initialContent]);
  const historyIndex = ref(0);
  
  // 撤销和重做状态
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);
  
  // 编辑区域DOM引用
  const editorRef = ref(null);
  
  // 预览模式
  const previewMode = ref(false);
  
  // 是否为暗黑模式
  const isDarkMode = ref(options.darkMode || false);

  /**
   * 添加内容变更到历史记录
   */
  const addToHistory = (newContent) => {
    // 如果历史记录索引不在最后，则删除索引后的所有记录
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    
    // 只有当内容有变化时才添加新的历史记录
    if (newContent !== history.value[historyIndex.value]) {
      history.value.push(newContent);
      historyIndex.value = history.value.length - 1;
    }
  };

  /**
   * 撤销操作
   */
  const undo = () => {
    if (canUndo.value) {
      historyIndex.value--;
      content.value = history.value[historyIndex.value];
    } else {
      ElMessage.info('没有更多可撤销的操作');
    }
  };

  /**
   * 重做操作
   */
  const redo = () => {
    if (canRedo.value) {
      historyIndex.value++;
      content.value = history.value[historyIndex.value];
    } else {
      ElMessage.info('没有更多可重做的操作');
    }
  };

  /**
   * 保存内容到本地存储
   */
  const save = () => {
    if (autoSave && storageKey) {
      localStorage.setItem(storageKey, content.value);
    }
  };

  /**
   * 从本地存储加载内容
   */
  const loadFromStorage = () => {
    if (autoSave && storageKey) {
      const savedContent = localStorage.getItem(storageKey);
      if (savedContent) {
        content.value = savedContent;
        history.value = [savedContent];
        historyIndex.value = 0;
      }
    }
  };

  /**
   * 自动保存定时器
   */
  let autoSaveTimer = null;
  
  /**
   * 开始自动保存
   */
  const startAutoSave = () => {
    if (autoSave && storageKey) {
      autoSaveTimer = setInterval(save, 30000); // 每30秒保存一次
    }
  };

  /**
   * 停止自动保存
   */
  const stopAutoSave = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  };

  /**
   * 监听内容变化
   */
  const handleContentChange = (newContent) => {
    content.value = newContent;
    addToHistory(newContent);
    
    // 如果启用了自动保存，则进行保存
    if (autoSave && storageKey) {
      save();
    }
  };

  /**
   * 复制内容到剪贴板
   */
  const copyToClipboard = async () => {
    if (!content.value) return Promise.reject(new Error('没有内容可复制'));
    
    try {
      await navigator.clipboard.writeText(content.value);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  /**
   * 下载Markdown文件
   * @param {string} filename 文件名
   */
  const downloadMarkdown = (filename = 'document.md') => {
    const blob = new Blob([content.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 切换预览模式
   */
  const togglePreview = () => {
    previewMode.value = !previewMode.value;
  };

  /**
   * 切换暗黑模式
   */
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value;
  };

  /**
   * 计算字数
   */
  const wordCount = computed(() => {
    // 移除Markdown标记，只计算实际文本
    const text = content.value
      .replace(/#+\s/g, '') // 移除标题标记
      .replace(/\*\*|\*/g, '') // 移除加粗和斜体标记
      .replace(/`{1,3}[\s\S]*?`{1,3}/g, '') // 移除代码块
      .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
      .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
      .replace(/>\s.*/g, '') // 移除引用
      .replace(/(-|\d+\.)\s/g, '') // 移除列表标记
      .replace(/\|/g, ' ') // 将表格分隔符替换为空格
      .replace(/\s+/g, ' ') // 将多个空格合并为一个
      .trim();
    
    // 计算中英文字数
    return text.length;
  });

  // 生命周期钩子
  onMounted(() => {
    // 从本地存储加载内容
    loadFromStorage();
    
    // 启动自动保存
    startAutoSave();
  });
  
  onBeforeUnmount(() => {
    // 停止自动保存
    stopAutoSave();
    
    // 最后保存一次
    if (autoSave && storageKey) {
      save();
    }
  });

  // 返回所有方法和状态
  return {
    // 状态
    content,
    previewMode,
    isDarkMode,
    editorRef,
    wordCount,
    
    // 核心编辑方法
    handleContentChange,
    
    // 历史记录操作
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Markdown格式化功能
    insertBold,
    insertItalic,
    insertHeading,
    insertLink,
    insertImage,
    insertCodeBlock,
    insertInlineCode,
    insertBlockquote,
    insertUnorderedList,
    insertOrderedList,
    insertHorizontalRule,
    insertTable,
    
    // 其他功能
    copyToClipboard,
    downloadMarkdown,
    togglePreview,
    toggleDarkMode
  };
} 