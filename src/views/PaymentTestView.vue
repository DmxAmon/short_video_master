<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-01-20
 * @desc       : 支付功能测试页面
-->
<template>
  <div class="payment-test-container">
    <div class="test-header">
      <h2>支付功能测试</h2>
      <p>这是支付功能的测试页面，您可以在这里测试积分充值支付流程。</p>
    </div>

    <!-- 测试套餐卡片 -->
    <div class="test-packages">
      <h3>测试积分套餐</h3>
      <div class="packages-grid">
        <div 
          v-for="pkg in testPackages" 
          :key="pkg.id"
          class="package-card"
          :class="{ selected: selectedTestPackage?.id === pkg.id }"
          @click="selectTestPackage(pkg)"
        >
          <div class="package-points">{{ pkg.points }}</div>
          <div class="package-label">积分</div>
          <div class="package-name">{{ pkg.name }}</div>
          <div class="package-price">
            <span class="current-price">¥{{ pkg.price }}</span>
            <span v-if="pkg.member_price" class="member-price">会员价: ¥{{ pkg.member_price }}</span>
          </div>
          <div v-if="pkg.popular" class="popular-badge">热门</div>
        </div>
      </div>
    </div>

    <!-- 用户模拟设置 -->
    <div class="user-simulation">
      <h3>用户状态模拟</h3>
      <el-form :model="userSimulation" label-width="120px">
        <el-form-item label="会员状态">
          <el-radio-group v-model="userSimulation.isMember">
            <el-radio :label="false">普通用户</el-radio>
            <el-radio :label="true">会员用户</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="当前积分">
          <el-input-number v-model="userSimulation.points" :min="0" :max="999999" />
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮 -->
    <div class="test-actions">
      <el-button type="primary" @click="startPayment" :disabled="!selectedTestPackage">
        开始支付测试
      </el-button>
      <el-button @click="resetTest">重置测试</el-button>
    </div>

    <!-- 测试日志 -->
    <div class="test-logs">
      <h3>测试日志</h3>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <el-button type="text" @click="clearLogs">清空日志</el-button>
    </div>

    <!-- 支付模态框 -->
    <PaymentModal
      v-model="showPaymentModal"
      :package="selectedTestPackage"
      :is-member="userSimulation.isMember"
      @payment-success="handlePaymentSuccess"
      @payment-cancel="handlePaymentCancel"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import PaymentModal from '../components/payment/PaymentModal.vue';

// 测试套餐数据 - 使用真实生产环境价格
const testPackages = ref([
  {
    id: 1,
    name: '基础套餐',
    points: 1000,
    price: 10.00,
    member_price: 6.90,
    popular: false,
    description: '基础积分套餐'
  },
  {
    id: 2,
    name: '热门套餐',
    points: 5000,
    price: 50.00,
    member_price: 34.50,
    popular: true,
    description: '最受欢迎的套餐'
  },
  {
    id: 3,
    name: '超值套餐',
    points: 10000,
    price: 100.00,
    member_price: 69.00,
    popular: false,
    description: '大额充值优惠更多'
  }
]);

// 选中的测试套餐
const selectedTestPackage = ref(null);

// 用户状态模拟
const userSimulation = reactive({
  isMember: false,
  points: 1000
});

// 支付模态框显示状态
const showPaymentModal = ref(false);

// 测试日志
const logs = ref([]);

// 添加日志
const addLog = (message, type = 'info') => {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  logs.value.unshift({
    time,
    message,
    type
  });
  
  // 保持最多100条日志
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100);
  }
};

// 选择测试套餐
const selectTestPackage = (pkg) => {
  selectedTestPackage.value = pkg;
  addLog(`选择套餐: ${pkg.name} (${pkg.points}积分, ¥${pkg.price})`);
};

// 开始支付测试
const startPayment = () => {
  if (!selectedTestPackage.value) {
    ElMessage.warning('请先选择要测试的套餐');
    return;
  }
  
  addLog(`开始支付测试 - 套餐: ${selectedTestPackage.value.name}, 用户类型: ${userSimulation.isMember ? '会员' : '普通用户'}`, 'info');
  
  showPaymentModal.value = true;
};

// 支付成功处理
const handlePaymentSuccess = (result) => {
  addLog(`支付成功! 订单号: ${result.orderNo}, 充值积分: ${result.package.points}`, 'success');
  
  // 模拟积分增加
  userSimulation.points += result.package.points;
  
  ElMessage.success('支付测试成功！');
  
  // 重置选中套餐
  selectedTestPackage.value = null;
};

// 支付取消处理
const handlePaymentCancel = () => {
  addLog('用户取消支付', 'warning');
};

// 重置测试
const resetTest = () => {
  selectedTestPackage.value = null;
  userSimulation.isMember = false;
  userSimulation.points = 1000;
  addLog('重置测试状态', 'info');
};

// 清空日志
const clearLogs = () => {
  logs.value = [];
};

// 初始化日志
addLog('支付功能测试页面已加载', 'info');
</script>

<style scoped>
.payment-test-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;
}

.test-header h2 {
  color: #303133;
  margin-bottom: 10px;
}

.test-header p {
  color: #606266;
  font-size: 14px;
}

/* 测试套餐 */
.test-packages {
  margin-bottom: 30px;
}

.test-packages h3 {
  margin-bottom: 15px;
  color: #303133;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.package-card {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.package-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.package-card.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.package-points {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.package-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.package-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #303133;
}

.package-price {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.current-price {
  font-size: 18px;
  font-weight: bold;
  color: #e6a23c;
}

.member-price {
  font-size: 14px;
  color: #67c23a;
}

.popular-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #e6a23c;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

/* 用户模拟设置 */
.user-simulation {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.user-simulation h3 {
  margin-bottom: 15px;
  color: #303133;
}

/* 操作按钮 */
.test-actions {
  text-align: center;
  margin-bottom: 30px;
}

.test-actions .el-button {
  margin: 0 10px;
}

/* 测试日志 */
.test-logs {
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 20px;
}

.test-logs h3 {
  margin-bottom: 15px;
  color: #303133;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  background-color: #fafafa;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-item {
  margin-bottom: 8px;
  display: flex;
  gap: 10px;
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
}

.log-item.info .log-message {
  color: #303133;
}

.log-item.success .log-message {
  color: #67c23a;
}

.log-item.warning .log-message {
  color: #e6a23c;
}

.log-item.error .log-message {
  color: #f56c6c;
}

/* 响应式 */
@media (max-width: 768px) {
  .payment-test-container {
    padding: 15px;
  }
  
  .packages-grid {
    grid-template-columns: 1fr;
  }
  
  .test-actions .el-button {
    display: block;
    width: 100%;
    margin: 10px 0;
  }
}
</style> 