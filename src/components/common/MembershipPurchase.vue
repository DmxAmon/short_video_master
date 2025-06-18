<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 会员购买组件，用于处理会员购买和续费流程
-->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, ArrowRight, ShoppingCart } from '@element-plus/icons-vue';

const props = defineProps({
  currentLevel: {
    type: String,
    default: '免费用户'
  },
  memberPlans: {
    type: Array,
    required: true,
    default: () => []
  },
  userPoints: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['purchase-success', 'purchase-cancel']);

// 支付方式 - 只保留支付宝
const paymentMethods = ref([
  { id: 'alipay', name: '支付宝', icon: 'alipay' },
  { id: 'points', name: '积分兑换', icon: 'coins' }
]);

// 当前选择的套餐
const selectedPlan = ref(null);
// 当前选择的支付方式
const selectedPayment = ref('alipay');
// 支付状态
const paymentStatus = ref('pending'); // pending, processing, success, failed
// 显示确认对话框
const showConfirmDialog = ref(false);
// 加载状态
const loading = ref(false);
// 倒计时
const countdown = ref(0);
// 倒计时定时器
let countdownTimer = null;

// 计算选择的套餐是否为升级
const isUpgrade = computed(() => {
  if (!selectedPlan.value) return false;
  
  const currentPlanIndex = props.memberPlans.findIndex(plan => plan.name === props.currentLevel);
  const selectedPlanIndex = props.memberPlans.findIndex(plan => plan.id === selectedPlan.value.id);
  
  return selectedPlanIndex > currentPlanIndex;
});

// 计算是否可以使用积分兑换
const canUsePoints = computed(() => {
  if (!selectedPlan.value || !selectedPlan.value.pointsPrice) return false;
  return props.userPoints >= selectedPlan.value.pointsPrice;
});

// 选择套餐
const selectPlan = (plan) => {
  selectedPlan.value = plan;
  
  // 如果不能用积分支付，默认选择支付宝
  if (!canUsePoints.value && selectedPayment.value === 'points') {
    selectedPayment.value = 'alipay';
  }
};

// 选择支付方式
const selectPayment = (methodId) => {
  selectedPayment.value = methodId;
};

// 显示确认购买对话框
const showPurchaseConfirm = () => {
  if (!selectedPlan.value) {
    ElMessage.warning('请先选择会员套餐');
    return;
  }
  
  showConfirmDialog.value = true;
};

// 开始支付流程
const startPayment = async () => {
  showConfirmDialog.value = false;
  
  if (selectedPayment.value === 'points' && !canUsePoints.value) {
    ElMessage.error('积分不足，请选择其他支付方式');
    return;
  }
  
  loading.value = true;
  paymentStatus.value = 'processing';
  
  try {
    // 调用真实API创建会员订单
    const response = await createMembershipOrder({
      levelCode: level.code,
      paymentMethod: 'default'
    });
    
    if (response && response.code === 0) {
      ElMessage.success(`成功购买${level.name}会员！`);
      emit('purchase-success', level);
    } else {
      throw new Error(response?.message || '购买失败');
    }
  } catch (error) {
    console.error('购买会员失败:', error);
    ElMessage.error('购买失败: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 取消支付
const cancelPayment = () => {
  paymentStatus.value = 'pending';
  emit('purchase-cancel');
};

// 重试支付
const retryPayment = () => {
  paymentStatus.value = 'pending';
};

// 开始倒计时（支付成功后自动跳转）
const startCountdown = () => {
  countdown.value = 5;
  
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      // 这里可以添加跳转逻辑
    }
  }, 1000);
};

// 组件卸载时清除定时器
onMounted(() => {
  return () => {
    clearInterval(countdownTimer);
  };
});
</script>

<template>
  <div class="membership-purchase">
    <!-- 支付状态为处理中或成功时显示支付状态页 -->
    <div v-if="paymentStatus === 'processing' || paymentStatus === 'success'" class="payment-status">
      <div v-if="paymentStatus === 'processing'" class="processing-payment">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <h3>正在处理您的支付</h3>
        <p>请稍候，我们正在确认您的支付状态...</p>
        <el-button type="text" @click="cancelPayment">取消支付</el-button>
      </div>
      
      <div v-else-if="paymentStatus === 'success'" class="payment-success">
        <div class="success-icon">
          <el-icon><Check /></el-icon>
        </div>
        <h3>支付成功！</h3>
        <p>感谢您的购买，您的会员权益已生效</p>
        <p class="countdown">{{ countdown }}秒后自动跳转到会员中心</p>
      </div>
    </div>
    
    <!-- 支付失败时显示失败页面 -->
    <div v-else-if="paymentStatus === 'failed'" class="payment-failed">
      <div class="failed-icon">
        <el-icon><Close /></el-icon>
      </div>
      <h3>下单失败</h3>
      <p>下单失败，请重新发起支付</p>
      <div class="action-buttons">
        <el-button type="primary" @click="retryPayment">重新下单</el-button>
        <el-button @click="cancelPayment">取消</el-button>
      </div>
    </div>
    
    <!-- 初始状态显示套餐选择和支付方式 -->
    <div v-else class="purchase-form">
      <h3 class="section-title">选择会员套餐</h3>
      
      <div class="plans-grid">
        <div 
          v-for="plan in memberPlans" 
          :key="plan.id"
          class="plan-card"
          :class="{ 
            'selected': selectedPlan && selectedPlan.id === plan.id,
            'disabled': plan.name === currentLevel
          }"
          @click="plan.name !== currentLevel && selectPlan(plan)"
        >
          <div class="plan-header" :style="{ backgroundColor: plan.color }">
            {{ plan.name }}
            <span v-if="plan.name === currentLevel" class="current-tag">当前等级</span>
            <span v-if="plan.popular" class="popular-tag">热门</span>
          </div>
          <div class="plan-content">
            <div class="plan-price">
              <span class="currency">¥</span>
              <span class="amount">{{ plan.price }}</span>
              <span class="duration">/{{ plan.duration }}个月</span>
            </div>
            
            <div v-if="plan.discount" class="plan-discount">
              <span class="original-price">原价: ¥{{ plan.originalPrice }}</span>
              <span class="discount-tag">{{ plan.discount }}折</span>
            </div>
            
            <div class="plan-features">
              <div v-for="(feature, idx) in plan.features.slice(0, 3)" :key="idx" class="feature-item">
                <el-icon><Check /></el-icon>
                <span>{{ feature }}</span>
              </div>
              <div v-if="plan.features.length > 3" class="more-features">
                +{{ plan.features.length - 3 }}项特权
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template v-if="selectedPlan">
        <h3 class="section-title">选择支付方式</h3>
        
        <div class="payment-methods">
          <div 
            v-for="method in paymentMethods" 
            :key="method.id"
            class="payment-method"
            :class="{ 
              'selected': selectedPayment === method.id,
              'disabled': method.id === 'points' && !canUsePoints
            }"
            @click="!method.id === 'points' || canUsePoints ? selectPayment(method.id) : null"
          >
            <div class="method-icon">
              <i :class="'icon-' + method.icon"></i>
            </div>
            <div class="method-info">
              <div class="method-name">{{ method.name }}</div>
              <div v-if="method.id === 'points'" class="method-description">
                {{ canUsePoints 
                  ? `需要 ${selectedPlan.pointsPrice} 积分 (当前: ${props.userPoints})` 
                  : `积分不足 (需要: ${selectedPlan.pointsPrice}, 当前: ${props.userPoints})` 
                }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="purchase-summary">
          <div class="summary-item">
            <span class="item-label">套餐</span>
            <span class="item-value">{{ selectedPlan.name }}</span>
          </div>
          <div class="summary-item">
            <span class="item-label">时长</span>
            <span class="item-value">{{ selectedPlan.duration }}个月</span>
          </div>
          <div class="summary-item">
            <span class="item-label">支付方式</span>
            <span class="item-value">{{ paymentMethods.find(m => m.id === selectedPayment)?.name }}</span>
          </div>
          <div class="summary-item total">
            <span class="item-label">合计</span>
            <span class="item-value">
              <template v-if="selectedPayment === 'points'">
                {{ selectedPlan.pointsPrice }} 积分
              </template>
              <template v-else>
                ¥{{ selectedPlan.price }}
              </template>
            </span>
          </div>
        </div>
        
        <div class="action-buttons">
          <el-button type="primary" @click="showPurchaseConfirm" :icon="ShoppingCart">
            {{ isUpgrade ? '升级会员' : '购买会员' }}
          </el-button>
        </div>
      </template>
    </div>
    
    <!-- 购买确认对话框 -->
    <el-dialog
      v-model="showConfirmDialog"
      title="确认购买"
      width="400px"
      center
    >
      <div class="confirm-content">
        <p>您即将{{ isUpgrade ? '升级' : '购买' }}:</p>
        <div class="confirm-details">
          <div class="confirm-item">
            <span class="confirm-label">套餐:</span>
            <span class="confirm-value">{{ selectedPlan?.name }}</span>
          </div>
          <div class="confirm-item">
            <span class="confirm-label">时长:</span>
            <span class="confirm-value">{{ selectedPlan?.duration }}个月</span>
          </div>
          <div class="confirm-item">
            <span class="confirm-label">支付方式:</span>
            <span class="confirm-value">{{ paymentMethods.find(m => m.id === selectedPayment)?.name }}</span>
          </div>
          <div class="confirm-item">
            <span class="confirm-label">应付金额:</span>
            <span class="confirm-value amount">
              <template v-if="selectedPayment === 'points'">
                {{ selectedPlan?.pointsPrice }} 积分
              </template>
              <template v-else>
                ¥{{ selectedPlan?.price }}
              </template>
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showConfirmDialog = false">取消</el-button>
          <el-button type="primary" @click="startPayment">确认支付</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.membership-purchase {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 20px 0;
  color: #303133;
}

/* 套餐选择区域 */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.plan-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  transition: all 0.3s;
  cursor: pointer;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.plan-card.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.plan-card.disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.plan-header {
  padding: 12px;
  color: white;
  font-weight: 500;
  text-align: center;
  position: relative;
}

.current-tag, .popular-tag {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 12px;
  padding: 2px 6px;
  border-bottom-left-radius: 8px;
}

.current-tag {
  background-color: rgba(0, 0, 0, 0.2);
}

.popular-tag {
  background-color: #e6a23c;
}

.plan-content {
  padding: 16px;
}

.plan-price {
  text-align: center;
  margin-bottom: 10px;
}

.currency {
  font-size: 16px;
  vertical-align: top;
}

.amount {
  font-size: 28px;
  font-weight: bold;
}

.duration {
  font-size: 14px;
  color: #909399;
}

.plan-discount {
  text-align: center;
  margin-bottom: 15px;
}

.original-price {
  font-size: 12px;
  color: #909399;
  text-decoration: line-through;
  margin-right: 5px;
}

.discount-tag {
  background-color: #f56c6c;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.plan-features {
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.feature-item i {
  color: #67c23a;
  margin-right: 8px;
}

.more-features {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-top: 8px;
}

/* 支付方式 */
.payment-methods {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.payment-method {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.payment-method:hover {
  border-color: #c6e2ff;
}

.payment-method.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.payment-method.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.method-icon {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.method-info {
  flex: 1;
}

.method-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.method-description {
  font-size: 12px;
  color: #909399;
}

/* 购买摘要 */
.purchase-summary {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item.total {
  font-weight: 500;
  color: #f56c6c;
  padding-top: 15px;
  margin-top: 10px;
  border-top: 1px solid #dcdfe6;
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

/* 支付状态页 */
.payment-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-icon {
  font-size: 40px;
  color: #409eff;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.success-icon, .failed-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  font-size: 40px;
}

.success-icon {
  background-color: #f0f9eb;
  color: #67c23a;
}

.failed-icon {
  background-color: #fef0f0;
  color: #f56c6c;
}

.countdown {
  font-size: 14px;
  color: #909399;
  margin-top: 15px;
}

/* 确认对话框 */
.confirm-content {
  padding: 0 20px;
}

.confirm-details {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
}

.confirm-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.confirm-value.amount {
  font-weight: bold;
  color: #f56c6c;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .plans-grid, .payment-methods {
    grid-template-columns: 1fr;
  }
}
</style> 