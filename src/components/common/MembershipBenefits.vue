<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 会员特权组件，用于展示会员的各项特权和权益
-->
<script setup>
import { ref, computed } from 'vue';
import { ArrowRight, Check, Star } from '@element-plus/icons-vue';

const props = defineProps({
  // 会员特权列表
  benefits: {
    type: Array,
    required: true,
    default: () => []
  },
  // 当前会员等级
  currentLevel: {
    type: String,
    default: '免费用户'
  },
  // 会员等级列表
  levels: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['upgrade']);

// 当前激活的分类
const activeCategory = ref('all');

// 分类列表
const categories = computed(() => {
  const allCategories = ['all'];
  
  props.benefits.forEach(benefit => {
    if (benefit.category && !allCategories.includes(benefit.category)) {
      allCategories.push(benefit.category);
    }
  });
  
  return allCategories.map(category => ({
    id: category,
    name: category === 'all' ? '全部' : category
  }));
});

// 根据分类筛选特权
const filteredBenefits = computed(() => {
  if (activeCategory.value === 'all') {
    return props.benefits;
  }
  
  return props.benefits.filter(benefit => benefit.category === activeCategory.value);
});

// 获取会员等级信息
const getLevelInfo = (levelName) => {
  return props.levels.find(level => level.name === levelName) || null;
};

// 检查特权是否对当前会员等级可用
const isAvailableForCurrentLevel = (benefit) => {
  const currentLevelInfo = getLevelInfo(props.currentLevel);
  if (!currentLevelInfo) return false;
  
  const requiredLevelInfo = getLevelInfo(benefit.requiredLevel);
  if (!requiredLevelInfo) return false;
  
  return currentLevelInfo.order >= requiredLevelInfo.order;
};

// 处理升级点击
const handleUpgradeClick = (requiredLevel) => {
  emit('upgrade', requiredLevel);
};

// 切换分类
const changeCategory = (categoryId) => {
  activeCategory.value = categoryId;
};
</script>

<template>
  <div class="membership-benefits">
    <div class="benefits-header">
      <h3 class="section-title">会员特权</h3>
      <div class="category-tabs">
        <div 
          v-for="category in categories" 
          :key="category.id"
          class="category-tab"
          :class="{ 'active': activeCategory === category.id }"
          @click="changeCategory(category.id)"
        >
          {{ category.name }}
        </div>
      </div>
    </div>
    
    <div class="benefits-grid">
      <div 
        v-for="(benefit, index) in filteredBenefits" 
        :key="index"
        class="benefit-card"
        :class="{ 
          'unavailable': !isAvailableForCurrentLevel(benefit),
          [benefit.highlightClass]: benefit.highlightClass
        }"
      >
        <div class="benefit-icon" :style="{ backgroundColor: benefit.iconBg || '#f0f9ff' }">
          <i :class="benefit.icon || 'icon-feature'"></i>
        </div>
        
        <div class="benefit-content">
          <div class="benefit-header">
            <h4 class="benefit-title">{{ benefit.title }}</h4>
            <span v-if="benefit.isNew" class="new-tag">新</span>
            <span v-if="benefit.isHot" class="hot-tag">热门</span>
          </div>
          
          <p class="benefit-description">{{ benefit.description }}</p>
          
          <div class="benefit-meta">
            <div class="required-level">
              <span class="level-label">所需等级：</span>
              <span 
                class="level-name" 
                :style="{ color: getLevelInfo(benefit.requiredLevel)?.color }"
              >
                {{ benefit.requiredLevel }}
              </span>
            </div>
            
            <div class="benefit-status" v-if="!isAvailableForCurrentLevel(benefit)">
              <el-button 
                type="primary" 
                size="small" 
                @click="handleUpgradeClick(benefit.requiredLevel)"
                :icon="ArrowRight"
              >
                立即升级
              </el-button>
            </div>
            <div v-else class="benefit-available">
              <el-icon :color="'#67c23a'"><Check /></el-icon> 已解锁
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="filteredBenefits.length === 0" class="empty-benefits">
      <el-empty description="暂无特权" />
    </div>
  </div>
</template>

<style scoped>
.membership-benefits {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.benefits-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .benefits-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .category-tabs {
    margin-top: 16px;
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.category-tabs {
  display: flex;
}

.category-tab {
  padding: 6px 16px;
  margin-right: 8px;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #f5f7fa;
  color: #606266;
}

.category-tab:hover {
  background-color: #e6f1fc;
  color: #409eff;
}

.category-tab.active {
  background-color: #409eff;
  color: #fff;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.benefit-card {
  display: flex;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 16px;
  transition: all 0.3s;
}

.benefit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.benefit-card.unavailable {
  opacity: 0.8;
}

.benefit-card.highlighted {
  border-color: #e6a23c;
  background-color: #fdf6ec;
}

.benefit-card.premium {
  border-color: #8e44ad;
  background-color: #f5eef8;
}

.benefit-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
  font-size: 24px;
  color: #409eff;
}

.benefit-content {
  flex: 1;
}

.benefit-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.benefit-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  margin-right: 8px;
  color: #303133;
}

.new-tag, .hot-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  margin-right: 6px;
}

.new-tag {
  background-color: #67c23a;
}

.hot-tag {
  background-color: #f56c6c;
}

.benefit-description {
  font-size: 14px;
  color: #606266;
  margin: 0 0 12px;
  line-height: 1.5;
}

.benefit-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.required-level {
  font-size: 13px;
}

.level-label {
  color: #909399;
}

.level-name {
  font-weight: 500;
}

.benefit-available {
  display: flex;
  align-items: center;
  color: #67c23a;
  font-size: 13px;
}

.benefit-available .el-icon {
  margin-right: 4px;
}

.empty-benefits {
  padding: 40px 0;
  text-align: center;
}
</style> 