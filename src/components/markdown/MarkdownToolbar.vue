<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import { 
  Document, 
  Edit, 
  Reading, 
  PictureFilled, 
  Link, 
  Histogram, 
  Paperclip, 
  ChatDotRound, 
  Tickets,
  List,
  Refresh,
  Delete,
  CopyDocument
} from '@element-plus/icons-vue';

// 定义属性
const props = defineProps({
  // 是否禁用工具栏
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否可以撤销
  canUndo: {
    type: Boolean,
    default: false
  },
  // 是否可以重做
  canRedo: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits([
  'insertHeading',
  'insertBold',
  'insertItalic',
  'insertLink',
  'insertImage',
  'insertCodeBlock',
  'insertQuote',
  'insertUnorderedList',
  'insertOrderedList',
  'insertTaskList',
  'insertTable',
  'insertHorizontalRule',
  'undo',
  'redo',
  'clear'
]);

// 标题对话框
const headingDialogVisible = ref(false);

// 处理标题插入
const handleHeadingInsert = (level) => {
  emit('insertHeading', level);
  headingDialogVisible.value = false;
};
</script>

<template>
  <div class="markdown-toolbar">
    <!-- 文本格式工具 -->
    <div class="toolbar-group">
      <el-tooltip content="标题" placement="top">
        <el-dropdown trigger="click" @command="handleHeadingInsert">
          <el-button :disabled="disabled" size="small">
            <el-icon><Reading /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="1">H1 标题</el-dropdown-item>
              <el-dropdown-item :command="2">H2 标题</el-dropdown-item>
              <el-dropdown-item :command="3">H3 标题</el-dropdown-item>
              <el-dropdown-item :command="4">H4 标题</el-dropdown-item>
              <el-dropdown-item :command="5">H5 标题</el-dropdown-item>
              <el-dropdown-item :command="6">H6 标题</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-tooltip>
      
      <el-tooltip content="粗体" placement="top">
        <el-button :disabled="disabled" @click="emit('insertBold')" size="small">
          <span class="toolbar-icon toolbar-icon-bold">B</span>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="斜体" placement="top">
        <el-button :disabled="disabled" @click="emit('insertItalic')" size="small">
          <span class="toolbar-icon toolbar-icon-italic">I</span>
        </el-button>
      </el-tooltip>
    </div>
    
    <div class="toolbar-divider"></div>
    
    <!-- 插入内容工具 -->
    <div class="toolbar-group">
      <el-tooltip content="链接" placement="top">
        <el-button :disabled="disabled" @click="emit('insertLink')" size="small">
          <el-icon><Link /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="图片" placement="top">
        <el-button :disabled="disabled" @click="emit('insertImage')" size="small">
          <el-icon><PictureFilled /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="代码块" placement="top">
        <el-button :disabled="disabled" @click="emit('insertCodeBlock')" size="small">
          <span class="toolbar-icon toolbar-icon-code">{}</span>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="引用" placement="top">
        <el-button :disabled="disabled" @click="emit('insertQuote')" size="small">
          <el-icon><ChatDotRound /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    
    <div class="toolbar-divider"></div>
    
    <!-- 列表工具 -->
    <div class="toolbar-group">
      <el-tooltip content="无序列表" placement="top">
        <el-button :disabled="disabled" @click="emit('insertUnorderedList')" size="small">
          <el-icon><List /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="有序列表" placement="top">
        <el-button :disabled="disabled" @click="emit('insertOrderedList')" size="small">
          <span class="toolbar-icon">1.</span>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="任务列表" placement="top">
        <el-button :disabled="disabled" @click="emit('insertTaskList')" size="small">
          <span class="toolbar-icon">☑</span>
        </el-button>
      </el-tooltip>
    </div>
    
    <div class="toolbar-divider"></div>
    
    <!-- 表格和分隔线 -->
    <div class="toolbar-group">
      <el-tooltip content="表格" placement="top">
        <el-button :disabled="disabled" @click="emit('insertTable')" size="small">
          <el-icon><Tickets /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="分隔线" placement="top">
        <el-button :disabled="disabled" @click="emit('insertHorizontalRule')" size="small">
          <el-icon><Histogram /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    
    <div class="toolbar-divider"></div>
    
    <!-- 撤销和重做 -->
    <div class="toolbar-group">
      <el-tooltip content="撤销" placement="top">
        <el-button :disabled="disabled || !canUndo" @click="emit('undo')" size="small">
          <el-icon><Refresh style="transform: scaleX(-1)" /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="重做" placement="top">
        <el-button :disabled="disabled || !canRedo" @click="emit('redo')" size="small">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    
    <div class="toolbar-divider"></div>
    
    <!-- 其他工具 -->
    <div class="toolbar-group">
      <el-tooltip content="清空" placement="top">
        <el-button :disabled="disabled" @click="emit('clear')" size="small">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
.markdown-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #dcdfe6;
  margin: 0 8px;
}

.toolbar-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  line-height: 1;
}

.toolbar-icon-bold {
  font-weight: bold;
}

.toolbar-icon-italic {
  font-style: italic;
}

.toolbar-icon-code {
  font-family: monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .markdown-toolbar {
    padding: 4px;
  }
  
  .toolbar-divider {
    margin: 0 4px;
  }
}
</style> 