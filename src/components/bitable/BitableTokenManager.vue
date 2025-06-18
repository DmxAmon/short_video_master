<template>
  <div class="bitable-token-manager">
    <div class="section-header">
      <h3>飞书多维表格Token管理</h3>
    </div>
    
    <!-- 获取当前表格Token -->
    <div class="get-token-section">
      <el-alert
        title="获取当前表格Token"
        type="info"
        description="请在飞书多维表格中打开本应用，点击下方按钮获取当前表格的Token"
        :closable="false"
        show-icon
      />
      
      <div class="action-buttons">
        <el-button 
          type="primary" 
          @click="getCurrentToken" 
          :loading="gettingToken"
          :disabled="!isInBitableEnv"
        >
          获取当前表格Token
        </el-button>
      </div>
      
      <div v-if="!isInBitableEnv" class="environment-warning">
        <el-alert
          title="未检测到飞书多维表格环境"
          type="warning"
          description="请在飞书多维表格应用中打开本应用，以便获取Token"
          :closable="false"
          show-icon
        />
      </div>
    </div>
    
    <!-- 已保存的Token列表 -->
    <div class="token-list-section">
      <div class="section-title">
        <h4>已保存的多维表格Token</h4>
        <el-button 
          type="primary" 
          size="small" 
          plain 
          @click="refreshTokenList" 
          :loading="loadingTokens"
          icon="Refresh"
        >
          刷新列表
        </el-button>
      </div>
      
      <div v-if="loadingTokens" class="token-list-loading">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="tokenList.length === 0" class="no-tokens">
        <el-empty description="暂无多维表格Token" />
      </div>
      
      <div v-else class="token-list">
        <el-card v-for="token in tokenList" :key="token.app_token" class="token-item">
          <template #header>
            <div class="token-header">
              <div class="token-name">
                {{ token.app_name }}
                <el-tag v-if="token.is_default" size="small" type="success">默认</el-tag>
              </div>
              <div class="token-actions">
                <el-button 
                  v-if="!token.is_default" 
                  type="primary" 
                  size="small" 
                  @click="setAsDefault(token.app_token)"
                  :loading="settingDefault === token.app_token"
                >
                  设为默认
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="confirmDelete(token.app_token)"
                  :loading="deleting === token.app_token"
                >
                  删除
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="token-content">
            <div class="token-info">
              <p><strong>Token:</strong> {{ maskToken(token.app_token) }}</p>
              <p v-if="token.last_used_at"><strong>最后使用:</strong> {{ formatDate(token.last_used_at) }}</p>
              <p><strong>创建时间:</strong> {{ formatDate(token.created_at) }}</p>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 手动添加Token -->
    <div class="add-token-section">
      <div class="section-title">
        <h4>手动添加多维表格Token</h4>
      </div>
      
      <el-form :model="addTokenForm" ref="addTokenFormRef" :rules="addTokenRules" label-width="120px">
        <el-form-item label="Token" prop="appToken">
          <el-input v-model="addTokenForm.appToken" placeholder="输入多维表格Token，例如: bascnxxxxxxxx" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="addTokenForm.name" placeholder="为该多维表格指定一个名称" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="addTokenForm.isDefault">设为默认多维表格</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitAddToken" :loading="addingToken">保存Token</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  getCurrentBitableAppToken, 
  saveBitableAppToken, 
  getBitableAppTokens, 
  setDefaultBitableAppToken, 
  deleteBitableAppToken,
  validateBitableAppToken
} from '../../api/bitable';
import { bitable } from '@lark-base-open/js-sdk';

// 状态管理
const gettingToken = ref(false);
const loadingTokens = ref(false);
const addingToken = ref(false);
const tokenList = ref([]);
const settingDefault = ref(null);
const deleting = ref(null);

// 计算属性：是否在飞书多维表格环境中
const isInBitableEnv = computed(() => {
  return !!bitable && !!bitable.base;
});

// 添加Token表单
const addTokenFormRef = ref(null);
const addTokenForm = reactive({
  appToken: '',
  name: '',
  isDefault: false
});

