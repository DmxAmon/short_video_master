<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : Markdown编辑器组件
-->
<script setup>
import { ref, computed, onMounted, defineProps, defineEmits, defineExpose, watch } from 'vue';
import { ElMessage } from 'element-plus';
import 'element-plus/theme-chalk/el-message.css';
import { 
  DocumentAdd, Edit, Download, Document as CopyDocument, RefreshRight, RefreshLeft,
  Reading, Delete, Plus as Save, Crop, Upload, Camera, Link, Share, View
} from '@element-plus/icons-vue';

// 定义属性
const props = defineProps({
  // 编辑器的初始内容
  modelValue: {
    type: String,
    default: ''
  },
  // 编辑器高度
  height: {
    type: String,
    default: '100%'
  },
  // 编辑器占位符
  placeholder: {
    type: String,
    default: '请输入Markdown内容...'
  },
  // 是否自动聚焦
  autofocus: {
    type: Boolean,
    default: false
  },
  // 编辑器自定义类名
  editorClass: {
    type: String,
    default: ''
  },
  // 是否显示行号
  showLineNumbers: {
    type: Boolean,
    default: true
  },
  // 是否支持历史记录
  enableHistory: {
    type: Boolean,
    default: true
  },
  // 是否启用自动保存
  enableAutoSave: {
    type: Boolean,
    default: false
  },
  // 自动保存的键名
  autoSaveKey: {
    type: String,
    default: 'markdown-editor-content'
  }
});

// 定义事件
const emit = defineEmits(['update:modelValue', 'change', 'input', 'focus', 'blur', 'save']);

// 编辑器引用
const editorRef = ref(null);
// 编辑器内容
const content = ref(props.modelValue || '');
// 是否处于焦点状态
const isFocused = ref(false);
// 编辑器Textarea DOM
const textareaRef = ref(null);
// 历史记录
const history = ref({
  undoStack: [],
  redoStack: [],
  lastSavedContent: props.modelValue
});
// 定时器ID
const autoSaveTimerId = ref(null);

// 计算编辑区可见行数
const visibleLines = computed(() => {
  if (!editorRef.value) return 0;
  const lineHeight = parseInt(getComputedStyle(editorRef.value).lineHeight);
  const height = editorRef.value.clientHeight;
  return Math.floor(height / lineHeight);
});

// 处理内容变化
const handleInput = (e) => {
  const newValue = e.target.value;
  content.value = newValue;
  emit('update:modelValue', newValue);
  emit('input', newValue);
  
  // 添加到历史记录
  if (props.enableHistory) {
    // 只有内容变化时才添加到历史记录
    if (history.value.undoStack.length === 0 || 
        history.value.undoStack[history.value.undoStack.length - 1] !== newValue) {
      history.value.undoStack.push(newValue);
      // 清空重做栈
      history.value.redoStack = [];
      
      // 限制历史记录的长度，防止内存占用过大
      if (history.value.undoStack.length > 50) {
        history.value.undoStack.shift();
      }
    }
  }
  
  // 自动保存
  if (props.enableAutoSave) {
    if (autoSaveTimerId.value) {
      clearTimeout(autoSaveTimerId.value);
    }
    
    autoSaveTimerId.value = setTimeout(() => {
      saveToLocalStorage();
    }, 1000); // 1秒后自动保存
  }
  
  emit('change', newValue);
};

// 撤销操作
const undo = () => {
  if (!props.enableHistory || history.value.undoStack.length <= 1) return;
  
  // 保存当前内容到重做栈
  const currentContent = content.value;
  history.value.redoStack.push(currentContent);
  
  // 弹出最后一个状态
  history.value.undoStack.pop();
  
  // 取上一个状态
  const previousContent = history.value.undoStack[history.value.undoStack.length - 1];
  content.value = previousContent;
  emit('update:modelValue', previousContent);
  emit('change', previousContent);
};

// 重做操作
const redo = () => {
  if (!props.enableHistory || history.value.redoStack.length === 0) return;
  
  // 取出重做栈的最后一个状态
  const nextContent = history.value.redoStack.pop();
  
  // 添加到撤销栈
  history.value.undoStack.push(nextContent);
  
  // 更新内容
  content.value = nextContent;
  emit('update:modelValue', nextContent);
  emit('change', nextContent);
};

// 处理编辑器聚焦
const handleFocus = (e) => {
  isFocused.value = true;
  emit('focus', e);
};

// 处理编辑器失焦
const handleBlur = (e) => {
  isFocused.value = false;
  emit('blur', e);
  
  // 失焦时保存
  if (props.enableAutoSave) {
    saveToLocalStorage();
  }
};

// 保存到本地存储
const saveToLocalStorage = () => {
  try {
    localStorage.setItem(props.autoSaveKey, content.value);
    history.value.lastSavedContent = content.value;
    emit('save', content.value);
  } catch (error) {
    console.error('保存到本地存储失败:', error);
    ElMessage.error('自动保存失败');
  }
};

