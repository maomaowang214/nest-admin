<template>
  <div v-if="url" class="preview-resource-container">
    <object
      :key="url"
      :data="url"
      :type="type"
      width="100%"
      height="100%"
      class="preview-object"
      @error="handleError"
    >
      <div class="preview-error">
        <p>无法预览此文件类型</p>
        <a :href="url" target="_blank" rel="noopener noreferrer">点击下载</a>
      </div>
    </object>
  </div>
  <div v-else class="preview-empty">
    <span>暂无预览内容</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

  defineOptions({
    name: 'preview-resource',
  });

const props = defineProps({
    url: {
      type: String,
    default: '',
    },
    type: {
      type: String,
    default: '',
    },
  });

const hasError = ref(false);

const handleError = () => {
  hasError.value = true;
};
</script>

<style lang="less" scoped>
.preview-resource-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-object {
  border: none;
  outline: none;
}

.preview-error {
  padding: 20px;
  text-align: center;
  color: #999;

  p {
    margin-bottom: 10px;
  }

  a {
    color: #1890ff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.preview-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}
</style>
