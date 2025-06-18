<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 视频转写组件，用于将视频转换为文本
-->
<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import InfoCard from '../common/InfoCard.vue';
import { useTranscription } from '../../composables/useTranscription';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  },
  videoData: {
    type: Object,
    default: null
  },
  hasAdvancedOptions: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits(['transcription-success', 'transcription-error']);

// 使用转写钩子
const {
  videoUrl,
  transcriptionOptions,
  taskStatus,
  transcriptionResult,
  submitting,
  polling,
  submitTask,
  checkTaskStatus,
  fetchResult,
  resetTranscription,
  formattedResult
} = useTranscription();

// 当传入预填充的视频数据时，自动填充视频URL
watch(() => props.videoData, (newVal) => {
  if (newVal && newVal.video_url) {
    videoUrl.value = newVal.video_url;
  }
}, { immediate: true });

// 提交转写任务
const handleSubmit = async () => {
  if (!videoUrl.value) {
    ElMessage.warning('请输入视频URL');
    return;
  }
  
  try {
    await submitTask();
    emit('transcription-success', { taskId: taskStatus.taskId });
  } catch (error) {
    emit('transcription-error', error);
  }
};

// 取消任务
const handleCancel = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要取消当前转写任务吗？',
      '取消任务',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    if (result === 'confirm') {
      resetTranscription();
      ElMessage.success('任务已取消');
    }
  } catch {
    // 用户取消操作
  }
};

// 复制转写结果
const copyResult = () => {
  if (!transcriptionResult.value) {
    ElMessage.warning('没有可复制的转写结果');
    return;
  }
  
  navigator.clipboard.writeText(formattedResult.value)
    .then(() => {
      ElMessage.success('转写结果已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制');
    });
};

