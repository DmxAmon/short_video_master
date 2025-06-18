<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : Markdown预览组件
-->
<script setup>
import { ref, onMounted, watch, defineProps, defineExpose } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

// 配置marked选项
marked.setOptions({
  gfm: true, // GitHub风格的Markdown
  breaks: true, // 将换行符转换为<br>
  headerIds: true, // 为标题添加id
  langPrefix: 'hljs language-', // 代码块的类名前缀
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
});

// 定义组件属性
const props = defineProps({
  // Markdown内容
  content: {
    type: String,
    default: ''
  },
  // 是否自动渲染
  autoRender: {
    type: Boolean,
    default: true
  },
  // 容器高度
  height: {
    type: String,
    default: '100%'
  },
  // 预览区域的自定义类名
  previewClass: {
    type: String,
    default: ''
  },
  // 是否启用目录
  enableToc: {
    type: Boolean,
    default: false
  }
});

// 渲染后的HTML
const renderedHtml = ref('');
// 目录列表
const tocItems = ref([]);
// 预览容器引用
const previewContainerRef = ref(null);

// 渲染Markdown内容
const renderMarkdown = () => {
  if (!props.content) {
    renderedHtml.value = '';
    tocItems.value = [];
    return;
  }

  // 处理内容和提取标题
  try {
    // 将Markdown渲染为HTML
    const html = marked(props.content);
    
    // 使用DOMPurify清理HTML，防止XSS攻击
    renderedHtml.value = DOMPurify.sanitize(html);
    
    // 如果启用了目录，则提取标题
    if (props.enableToc) {
      generateToc();
    }
  } catch (error) {
    console.error('Markdown渲染失败:', error);
    renderedHtml.value = `<div class="markdown-error">Markdown渲染失败: ${error.message}</div>`;
  }
};

// 生成目录
const generateToc = () => {
  tocItems.value = [];
  
  // 创建临时DOM元素来解析渲染后的HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderedHtml.value;
  
  // 查找所有标题元素
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  headings.forEach((heading, index) => {
    // 为每个标题添加ID（如果没有）
    if (!heading.id) {
      heading.id = `heading-${index}`;
    }
    
    // 获取标题级别
    const level = parseInt(heading.tagName.substring(1));
    
    // 添加到目录中
    tocItems.value.push({
      id: heading.id,
      text: heading.textContent,
      level: level
    });
  });
};

// 滚动到指定标题
const scrollToHeading = (id) => {
  // 确保预览容器已加载
  if (!previewContainerRef.value) return;
  
  // 查找要滚动到的元素
  const targetElement = previewContainerRef.value.querySelector(`#${id}`);
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 监听内容变化，自动渲染
watch(() => props.content, () => {
  if (props.autoRender) {
    renderMarkdown();
  }
}, { immediate: true });

// 在组件挂载后初始化
onMounted(() => {
  if (props.autoRender && props.content) {
    renderMarkdown();
  }
});

// 将函数暴露给父组件
defineExpose({
  renderMarkdown,
  scrollToHeading
});
</script>

<template>
  <div class="markdown-preview-container" :style="{ height: height }">
    <!-- 目录部分 -->
    <div v-if="enableToc && tocItems.length > 0" class="markdown-toc">
      <div class="toc-title">目录</div>
      <div class="toc-items">
        <div 
          v-for="item in tocItems" 
          :key="item.id" 
          class="toc-item"
          :class="[`level-${item.level}`]"
          @click="scrollToHeading(item.id)"
        >
          {{ item.text }}
        </div>
      </div>
    </div>
    
    <!-- 预览内容部分 -->
    <div 
      ref="previewContainerRef"
      class="markdown-preview" 
      :class="previewClass"
      v-html="renderedHtml"
    ></div>
  </div>
</template>

<style>
/* 全局样式，不使用scoped，确保可以影响渲染的Markdown内容 */
.markdown-preview-container {
  display: flex;
  overflow: hidden;
  border-radius: 4px;
}

/* 目录样式 */
.markdown-toc {
  flex: 0 0 220px;
  padding: 15px;
  border-right: 1px solid #e0e0e0;
  background-color: #f5f7fa;
  overflow-y: auto;
}

.toc-title {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid #dcdfe6;
}

.toc-items {
  display: flex;
  flex-direction: column;
}

.toc-item {
  padding: 4px 0;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.toc-item:hover {
  color: #409eff;
}

.toc-item.level-1 { padding-left: 0; font-weight: 600; }
.toc-item.level-2 { padding-left: 12px; }
.toc-item.level-3 { padding-left: 24px; }
.toc-item.level-4 { padding-left: 36px; }
.toc-item.level-5 { padding-left: 48px; }
.toc-item.level-6 { padding-left: 60px; }

/* 预览内容样式 */
.markdown-preview {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  line-height: 1.6;
}

/* Markdown内容样式 */
.markdown-preview h1 {
  font-size: 2em;
  margin: 0.67em 0;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-preview h2 {
  font-size: 1.5em;
  margin: 0.83em 0;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-preview h3 {
  font-size: 1.25em;
  margin: 1em 0;
}

.markdown-preview h4 {
  font-size: 1em;
  margin: 1.33em 0;
}

.markdown-preview h5 {
  font-size: 0.875em;
  margin: 1.67em 0;
}

.markdown-preview h6 {
  font-size: 0.85em;
  margin: 2.33em 0;
  color: #6a737d;
}

.markdown-preview p {
  margin: 1em 0;
}

.markdown-preview a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-preview a:hover {
  text-decoration: underline;
}

.markdown-preview code {
  font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
}

.markdown-preview pre {
  margin: 1em 0;
  overflow: auto;
  background-color: #f6f8fa;
  border-radius: 3px;
  padding: 16px;
}

.markdown-preview pre code {
  padding: 0;
  background-color: transparent;
  font-size: 90%;
}

.markdown-preview blockquote {
  margin: 1em 0;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}

.markdown-preview table {
  display: block;
  width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  margin: 1em 0;
}

.markdown-preview table th {
  font-weight: 600;
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview table tr {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

.markdown-preview table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.markdown-preview img {
  max-width: 100%;
  box-sizing: content-box;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-preview li + li {
  margin-top: 0.25em;
}

.markdown-preview hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

.markdown-error {
  color: #f56c6c;
  padding: 10px;
  background-color: #fef0f0;
  border-radius: 4px;
}

/* 复选框样式 */
.markdown-preview input[type="checkbox"] {
  margin-right: 0.5em;
}

/* 媒体查询，在小屏幕上调整布局 */
@media (max-width: 768px) {
  .markdown-preview-container {
    flex-direction: column;
  }
  
  .markdown-toc {
    flex: 0 0 auto;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
}
</style> 