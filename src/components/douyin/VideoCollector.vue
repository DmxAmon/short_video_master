<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 抖音视频数据采集组件
-->
<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { collectVideoDetail } from '../../api/douyin';
import { ElMessage } from 'element-plus';
import InfoCard from '../common/InfoCard.vue';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  }
});

// 定义事件
const emit = defineEmits(['collection-success']);

// 视频URL
const videoUrl = ref('');

// 采集状态
const collecting = ref(false);

// 采集结果
const videoData = ref(null);

// 错误信息
const error = ref('');

// 处理采集按钮点击
const handleCollect = async () => {
  if (!videoUrl.value) {
    ElMessage.warning('请输入抖音视频URL');
    return;
  }
  
  collecting.value = true;
  error.value = '';
  videoData.value = null;
  
  try {
    const result = await collectVideoDetail(videoUrl.value);
    videoData.value = result;
    ElMessage.success('视频数据采集成功');
    emit('collection-success', result);
  } catch (err) {
    error.value = err.message || '采集失败，请稍后重试';
    ElMessage.error(error.value);
  } finally {
    collecting.value = false;
  }
};

// 重置采集表单
const handleReset = () => {
  videoUrl.value = '';
  videoData.value = null;
  error.value = '';
};

// 视频统计信息
const videoStats = computed(() => {
  if (!videoData.value) return [];
  
  return [
    { 
      label: '播放量', 
      value: videoData.value.views,
      icon: 'VideoPlay'
    },
    { 
      label: '点赞数', 
      value: videoData.value.likes,
      icon: 'Star'
    },
    { 
      label: '评论数', 
      value: videoData.value.comments,
      icon: 'ChatDotRound'
    },
    { 
      label: '分享数', 
      value: videoData.value.shares,
      icon: 'Share'
    }
  ];
});

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString();
};
</script>

<template>
  <div class="video-collector">
    <!-- 采集表单 -->
    <el-form label-position="top">
      <el-form-item label="视频URL">
        <el-input 
          v-model="videoUrl" 
          placeholder="请输入抖音视频URL"
          clearable
          :disabled="collecting"
        ></el-input>
      </el-form-item>
      
      <el-form-item>
        <el-button 
          type="primary" 
          @click="handleCollect" 
          :loading="collecting"
          :disabled="!videoUrl"
        >
          采集视频数据
        </el-button>
        
        <el-button @click="handleReset" :disabled="collecting">
          重置
        </el-button>
      </el-form-item>
    </el-form>
    
    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      style="margin: 15px 0;"
    ></el-alert>
    
    <!-- 采集结果 -->
    <div v-if="videoData" class="result-container">
      <h3>视频详情</h3>
      
      <!-- 视频基本信息 -->
      <InfoCard
        :title="videoData.title"
        :subtitle="'作者: ' + (videoData.author_name || '未知')"
        icon="VideoCameraFilled"
        :content="videoData.description"
        :extra="formatDate(videoData.publish_time)"
      />
      
      <!-- 视频统计数据 -->
      <div class="stats-container">
        <el-row :gutter="20">
          <el-col 
            v-for="(stat, index) in videoStats" 
            :key="index"
            :span="6"
          >
            <div class="stat-card">
              <el-icon :size="24" color="#409EFF">
                <component :is="stat.icon" />
              </el-icon>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
      
      <!-- 视频其他信息 -->
      <el-descriptions
        v-if="videoData"
        title="其他信息"
        :column="2"
        border
      >
        <el-descriptions-item label="视频ID">
          {{ videoData.video_id || '未知' }}
        </el-descriptions-item>
        <el-descriptions-item label="视频时长">
          {{ videoData.duration ? `${videoData.duration}秒` : '未知' }}
        </el-descriptions-item>
        <el-descriptions-item label="发布时间">
          {{ formatDate(videoData.publish_time) || '未知' }}
        </el-descriptions-item>
        <el-descriptions-item label="音乐名称">
          {{ videoData.music_name || '未知' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- 视频封面 -->
      <div v-if="videoData.cover_url" class="cover-container">
        <h4>视频封面</h4>
        <el-image 
          :src="videoData.cover_url" 
          fit="contain"
          :preview-src-list="[videoData.cover_url]"
          class="cover-image"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-collector {
  width: 100%;
}

.result-container {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 20px;
  background-color: #fff;
}

.result-container h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
}

.stats-container {
  margin: 20px 0;
}

.stat-card {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.cover-container {
  margin-top: 20px;
}

.cover-container h4 {
  margin-bottom: 10px;
}

.cover-image {
  max-height: 300px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}
</style> 