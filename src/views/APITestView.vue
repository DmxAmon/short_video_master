<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2025-01-02
 * @desc       : API测试页面 - 用于测试会员升级相关的API调用
-->
<template>
  <div class="api-test-container">
    <h1>会员升级API测试</h1>
    
    <div class="test-section">
      <h2>1. 获取会员套餐列表</h2>
      <el-button @click="testGetPackages" type="primary">
        测试获取套餐列表
      </el-button>
      <div v-if="packagesResult" class="result">
        <h4>结果:</h4>
        <pre>{{ JSON.stringify(packagesResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>2. 创建会员升级订单</h2>
      <div class="form-group">
        <label>等级ID:</label>
        <el-input v-model="levelId" placeholder="输入等级ID" style="width: 200px;" />
      </div>
      <div class="form-group">
        <label>支付方式:</label>
        <el-select v-model="paymentMethod" placeholder="选择支付方式" style="width: 200px;">
          <el-option label="支付宝" value="alipay" />
        </el-select>
      </div>
      <el-button @click="testCreateOrder" type="primary" :loading="creating">
        测试创建订单
      </el-button>
      <div v-if="orderResult" class="result">
        <h4>结果:</h4>
        <pre>{{ JSON.stringify(orderResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>3. 查询订单状态</h2>
      <div class="form-group">
        <label>订单ID:</label>
        <el-input v-model="orderId" placeholder="输入订单ID" style="width: 300px;" />
      </div>
      <el-button @click="testGetOrderStatus" type="primary">
        测试查询订单状态
      </el-button>
      <div v-if="statusResult" class="result">
        <h4>结果:</h4>
        <pre>{{ JSON.stringify(statusResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>4. 获取当前会员信息</h2>
      <el-button @click="testGetCurrentMembership" type="primary">
        测试获取当前会员信息
      </el-button>
      <div v-if="membershipResult" class="result">
        <h4>结果:</h4>
        <pre>{{ JSON.stringify(membershipResult, null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>测试日志</h2>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-level" :class="log.level">{{ log.level }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <el-button @click="clearLogs" size="small">清空日志</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  getMembershipPackages, 
  createMembershipUpgradeOrder, 
  getOrderStatus, 
  getCurrentMembership 
} from '../api/membership';
// 导入智能认证工具
import { useSmartAuth } from '../utils/smart-auth';

// 使用智能认证
const { isTokenExpiredError, handleTokenExpiredSmart, createSmartApiCall } = useSmartAuth('API测试页面');

// 响应式数据
const packagesResult = ref(null);
const orderResult = ref(null);
const statusResult = ref(null);
const membershipResult = ref(null);

const levelId = ref('2');
const paymentMethod = ref('alipay');
const orderId = ref('');
const creating = ref(false);

const logs = ref([]);

// 添加日志
const addLog = (level, message) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    level,
    message
  });
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50);
  }
};

// 清空日志
const clearLogs = () => {
  logs.value = [];
};

// 测试获取套餐列表
const testGetPackages = async () => {
  try {
    addLog('INFO', '开始测试获取会员套餐列表...');
    const smartApiCall = createSmartApiCall(getMembershipPackages, {
      onSuccess: async () => {
        addLog('INFO', '智能认证成功，重新获取套餐列表');
      }
    });
    const result = await smartApiCall();
    packagesResult.value = result;
    addLog('SUCCESS', '获取套餐列表成功');
    ElMessage.success('获取套餐列表成功');
  } catch (error) {
    addLog('ERROR', `获取套餐列表失败: ${error.message}`);
    ElMessage.error(`获取套餐列表失败: ${error.message}`);
  }
};

// 测试创建订单
const testCreateOrder = async () => {
  if (!levelId.value) {
    ElMessage.error('请输入等级ID');
    return;
  }
  
  creating.value = true;
  try {
    addLog('INFO', `开始测试创建升级订单: level_id=${levelId.value}, payment_method=${paymentMethod.value}`);
    
    const result = await createMembershipUpgradeOrder({
      level_id: parseInt(levelId.value),
      payment_method: paymentMethod.value
    });
    
    orderResult.value = result;
    
    // 如果创建成功，自动设置订单ID用于后续测试
    if (result.code === 0 && result.data && result.data.order_id) {
      orderId.value = result.data.order_id;
    }
    
    addLog('SUCCESS', '创建升级订单成功');
    ElMessage.success('创建升级订单成功');
  } catch (error) {
    addLog('ERROR', `创建升级订单失败: ${error.message}`);
    ElMessage.error(`创建升级订单失败: ${error.message}`);
  } finally {
    creating.value = false;
  }
};

// 测试查询订单状态
const testGetOrderStatus = async () => {
  if (!orderId.value) {
    ElMessage.error('请输入订单ID');
    return;
  }
  
  try {
    addLog('INFO', `开始测试查询订单状态: order_id=${orderId.value}`);
    const result = await getOrderStatus(orderId.value);
    statusResult.value = result;
    addLog('SUCCESS', '查询订单状态成功');
    ElMessage.success('查询订单状态成功');
  } catch (error) {
    addLog('ERROR', `查询订单状态失败: ${error.message}`);
    ElMessage.error(`查询订单状态失败: ${error.message}`);
  }
};

// 测试获取当前会员信息
const testGetCurrentMembership = async () => {
  try {
    addLog('INFO', '开始测试获取当前会员信息...');
    const result = await getCurrentMembership();
    membershipResult.value = result;
    addLog('SUCCESS', '获取当前会员信息成功');
    ElMessage.success('获取当前会员信息成功');
  } catch (error) {
    addLog('ERROR', `获取当前会员信息失败: ${error.message}`);
    ElMessage.error(`获取当前会员信息失败: ${error.message}`);
  }
};

// 初始化时添加说明日志
addLog('INFO', '会员升级API测试页面已加载');
addLog('INFO', '请按顺序进行测试：1.获取套餐列表 -> 2.创建升级订单 -> 3.查询订单状态');
</script>

<style scoped>
.api-test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #303133;
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group label {
  min-width: 80px;
  font-weight: bold;
}

.result {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.result h4 {
  margin: 0 0 10px 0;
  color: #409eff;
}

.result pre {
  background-color: #fff;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
  font-size: 12px;
  line-height: 1.4;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  background-color: #2d2d2d;
  color: #fff;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.log-item {
  display: flex;
  gap: 10px;
  margin-bottom: 2px;
}

.log-time {
  color: #999;
  min-width: 80px;
}

.log-level {
  min-width: 60px;
  font-weight: bold;
}

.log-level.INFO {
  color: #409eff;
}

.log-level.SUCCESS {
  color: #67c23a;
}

.log-level.ERROR {
  color: #f56c6c;
}

.log-message {
  flex: 1;
}
</style> 