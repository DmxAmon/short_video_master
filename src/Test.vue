<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 测试组件
-->
<script setup>
import { ref } from 'vue';

const message = ref('Hello, World!');
</script>

<template>
  <div class="test-container">
    <h1>{{ message }}</h1>
    <p>这是一个测试组件，用于验证Vue应用是否正常工作。</p>
    <button @click="message = '组件正常工作！'">点击我</button>
  </div>
</template>

<style scoped>
.test-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-top: 50px;
}

h1 {
  color: #409eff;
  font-size: 24px;
  margin-bottom: 20px;
}

p {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
}

button {
  background-color: #409eff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #66b1ff;
}
</style> 