<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 积分中心组件，用于展示用户积分余额、充值和消费记录
-->
<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  pointsBalance: {
    type: Number,
    default: 0
  }
});

// 加载状态
const loading = ref(false);

// 积分记录列表
const pointsRecords = ref([]);

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// 充值选项 - 生产环境真实价格
const rechargeOptions = [
  { value: 1000, price: 10, label: '1000积分' },
  { value: 2000, price: 20, label: '2000积分' },
  { value: 5000, price: 50, label: '5000积分', recommend: true },
  { value: 10000, price: 100, label: '10000积分' }
];

// 选择的充值选项
const selectedRechargeOption = ref(rechargeOptions[2]); // 默认选择5000积分(推荐)

// 自定义充值数量
const customRechargeAmount = ref(null);

// 是否显示自定义充值输入框
const showCustomRecharge = ref(false);

// 用户会员等级
const userLevel = computed(() => props.user.memberLevel || 'free');

// 积分充值折扣
const rechargeDiscount = computed(() => {
  const discounts = {
    'free': 0,
    'basic': 0.05,
    'pro': 0.1,
    'enterprise': 0.15
  };
  return discounts[userLevel.value] || 0;
});

// 显示的充值折扣文本
const rechargeDiscountText = computed(() => {
  if (rechargeDiscount.value <= 0) return '';
  return `会员专享${rechargeDiscount.value * 100}%充值折扣`;
});

// 计算最终充值价格
const getFinalPrice = (price) => {
  if (rechargeDiscount.value <= 0) return price;
  return Math.round(price * (1 - rechargeDiscount.value) * 100) / 100;
};

// 处理充值方式选择
const handleRechargeOptionSelect = (option) => {
  if (option === 'custom') {
    showCustomRecharge.value = true;
    selectedRechargeOption.value = null;
  } else {
    showCustomRecharge.value = false;
    selectedRechargeOption.value = option;
  }
};

// 处理积分充值
const handleRecharge = async () => {
  const amount = selectedRechargeOption.value?.value || customRechargeAmount.value;
  const price = selectedRechargeOption.value?.price || Math.round(customRechargeAmount.value * 0.1 * 100) / 100;
  
  if (!amount || amount <= 0) {
    ElMessage.warning('请选择或输入有效的充值数量');
    return;
  }
  
  try {
    const confirmed = await ElMessageBox.confirm(
      `确定充值${amount}积分吗？需支付¥${getFinalPrice(price)}元。`,
      '积分充值',
      {
        confirmButtonText: '确认充值',
        cancelButtonText: '取消',
        type: 'info'
      }
    );
    
    if (confirmed) {
      loading.value = true;
      try {
        // 调用真实API进行积分充值
        const response = await createPointsPurchaseOrder({
          amount: amount,
          paymentMethod: 'default'
        });
        if (response && response.code === 0) {
          ElMessage.success(`充值${amount}积分成功！`);
          loadPointsRecords();
        } else {
          throw new Error(response?.message || '充值失败');
        }
      } catch (error) {
        console.error('积分充值失败:', error);
        ElMessage.error('积分充值失败: ' + (error.message || '未知错误'));
      } finally {
        loading.value = false;
      }
    }
  } catch (error) {
    console.log('用户取消充值');
  }
};

