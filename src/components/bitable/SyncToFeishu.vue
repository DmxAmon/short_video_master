<template>
  <div class="sync-to-feishu">
    <el-popover
      v-model:visible="popoverVisible"
      placement="top"
      width="300"
      trigger="click"
    >
      <template #reference>
        <el-button 
          type="primary" 
          :icon="icon"
          :disabled="disabled || !hasData"
          :loading="syncing"
          @click="checkBeforeSync"
        >
          {{ buttonText }}
        </el-button>
      </template>
      
      <div class="popover-content">
        <feishu-bitable-config ref="configRef" />
        
        <div class="sync-actions">
          <el-button type="primary" @click="syncToFeishu" :loading="syncing">确认同步</el-button>
          <el-button @click="popoverVisible = false">取消</el-button>
        </div>
      </div>
    </el-popover>
    
    <!-- 同步结果对话框 -->
    <el-dialog
      v-model="showResultDialog"
      title="同步结果"
      width="400px"
      center
    >
      <div class="sync-result">
        <el-result
          :icon="syncSuccess ? 'success' : 'error'"
          :title="syncSuccess ? '同步成功' : '同步失败'"
          :sub-title="resultMessage"
        >
          <template #extra>
            <el-button type="primary" @click="showResultDialog = false">关闭</el-button>
            <el-button v-if="!syncSuccess" @click="goToConfig">前往配置</el-button>
          </template>
        </el-result>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useBitableSync } from '../../composables/useBitableSync';
import FeishuBitableConfig from './FeishuBitableConfig.vue';

// 路由实例
const router = useRouter();

// 定义Props
const props = defineProps({
  // 要同步的数据
  data: {
    type: Array,
    required: true
  },
  // 按钮文本
  buttonText: {
    type: String,
    default: '同步到飞书'
  },
  // 按钮图标
  icon: {
    type: Object,
    default: null
  },
  // 是否禁用按钮
  disabled: {
    type: Boolean,
    default: false
  }
});

// 定义组件状态
const popoverVisible = ref(false);
const syncing = ref(false);
const showResultDialog = ref(false);
const syncSuccess = ref(false);
const resultMessage = ref('');

// 配置组件引用
const configRef = ref(null);

// 从useBitableSync组合函数中获取所需方法
const { 
  loadDefaultBitableToken, 
  syncDataWithDefaultToken,
  hasDefaultBitableToken
} = useBitableSync();

// 计算属性：是否有数据可同步
const hasData = computed(() => {
  return props.data && props.data.length > 0;
});

// 同步前检查
const checkBeforeSync = async () => {
  if (!hasData.value) {
    ElMessage.warning('没有数据可同步');
    return;
  }
  
  // 刷新配置状态
  if (configRef.value) {
    await configRef.value.checkAuthStatus();
  }
  
  // 加载默认多维表格Token
  await loadDefaultBitableToken();
};

// 同步到飞书
const syncToFeishu = async () => {
  if (!hasData.value) {
    ElMessage.warning('没有数据可同步');
    return;
  }
  
  try {
    syncing.value = true;
    
    // 获取当前授权和配置状态
    const isAuthorized = configRef.value ? configRef.value.isAuthorized : false;
    const hasToken = hasDefaultBitableToken.value;
    
    // 检查授权和配置状态
    if (!isAuthorized) {
      syncSuccess.value = false;
      resultMessage.value = '您尚未授权飞书多维表格，请先前往授权';
      showResultDialog.value = true;
      return;
    }
    
    if (!hasToken) {
      syncSuccess.value = false;
      resultMessage.value = '您尚未设置默认多维表格，请先前往设置';
      showResultDialog.value = true;
      return;
    }
    
    // 执行同步
    const result = await syncDataWithDefaultToken(props.data);
    
    // 处理同步结果
    if (result && result.success) {
      syncSuccess.value = true;
      resultMessage.value = `同步成功，共同步 ${result.success_count || props.data.length} 条数据`;
    } else {
      syncSuccess.value = false;
      resultMessage.value = result ? result.message : '同步失败，请稍后重试';
    }
    
    // 显示结果对话框
    showResultDialog.value = true;
    // 关闭配置弹窗
    popoverVisible.value = false;
  } catch (error) {
    console.error('同步到飞书失败:', error);
    syncSuccess.value = false;
    resultMessage.value = error.message || '同步失败，请稍后重试';
    showResultDialog.value = true;
  } finally {
    syncing.value = false;
  }
};

// 前往配置页面
const goToConfig = () => {
  router.push('/bitable');
};

// 组件挂载时加载默认多维表格Token
onMounted(async () => {
  await loadDefaultBitableToken();
});
</script>

<style scoped>
.sync-to-feishu {
  display: inline-block;
}

.popover-content {
  padding: 5px;
}

.sync-actions {
  display: flex;
  justify-content: center;
  margin-top: 15px;
  gap: 10px;
}

.sync-result {
  text-align: center;
}
</style> 