// 表单验证规则
const addTokenRules = {
  appToken: [
    { required: true, message: '请输入多维表格Token', trigger: 'blur' },
    { pattern: /^bascn[a-zA-Z0-9]{8,}$/, message: 'Token格式不正确，应以bascn开头', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入多维表格名称', trigger: 'blur' },
    { max: 50, message: '名称不能超过50个字符', trigger: 'blur' }
  ]
};

// 获取当前多维表格的Token
const getCurrentToken = async () => {
  if (!isInBitableEnv.value) {
    ElMessage.warning('未检测到飞书多维表格环境，请在飞书多维表格中打开本应用');
    return;
  }
  
  try {
    gettingToken.value = true;
    const appToken = await getCurrentBitableAppToken();
    
    // 自动填充表单
    addTokenForm.appToken = appToken;
    addTokenForm.name = `多维表格 ${appToken.substring(0, 8)}...`;
    
    ElMessage.success(`成功获取当前表格Token: ${maskToken(appToken)}`);
  } catch (error) {
    console.error('获取当前表格Token失败:', error);
    ElMessage.error(`获取失败: ${error.message}`);
  } finally {
    gettingToken.value = false;
  }
};

// 提交添加Token表单
const submitAddToken = async () => {
  if (!addTokenFormRef.value) return;
  
  await addTokenFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    try {
      addingToken.value = true;
      await saveBitableAppToken(
        addTokenForm.appToken,
        addTokenForm.name,
        addTokenForm.isDefault
      );
      
      ElMessage.success('多维表格Token保存成功');
      resetForm();
      await refreshTokenList();
    } catch (error) {
      console.error('保存Token失败:', error);
      ElMessage.error(`保存失败: ${error.message}`);
    } finally {
      addingToken.value = false;
    }
  });
};

// 重置表单
const resetForm = () => {
  if (addTokenFormRef.value) {
    addTokenFormRef.value.resetFields();
  }
};

// 刷新Token列表
const refreshTokenList = async () => {
  try {
    loadingTokens.value = true;
    const data = await getBitableAppTokens();
    tokenList.value = data;
  } catch (error) {
    console.error('获取Token列表失败:', error);
    ElMessage.error(`获取列表失败: ${error.message}`);
  } finally {
    loadingTokens.value = false;
  }
};

// 设置为默认Token
const setAsDefault = async (appToken) => {
  try {
    settingDefault.value = appToken;
    await setDefaultBitableAppToken(appToken);
    ElMessage.success('已设置为默认多维表格');
    await refreshTokenList();
  } catch (error) {
    console.error('设置默认Token失败:', error);
    ElMessage.error(`设置失败: ${error.message}`);
  } finally {
    settingDefault.value = null;
  }
};

// 确认删除Token
const confirmDelete = (appToken) => {
  ElMessageBox.confirm(
    '确定要删除此多维表格Token吗？删除后将无法自动同步数据到该表格。',
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      deleteToken(appToken);
    })
    .catch(() => {
      // 取消操作
    });
};

// 删除Token
const deleteToken = async (appToken) => {
  try {
    deleting.value = appToken;
    await deleteBitableAppToken(appToken);
    ElMessage.success('多维表格Token已删除');
    await refreshTokenList();
  } catch (error) {
    console.error('删除Token失败:', error);
    ElMessage.error(`删除失败: ${error.message}`);
  } finally {
    deleting.value = null;
  }
};

// 隐藏部分Token，只显示前6位和后4位
const maskToken = (token) => {
  if (!token) return '';
  if (token.length <= 10) return token;
  return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 组件挂载时获取Token列表
onMounted(async () => {
  await refreshTokenList();
});

// 暴露方法给父组件使用
defineExpose({
  refreshTokenList,
  getCurrentToken
});
</script>

<style scoped>
.bitable-token-manager {
  padding: 15px;
}

.section-header {
  text-align: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 15px;
}

.section-title h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.get-token-section, .token-list-section, .add-token-section {
  margin-bottom: 30px;
  padding: 15px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
}

.action-buttons {
  margin: 15px 0;
  display: flex;
  justify-content: center;
}

.environment-warning {
  margin-top: 15px;
}

.token-list-loading {
  padding: 20px 0;
}

.no-tokens {
  padding: 30px 0;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.token-item {
  margin-bottom: 0;
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.token-actions {
  display: flex;
  gap: 8px;
}

.token-content {
  font-size: 14px;
}

.token-info p {
  margin: 5px 0;
}
</style> 