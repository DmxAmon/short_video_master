<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 功能包列表组件，展示可购买的功能包
-->
<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

// 功能包列表
const packages = ref([]);

// 用户已购买的功能包
const userPackages = ref([]);

// 加载状态
const loading = ref(false);

// 用户会员等级
const userLevel = computed(() => props.user.memberLevel || 'free');

// 会员折扣
const memberDiscount = computed(() => {
  const discounts = {
    'free': 0,
    'basic': 0.05,
    'pro': 0.1,
    'enterprise': 0.2
  };
  return discounts[userLevel.value] || 0;
});

// 计算折扣价格
const getDiscountedPrice = (price) => {
  if (memberDiscount.value <= 0) return price;
  return Math.round(price * (1 - memberDiscount.value) * 100) / 100;
};

// 检查是否已购买
const isPackagePurchased = (packageId) => {
  return userPackages.value.some(p => p.packageId === packageId);
};

// 购买功能包
const handlePurchase = (packageItem) => {
  ElMessage.success(`开始购买功能包: ${packageItem.title}`);
  // 这里应该调用实际购买API
  ElMessage.info('购买功能正在开发中...');
};

// 加载用户已购买的功能包
const loadUserPackages = async () => {
  loading.value = true;
  
  try {
    // 调用真实API获取功能包列表
    const response = await getFeaturePackages();
    if (response && response.code === 0) {
      packages.value = response.data || [];
    } else {
      throw new Error(response?.message || '获取功能包列表失败');
    }
  } catch (error) {
    console.error('加载功能包列表失败:', error);
    ElMessage.error('加载功能包列表失败');
  } finally {
    loading.value = false;
  }
};

// 计算已购买包的剩余天数
const getRemainingDays = (expiryDate) => {
  if (!expiryDate) return 0;
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

// 初始化
onMounted(() => {
  loadUserPackages();
});
</script>

<template>
  <div class="feature-packages">
    <h3 class="section-title">功能包商店</h3>
    
    <!-- 我的功能包 -->
    <div v-if="userPackages.length > 0" class="my-packages">
      <h4 class="subsection-title">我的功能包</h4>
      
      <el-table :data="userPackages" style="width: 100%" v-loading="loading">
        <el-table-column prop="title" label="功能包名称" />
        <el-table-column label="购买日期">
          <template #default="scope">
            {{ new Date(scope.row.purchaseDate).toLocaleDateString() }}
          </template>
        </el-table-column>
        <el-table-column label="有效期至">
          <template #default="scope">
            {{ new Date(scope.row.expiryDate).toLocaleDateString() }}
            <el-tag size="small" type="warning" v-if="getRemainingDays(scope.row.expiryDate) <= 7">
              还剩{{ getRemainingDays(scope.row.expiryDate) }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余使用量">
          <template #default="scope">
            <el-progress 
              :percentage="Math.min(100, scope.row.usageLeft)" 
              :format="() => `${scope.row.usageLeft}次`"
              :status="scope.row.usageLeft < 20 ? 'exception' : ''"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 可购买的功能包 -->
    <div class="available-packages">
      <h4 class="subsection-title">可购买的功能包</h4>
      
      <div v-loading="loading" class="packages-grid">
        <div 
          v-for="pkg in packages" 
          :key="pkg.id"
          class="package-card"
          :class="{ 'purchased': isPackagePurchased(pkg.id) }"
        >
          <div class="package-icon">
            <el-icon :size="32"><component :is="pkg.icon" /></el-icon>
          </div>
          
          <div class="package-info">
            <h5 class="package-title">{{ pkg.title }}</h5>
            <p class="package-description">{{ pkg.description }}</p>
            
            <ul class="package-features">
              <li v-for="(feature, index) in pkg.features" :key="index">
                {{ feature }}
              </li>
            </ul>
          </div>
          
          <div class="package-price-section">
            <div class="price-info">
              <span class="current-price">¥{{ getDiscountedPrice(pkg.price) }}</span>
              <span v-if="memberDiscount > 0" class="original-price">¥{{ pkg.price }}</span>
            </div>
            
            <el-button 
              type="primary" 
              @click="handlePurchase(pkg)"
              :disabled="isPackagePurchased(pkg.id)"
            >
              {{ isPackagePurchased(pkg.id) ? '已购买' : '立即购买' }}
            </el-button>
            
            <div v-if="memberDiscount > 0" class="member-discount">
              会员专享{{ memberDiscount * 100 }}%折扣
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-packages {
  padding: 10px;
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 20px;
  color: #303133;
}

.subsection-title {
  font-size: 16px;
  font-weight: 500;
  margin: 20px 0 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.my-packages {
  margin-bottom: 30px;
}

.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.package-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.package-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-5px);
}

.package-card.purchased {
  border-color: #67c23a;
  background-color: #f0f9eb;
}

.package-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #ecf5ff;
  color: #409eff;
  margin: 0 auto 15px;
}

.package-title {
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  margin: 0 0 10px;
  color: #303133;
}

.package-description {
  font-size: 14px;
  color: #606266;
  text-align: center;
  margin-bottom: 15px;
}

.package-features {
  padding-left: 20px;
  margin: 15px 0;
  color: #606266;
  font-size: 14px;
}

.package-features li {
  margin-bottom: 8px;
}

.package-price-section {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.price-info {
  display: flex;
  align-items: baseline;
  margin-bottom: 15px;
}

.current-price {
  font-size: 24px;
  font-weight: bold;
  color: #f56c6c;
}

.original-price {
  font-size: 14px;
  color: #909399;
  text-decoration: line-through;
  margin-left: 8px;
}

.member-discount {
  margin-top: 8px;
  font-size: 12px;
  color: #67c23a;
}
</style> 