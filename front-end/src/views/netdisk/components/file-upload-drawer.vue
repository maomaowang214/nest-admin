<template>
    <Drawer
      :title="title"
    :width="500"
      :visible="visible"
      :mask-closable="false"
      @close="handleClose"
    >
      <Spin :spinning="loading" class="upload-inner-box">
        <Upload.Dragger
          ref="uploadRef"
          v-model:file-list="fileList"
          class="upload"
          drag
          action="noaction"
          :multiple="true"
          :custom-request="uploadFile"
        :before-upload="beforeUpload"
        >
        <p class="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p class="ant-upload-text">将文件拖到此处，或<em>点击上传</em></p>
        <p class="ant-upload-hint">支持多文件上传，单个文件最大10MB</p>
        </Upload.Dragger>
      </Spin>
    </Drawer>
</template>

<script lang="ts" setup>
  import { ref, computed, createVNode, nextTick } from 'vue';
  import { isEmpty } from 'lodash-es';
  import * as qiniu from 'qiniu-js/esm';
import { CloudUploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { Modal, Drawer, Spin, Upload, notification, message } from 'ant-design-vue';
  import type { UploadProps, UploadFile } from 'ant-design-vue';
  import { Api } from '@/api/';

  defineOptions({
    name: 'FileUploadDrawer',
  });

  const emit = defineEmits(['changed']);

  const uploadRef = ref<InstanceType<typeof Upload.Dragger>>();
  const loading = ref(false);
  const visible = ref(false);
  const path = ref('');
  const token = ref('');
  const subscribes = ref<any[]>([]);
  const successSubs = ref<any[]>([]);
  const fileList = ref<UploadFile<any>[]>([]);
const uploadingCount = ref(0);

  const title = computed(() => {
  const pathName = isEmpty(path.value) ? '根目录' : path.value.substring(0, path.value.length - 1);
  return `上传文件到 ${pathName}`;
  });

/**
 * 打开上传抽屉
 */
const open = async (filePath: string) => {
  path.value = filePath || '';
    visible.value = true;
  uploadingCount.value = 0;

  // 重置状态
  fileList.value = [];
  subscribes.value = [];
  successSubs.value = [];

  // 获取上传Token
    loading.value = true;
  try {
    const data = await Api.netDiskManage.netDiskManageToken();
        token.value = data.token;
        loading.value = false;
  }
  catch (error: any) {
    console.error('获取上传Token失败:', error);
    message.error('获取上传Token失败，请稍后重试');
    loading.value = false;
    visible.value = false;
  }
};

/**
 * 上传前检查
 */
const beforeUpload = (file: File) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    message.error(`文件 ${file.name} 超过10MB限制`);
    return false;
  }
  return true;
};

  /**
 * 使用qiniu-js上传文件
   */
  const uploadFile: UploadProps['customRequest'] = (param) => {
    const { file, onProgress, onError, onSuccess } = param;

  if (!token.value) {
    onError?.(new Error('上传Token未获取，请重试'));
    return;
  }

  // 构建文件路径
  const fileName = (file as File).name;
  const fileKey = `${path.value}${fileName}`;

  uploadingCount.value++;

  // 使用七牛云SDK上传
  const observable = qiniu.upload(file as File, fileKey, token.value, undefined, {
    fname: fileName,
    mimeType: (file as File).type || 'application/octet-stream',
  });

    const sub = observable.subscribe({
      next: (res) => {
      // 更新上传进度
      onProgress?.({ percent: Math.round(res.total.percent) });
      },
      error: (err) => {
      uploadingCount.value--;
        onError?.(err);
        handleUploadError(err, file as File);
      },
      complete: (res) => {
      uploadingCount.value--;
        successSubs.value.push(sub);
        onSuccess?.(res);
      handleUploadSuccess(file as File, res);
      },
    });

    subscribes.value.push(sub);
  };

/**
 * 处理上传错误
 */
const handleUploadError = (err: any, file: File) => {
    const failFile = fileList.value.find((n) => n.originFileObj === file);
    if (failFile) {
      failFile.status = 'error';
    }

  let errorMessage = '上传失败';
  if (err.code === 614) {
    errorMessage = '文件已存在';
  }
  else if (err.message) {
    errorMessage = err.message;
  }

    notification.error({
    message: '上传失败',
    description: `文件 ${file.name} 上传失败：${errorMessage}`,
    duration: 4,
    });
  };

/**
 * 处理上传成功
 */
const handleUploadSuccess = (file: File, res: any) => {
    const successFile = fileList.value.find((n) => n.originFileObj === file);
    if (successFile) {
      successFile.status = 'success';
    }

    notification.success({
    message: '上传成功',
    description: `文件 ${file.name} 上传成功`,
    duration: 2,
  });

  // 如果所有文件都上传完成，自动刷新列表
  if (uploadingCount.value === 0 && successSubs.value.length > 0) {
    setTimeout(() => {
      emit('changed');
    }, 500);
  }
};

/**
 * 关闭抽屉前的确认
 */
const handleClose = () => {
  if (uploadingCount.value > 0) {
    Modal.confirm({
      title: '确认关闭',
      icon: createVNode(ExclamationCircleOutlined),
      content: '还有文件正在上传，关闭会取消未完成的文件，确认关闭吗？',
      onOk: close,
    });
  }
  else {
    close();
  }
};

/**
 * 关闭抽屉
 */
const close = async () => {
  // 取消所有未完成的上传
  if (subscribes.value.length > 0) {
    subscribes.value.forEach((sub) => {
      if (!successSubs.value.includes(sub)) {
        sub.unsubscribe();
      }
    });
  }

  // 重置状态
  visible.value = false;
  loading.value = false;
  path.value = '';
  token.value = '';
  fileList.value = [];
  subscribes.value = [];
  successSubs.value = [];
  uploadingCount.value = 0;

    await nextTick();

  // 通知父组件刷新列表
    emit('changed');
  };

  defineExpose({
    open,
  });
</script>

<style lang="less" scoped>
.upload-inner-box {
  min-height: 300px;
}

.upload {
  :deep(.ant-upload-drag) {
    background: #fafafa;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      border-color: #1890ff;
      background: #f0f8ff;
    }
  }

  :deep(.ant-upload-drag-icon) {
    margin-bottom: 16px;
    font-size: 48px;
    color: #1890ff;
  }

  :deep(.ant-upload-text) {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;

    em {
      color: #1890ff;
      font-style: normal;
    }
  }

  :deep(.ant-upload-hint) {
    font-size: 12px;
    color: #999;
  }
}
</style>
