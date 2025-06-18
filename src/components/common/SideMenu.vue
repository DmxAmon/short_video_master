<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 侧边菜单组件
-->
<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  VideoCameraFilled, 
  DocumentFilled, 
  Grid, 
  Operation, 
  Setting, 
  Histogram 
} from '@element-plus/icons-vue';

const { t } = useI18n();

const props = defineProps({
  // 当前选中的菜单项
  activeMenu: {
    type: String,
    default: ''
  },
  // 是否折叠
  collapse: {
    type: Boolean,
    default: false
  },
  // 菜单宽度
  width: {
    type: String,
    default: '220px'
  },
  // 折叠后的宽度
  collapseWidth: {
    type: String,
    default: '64px'
  }
});

const emit = defineEmits(['update:activeMenu', 'menu-change']);

// 菜单配置
const menuItems = computed(() => [
  {
    key: 'douyin',
    label: t('menu.douyinData'),
    icon: VideoCameraFilled,
    children: [
      {
        key: 'douyin-author',
        label: t('menu.douyinAuthor'),
      },
      {
        key: 'douyin-video',
        label: t('menu.douyinVideo'),
      }
    ]
  },
  {
    key: 'transcript',
    label: t('menu.transcript'),
    icon: DocumentFilled,
    children: [
      {
        key: 'transcript-create',
        label: t('menu.transcriptCreate'),
      },
      {
        key: 'transcript-history',
        label: t('menu.transcriptHistory'),
      }
    ]
  },
  {
    key: 'bitable',
    label: t('menu.bitable'),
    icon: Grid,
    children: [
      {
        key: 'bitable-sync',
        label: t('menu.bitableSync'),
      },
      {
        key: 'bitable-setting',
        label: t('menu.bitableSetting'),
      }
    ]
  },
  {
    key: 'analytics',
    label: t('menu.analytics'),
    icon: Histogram,
  },
  {
    key: 'settings',
    label: t('menu.settings'),
    icon: Setting,
  }
]);

// 当前激活的菜单
const currentActive = ref(props.activeMenu);

// 监听外部activeMenu变化
watch(() => props.activeMenu, (newVal) => {
  currentActive.value = newVal;
});

// 处理菜单选择
const handleSelect = (key) => {
  currentActive.value = key;
  emit('update:activeMenu', key);
  emit('menu-change', key);
};
</script>

<template>
  <div class="side-menu-container">
    <el-menu
      :default-active="currentActive"
      class="side-menu"
      :collapse="collapse"
      :width="width"
      :collapse-width="collapseWidth"
      @select="handleSelect"
    >
      <template v-for="item in menuItems" :key="item.key">
        <!-- 有子菜单的情况 -->
        <el-sub-menu v-if="item.children && item.children.length" :index="item.key">
          <template #title>
            <el-icon v-if="item.icon">
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.label }}</span>
          </template>
          
          <el-menu-item 
            v-for="child in item.children" 
            :key="child.key" 
            :index="child.key"
          >
            <el-icon v-if="child.icon">
              <component :is="child.icon" />
            </el-icon>
            <span>{{ child.label }}</span>
          </el-menu-item>
        </el-sub-menu>
        
        <!-- 无子菜单的情况 -->
        <el-menu-item v-else :index="item.key">
          <el-icon v-if="item.icon">
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </template>
    </el-menu>
  </div>
</template>

<style scoped>
.side-menu-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.side-menu {
  height: 100%;
  border-right: none;
}

.side-menu :deep(.el-sub-menu .el-sub-menu__title) {
  padding-left: 20px;
}

.side-menu :deep(.el-menu-item) {
  padding-left: 20px;
}

/* 二级菜单样式 */
.side-menu :deep(.el-menu--inline .el-menu-item) {
  padding-left: 40px !important;
}
</style> 