// 从本地存储加载
const loadFromLocalStorage = () => {
  if (!props.enableAutoSave) return;
  
  try {
    const savedContent = localStorage.getItem(props.autoSaveKey);
    if (savedContent && savedContent !== props.modelValue) {
      content.value = savedContent;
      emit('update:modelValue', savedContent);
      
      // 添加到历史记录
      if (props.enableHistory) {
        history.value.undoStack = [savedContent];
        history.value.redoStack = [];
      }
      
      ElMessage.success('已从本地恢复上次编辑内容');
    }
  } catch (error) {
    console.error('从本地存储加载失败:', error);
  }
};

// 在文本区域插入文本
const insertText = (text, position) => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = position?.start ?? textarea.selectionStart;
  const end = position?.end ?? textarea.selectionEnd;
  
  // 获取插入前后的文本
  const beforeText = content.value.substring(0, start);
  const afterText = content.value.substring(end);
  
  // 组合新文本
  const newContent = beforeText + text + afterText;
  content.value = newContent;
  emit('update:modelValue', newContent);
  emit('change', newContent);
  
  // 更新光标位置（插入文本后的位置）
  const newCursorPosition = start + text.length;
  
  // 光标回到编辑区域
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
  }, 0);
  
  // 添加到历史记录
  if (props.enableHistory) {
    history.value.undoStack.push(newContent);
    history.value.redoStack = [];
  }
};

// 插入标题
const insertHeading = (level) => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  
  // 创建标题标记
  const prefix = '#'.repeat(level) + ' ';
  
  // 检查选中文本是否已经是该级别的标题
  const lineStart = content.value.lastIndexOf('\n', start - 1) + 1;
  const existingPrefix = content.value.substring(lineStart, start);
  
  if (existingPrefix === prefix) {
    // 已经是该级别标题，则移除标题格式
    const beforeText = content.value.substring(0, lineStart);
    const afterText = content.value.substring(start);
    
    const newContent = beforeText + afterText;
    content.value = newContent;
    emit('update:modelValue', newContent);
    
    // 更新光标位置
    const newPosition = lineStart;
    textarea.setSelectionRange(newPosition, newPosition + selectedText.length);
  } else {
    // 不是该级别标题，添加标题格式
    const beforeText = content.value.substring(0, lineStart);
    const afterText = content.value.substring(end);
    
    const newContent = beforeText + prefix + selectedText + afterText;
    content.value = newContent;
    emit('update:modelValue', newContent);
    
    // 更新光标位置
    const newPosition = lineStart + prefix.length;
    textarea.setSelectionRange(newPosition, newPosition + selectedText.length);
  }
  
  // 添加到历史记录
  if (props.enableHistory) {
    history.value.undoStack.push(content.value);
    history.value.redoStack = [];
  }
  
  // 聚焦文本区域
  textarea.focus();
};

// 插入粗体
const insertBold = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  const replacement = selectedText ? `**${selectedText}**` : '**粗体文本**';
  
  // 插入文本
  insertText(replacement, { start, end });
};

// 插入斜体
const insertItalic = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  const replacement = selectedText ? `*${selectedText}*` : '*斜体文本*';
  
  // 插入文本
  insertText(replacement, { start, end });
};

// 插入链接
const insertLink = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  const replacement = selectedText ? `[${selectedText}](链接地址)` : '[链接文本](链接地址)';
  
  // 插入文本
  insertText(replacement, { start, end });
};

// 插入图片
const insertImage = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  
  // 插入图片标记
  const replacement = '![图片描述](图片链接)';
  
  // 插入文本
  insertText(replacement, { start, end: start });
};

// 插入代码块
const insertCodeBlock = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  
  // 插入代码块
  const replacement = selectedText ? 
    `\`\`\`\n${selectedText}\n\`\`\`` : 
    '```\n代码块\n```';
  
  // 插入文本
  insertText(replacement, { start, end });
};

// 插入引用
const insertQuote = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  
  // 处理多行情况
  if (selectedText.includes('\n')) {
    // 为每一行添加引用标记
    const quotedText = selectedText
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
    
    insertText(quotedText, { start, end });
  } else {
    // 单行情况
    const replacement = `> ${selectedText || '引用文本'}`;
    insertText(replacement, { start, end });
  }
};

// 插入分割线
const insertHorizontalRule = () => {
  insertText('\n---\n');
};

// 插入无序列表
const insertUnorderedList = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  
  // 处理多行情况
  if (selectedText.includes('\n')) {
    // 为每一行添加列表标记
    const listText = selectedText
      .split('\n')
      .map(line => `- ${line}`)
      .join('\n');
    
    insertText(listText, { start, end });
  } else {
    // 单行情况
    const replacement = `- ${selectedText || '列表项'}`;
    insertText(replacement, { start, end });
  }
};