// 下载转写结果
const downloadResult = () => {
  if (!transcriptionResult.value) {
    ElMessage.warning('没有可下载的转写结果');
    return;
  }
  
  const fileName = `转写结果_${new Date().toISOString().slice(0, 10)}.txt`;
  const blob = new Blob([formattedResult.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  
  URL.revokeObjectURL(url);
  ElMessage.success('转写结果已下载');
};

// 计算转写进度百分比
const progressPercentage = computed(() => {
  if (!taskStatus.progress || taskStatus.progress < 0) {
    return 0;
  }
  return Math.min(Math.round(taskStatus.progress * 100), 100);
});

// 任务状态文本
const statusText = computed(() => {
  switch (taskStatus.status) {
    case 'pending':
      return '等待处理';
    case 'processing':
      return `处理中 (${progressPercentage.value}%)`;
    case 'completed':
      return '处理完成';
    case 'failed':
      return '处理失败';
    default:
      return '未开始';
  }
});

// 是否处于工作状态
const isWorking = computed(() => {
  return submitting.value || polling.value;
});

// 是否显示结果
const showResult = computed(() => {
  return transcriptionResult.value && taskStatus.status === 'completed';
});
</script>

<template>
  <div class="transcriber">
    <!-- 转写表单 -->
    <el-form label-position="top" class="transcription-form">
      <el-form-item label="视频URL">
        <el-input 
          v-model="videoUrl" 
          placeholder="请输入视频URL"
          clearable
          :disabled="isWorking"
        ></el-input>
      </el-form-item>
      
      <el-divider content-position="left">转写选项</el-divider>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="语言">
            <el-select 
              v-model="transcriptionOptions.language" 
              placeholder="选择语言"
              style="width: 100%"
              :disabled="isWorking"
            >
              <el-option label="中文" value="zh"></el-option>
              <el-option label="英文" value="en"></el-option>
              <el-option label="自动检测" value="auto"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        
        <el-col :span="12">
          <el-form-item label="输出格式">
            <el-select 
              v-model="transcriptionOptions.format" 
              placeholder="选择格式"
              style="width: 100%"
              :disabled="isWorking"
            >
              <el-option label="纯文本" value="text"></el-option>
              <el-option v-if="hasAdvancedOptions" label="SRT" value="srt"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item>
            <el-checkbox 
              v-model="transcriptionOptions.punctuation"
              :disabled="isWorking"
            >
              添加标点符号
            </el-checkbox>
          </el-form-item>
        </el-col>
        
        <el-col :span="8">
          <el-form-item>
            <el-checkbox 
              v-model="transcriptionOptions.timestamps"
              :disabled="isWorking"
            >
              包含时间戳
            </el-checkbox>
          </el-form-item>
        </el-col>
        
        <el-col :span="8">
          <el-form-item>
            <el-checkbox 
              v-model="transcriptionOptions.paragraphs"
              :disabled="isWorking"
            >
              自动分段
            </el-checkbox>
          </el-form-item>
        </el-col>
      </el-row>
      
      <el-form-item>
        <el-button 
          type="primary" 
          @click="handleSubmit" 
          :loading="submitting"
          :disabled="isWorking || !videoUrl"
        >
          开始转写
        </el-button>
        
        <el-button 
          @click="resetTranscription" 
          :disabled="isWorking"
        >
          重置
        </el-button>
        
        <el-button 
          type="danger" 
          @click="handleCancel" 
          v-if="polling"
        >
          取消任务
        </el-button>
      </el-form-item>
    </el-form>
    
    <!-- 任务状态 -->
    <InfoCard
      v-if="taskStatus.taskId"
      title="转写任务状态"
      :subtitle="`任务ID: ${taskStatus.taskId}`"
      icon="Timer"
      iconBgColor="#67c23a"
    >
      <template #content>
        <div class="task-status">
          <el-row :gutter="20" align="middle">
            <el-col :span="4">
              <div class="status-label">状态:</div>
            </el-col>
            <el-col :span="20">
              <el-tag :type="taskStatus.status === 'completed' ? 'success' : 
                            taskStatus.status === 'failed' ? 'danger' : 
                            'warning'">
                {{ statusText }}
              </el-tag>
            </el-col>
          </el-row>
          
          <el-row v-if="taskStatus.status === 'processing'" :gutter="20" align="middle" style="margin-top: 10px;">
            <el-col :span="4">
              <div class="status-label">进度:</div>
            </el-col>
            <el-col :span="20">
              <el-progress 
                :percentage="progressPercentage"
                :status="taskStatus.status === 'failed' ? 'exception' : 
                        taskStatus.status === 'completed' ? 'success' : ''"
              ></el-progress>
            </el-col>
          </el-row>
          
          <el-row v-if="taskStatus.error" :gutter="20" align="middle" style="margin-top: 10px;">
            <el-col :span="4">
              <div class="status-label">错误:</div>
            </el-col>
            <el-col :span="20">
              <el-alert
                :title="taskStatus.error"
                type="error"
                show-icon
              ></el-alert>
            </el-col>
          </el-row>
        </div>
      </template>
    </InfoCard>
    
    <!-- 转写结果 -->
    <InfoCard
      v-if="showResult"
      title="转写结果"
      subtitle="以下是视频的文本内容"
      icon="Document"
      iconBgColor="#409EFF"
      class="result-card"
    >
      <template #actions>
        <el-button type="primary" @click="copyResult" size="small">
          <el-icon><CopyDocument /></el-icon> 复制
        </el-button>
        <el-button type="success" @click="downloadResult" size="small">
          <el-icon><Download /></el-icon> 下载
        </el-button>
      </template>
      
      <template #content>
        <div class="transcription-result">
          <pre>{{ formattedResult }}</pre>
        </div>
      </template>
    </InfoCard>
  </div>
</template>

<style scoped>
.transcriber {
  width: 100%;
}

.transcription-form {
  margin-bottom: 20px;
}

.task-status {
  padding: 10px 0;
}

.status-label {
  font-weight: bold;
}

.result-card {
  margin-top: 20px;
}

.transcription-result {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.transcription-result pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', Courier, monospace;
  margin: 0;
  padding: 0;
}
</style> 