// 加载积分记录
const loadPointsRecords = async () => {
  loading.value = true;
  
  try {
    // 调用真实API获取积分记录
    const response = await getPointsTransactions({
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (response && response.code === 0) {
      pointsRecords.value = response.data.records || [];
      pagination.total = response.data.total || 0;
    } else {
      throw new Error(response?.message || '获取积分记录失败');
    }
  } catch (error) {
    console.error('加载积分记录失败:', error);
    ElMessage.error('加载积分记录失败');
  } finally {
    loading.value = false;
  }
};

// 处理页面变化
const handlePageChange = (page) => {
  pagination.currentPage = page;
  loadPointsRecords();
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 初始化
onMounted(() => {
  loadPointsRecords();
});
</script>

<template>
  <div class="points-center">
    <div class="points-overview">
      <div class="balance-card">
        <div class="balance-title">积分余额</div>
        <div class="balance-value">{{ pointsBalance }}</div>
        <div class="balance-tips">积分可用于兑换功能使用次数或购买功能包</div>
      </div>
      
      <div class="recharge-card">
        <div class="recharge-title">
          积分充值
          <span v-if="rechargeDiscountText" class="member-discount-tag">{{ rechargeDiscountText }}</span>
        </div>
        
        <div class="recharge-options">
          <div 
            v-for="option in rechargeOptions" 
            :key="option.value"
            class="option-item"
            :class="{
              'active': selectedRechargeOption && selectedRechargeOption.value === option.value,
              'recommend': option.recommend
            }"
            @click="handleRechargeOptionSelect(option)"
          >
            <div class="option-points">{{ option.label }}</div>
            <div class="option-price">
              <span class="price-now">¥{{ getFinalPrice(option.price) }}</span>
              <span v-if="rechargeDiscount > 0" class="price-original">¥{{ option.price }}</span>
            </div>
            <div v-if="option.discount" class="option-discount">{{ option.discount }}</div>
            <div v-if="option.recommend" class="recommend-tag">推荐</div>
          </div>
          
          <div 
            class="option-item custom-option"
            :class="{ 'active': showCustomRecharge }"
            @click="handleRechargeOptionSelect('custom')"
          >
            <div class="option-points">自定义数量</div>
          </div>
        </div>
        
        <div v-if="showCustomRecharge" class="custom-recharge-input">
          <el-input-number 
            v-model="customRechargeAmount" 
            :min="10" 
            :max="10000" 
            :step="10"
            placeholder="输入充值数量"
          />
          <div class="custom-price" v-if="customRechargeAmount">
            需支付: ¥{{ getFinalPrice(Math.round(customRechargeAmount * 0.1 * 100) / 100) }}
          </div>
        </div>
        
        <div class="recharge-actions">
          <el-button type="primary" @click="handleRecharge" :loading="loading">立即充值</el-button>
        </div>
      </div>
    </div>
    
    <div class="points-records">
      <h4 class="section-title">积分记录</h4>
      
      <el-table :data="pointsRecords" style="width: 100%" v-loading="loading">
        <el-table-column label="时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>
        
        <el-table-column label="类型" width="100">
          <template #default="scope">
            <el-tag
              :type="scope.row.type === 'recharge' ? 'success' : (scope.row.type === 'award' ? 'warning' : 'danger')"
              size="small"
            >
              {{ scope.row.type === 'recharge' ? '充值' : (scope.row.type === 'award' ? '奖励' : '消费') }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="变动数量">
          <template #default="scope">
            <span :style="{ color: scope.row.amount > 0 ? '#67c23a' : '#f56c6c' }">
              {{ scope.row.amount > 0 ? '+' : '' }}{{ scope.row.amount }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="balance" label="变动后余额" />
        
        <el-table-column prop="description" label="说明" />
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          :current-page="pagination.currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.points-center {
  padding: 10px;
}

.points-overview {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.balance-card {
  flex: 1;
  min-width: 250px;
  background-color: #ecf5ff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.balance-title {
  font-size: 16px;
  font-weight: 500;
  color: #409eff;
  margin-bottom: 15px;
}

.balance-value {
  font-size: 36px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
}

.balance-tips {
  font-size: 12px;
  color: #909399;
}

.recharge-card {
  flex: 2;
  min-width: 300px;
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.recharge-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.member-discount-tag {
  margin-left: 10px;
  padding: 2px 6px;
  background-color: #f0f9eb;
  color: #67c23a;
  font-size: 12px;
  border-radius: 4px;
}

.recharge-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.option-item {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.option-item:hover {
  border-color: #409eff;
}

.option-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.option-item.recommend {
  border-color: #e6a23c;
}

.option-points {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.option-price {
  display: flex;
  justify-content: center;
  align-items: baseline;
  flex-wrap: wrap;
}

.price-now {
  font-size: 16px;
  color: #f56c6c;
  font-weight: bold;
}

.price-original {
  font-size: 12px;
  color: #909399;
  text-decoration: line-through;
  margin-left: 5px;
}

.option-discount {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #f56c6c;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 0 4px 0 4px;
}

.recommend-tag {
  position: absolute;
  top: 0;
  left: 0;
  background-color: #e6a23c;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px 0 4px 0;
}

.custom-option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}

.custom-recharge-input {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.custom-price {
  margin-top: 8px;
  font-size: 14px;
  color: #f56c6c;
}

.recharge-actions {
  display: flex;
  justify-content: center;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.points-records {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style> 