// 插入有序列表
const insertOrderedList = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  
  // 处理多行情况
  if (selectedText.includes('\n')) {
    // 为每一行添加列表标记和序号
    const lines = selectedText.split('\n');
    const listText = lines
      .map((line, index) => `${index + 1}. ${line}`)
      .join('\n');
    
    insertText(listText, { start, end });
  } else {
    // 单行情况
    const replacement = `1. ${selectedText || '列表项'}`;
    insertText(replacement, { start, end });
  }
};

// 插入任务列表
const insertTaskList = () => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 获取选中的文本
  const selectedText = content.value.substring(start, end);
  
  // 处理多行情况
  if (selectedText.includes('\n')) {
    // 为每一行添加任务列表标记
    const taskText = selectedText
      .split('\n')
      .map(line => `- [ ] ${line}`)
      .join('\n');
    
    insertText(taskText, { start, end });
  } else {
    // 单行情况
    const replacement = `- [ ] ${selectedText || '任务项'}`;
    insertText(replacement, { start, end });
  }
};

// 插入表格
const insertTable = () => {
  const tableTemplate = `
| 标题1 | 标题2 | 标题3 |
| ----- | ----- | ----- |
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`.trimStart();

  insertText(tableTemplate);
};

// 清空编辑器
const clearContent = () => {
  content.value = '';
  emit('update:modelValue', '');
  emit('change', '');
  
  // 添加到历史记录
  if (props.enableHistory) {
    history.value.undoStack.push('');
    history.value.redoStack = [];
  }
  
  // 自动保存
  if (props.enableAutoSave) {
    saveToLocalStorage();
  }
};

// 设置编辑器内容
const setContent = (newContent) => {
  content.value = newContent;
  emit('update:modelValue', newContent);
  emit('change', newContent);
  
  // 添加到历史记录
  if (props.enableHistory) {
    history.value.undoStack.push(newContent);
    history.value.redoStack = [];
  }
  
  // 自动保存
  if (props.enableAutoSave) {
    saveToLocalStorage();
  }
};

// 监听modelValue变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue;
  }
});

// 在组件挂载后初始化
onMounted(() => {
  // 从本地存储加载内容
  if (props.enableAutoSave) {
    loadFromLocalStorage();
  }
  
  // 自动聚焦
  if (props.autofocus && textareaRef.value) {
    textareaRef.value.focus();
  }
});

// 暴露方法给父组件
defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  insertText,
  insertHeading,
  insertBold,
  insertItalic,
  insertLink,
  insertImage,
  insertCodeBlock,
  insertQuote,
  insertHorizontalRule,
  insertUnorderedList,
  insertOrderedList,
  insertTaskList,
  insertTable,
  undo,
  redo,
  clearContent,
  setContent,
  saveToLocalStorage,
  loadFromLocalStorage
});
</script>

<template>
  <div 
    class="markdown-editor-container" 
    :class="editorClass" 
    :style="{ height }"
    ref="editorRef"
  >
    <!-- 编辑区域 -->
    <div class="editor-wrapper">
      <!-- 行号显示 -->
      <div v-if="showLineNumbers" class="line-numbers">
        <div 
          v-for="n in Math.max(content.split('\n').length, 1)" 
          :key="n" 
          class="line-number"
        >
          {{ n }}
        </div>
      </div>
      
      <!-- 文本区域 -->
      <textarea
        ref="textareaRef"
        class="editor-textarea"
        :placeholder="placeholder"
        v-model="content"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.ctrl.z.prevent="undo"
        @keydown.ctrl.y.prevent="redo"
        @keydown.meta.z.prevent="undo"
        @keydown.meta.shift.z.prevent="redo"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: inherit;
  background-color: #fff;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.line-numbers {
  flex: 0 0 auto;
  width: 40px;
  background-color: #f5f7fa;
  padding: 10px 0;
  text-align: center;
  overflow-y: hidden;
  user-select: none;
  border-right: 1px solid #ebeef5;
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.line-number {
  padding: 0 5px;
}

.editor-textarea {
  flex: 1;
  min-height: 100%;
  resize: none;
  border: none;
  outline: none;
  padding: 10px;
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  tab-size: 2;
  color: #2c3e50;
  overflow-y: auto;
  background-color: #fff;
}

.editor-textarea:focus {
  outline: none;
}

/* 自定义滚动条样式 */
.editor-textarea::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.editor-textarea::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.editor-textarea::-webkit-scrollbar-track {
  background: #f5f7fa;
}

/* Firefox滚动条样式 */
.editor-textarea {
  scrollbar-width: thin;
  scrollbar-color: #c0c4cc #f5f7fa;
}

/* 占位符样式 */
.editor-textarea::placeholder {
  color: #c0c4cc;
  opacity: 1;
}

@media (max-width: 768px) {
  .line-numbers {
    display: none;
  }
}
</style> 