<template>
  <Drawer title="文件详情" :width="500" :visible="visible" @close="handleClose">
    <Spin :spinning="loading" class="preview-drawer-inner-box">
      <Space direction="vertical" :size="16" style="width: 100%">
        <!-- 预览区域 -->
        <div v-if="imageLoadError && previewSrc" class="preview-error">
          <p>图片加载失败</p>
          <a :href="previewSrc" target="_blank" rel="noopener noreferrer">点击查看原图</a>
        </div>
        <div v-else-if="previewSrc && imageView2Handle" class="preview-container">
          <template v-if="detailInfo.mimeType?.startsWith('image/')">
            <!-- 使用原生img标签，避免Ant Design Vue Image组件的限制 -->
            <img
              class="w-full preview-image"
              :src="imageView2Handle"
              :alt="fileName"
              @error="handleImageError"
              @load="handleImageLoad"
              @click="handleImageClick"
              style="cursor: pointer;"
            />
          </template>
          <template v-else>
            <div class="w-full preview-resource-wrapper">
              <PreviewResource class="w-full h-[210px]" :url="previewSrc" :type="detailInfo.mimeType" />
            </div>
          </template>
        </div>
        <div v-else-if="!loading && !previewSrc" class="preview-placeholder">
          <span>暂无预览</span>
        </div>
        <Descriptions bordered :column="1" size="small">
          <template v-for="key in detailInfoMap.keys()" :key="key">
            <Descriptions.Item
              :label="detailInfoMap.get(key)"
              :label-style="{ whiteSpace: 'nowrap' }"
            >
              {{ detailInfo[key] }}
            </Descriptions.Item>
          </template>
          <!-- mark -->
          <Descriptions.Item label="文件备注" :label-style="{ whiteSpace: 'nowrap' }">
            <Space direction="vertical" align="end">
              <Input.TextArea
                v-model:value="mark"
                :disabled="!$auth('netdisk:manage:mark')"
                placeholder="请输入文件备注"
                :maxlength="100"
                :rows="4"
                show-count
              />
              <a-button
                :loading="updateMarkLoading"
                :disabled="!$auth('netdisk:manage:mark')"
                type="primary"
                size="mini"
                @click="updateMark"
                >更新
              </a-button>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Spin>
  </Drawer>
</template>

<script lang="ts" setup>
  import { ref, computed, nextTick } from 'vue';
  import { Drawer, message, Spin, Input, Descriptions, Space } from 'ant-design-vue';
  import { formatSizeUnits } from '@/utils';
  import { Api } from '@/api/';
  import { hasPermission } from '@/permission';
  import { formatToDateTime } from '@/utils/dateUtil';
  import PreviewResource from '@/components/basic/preview-resource/index.vue';

  defineOptions({
    name: 'FilePreviewDrawer',
  });

  const detailInfoMap = new Map([
    ['name', '文件名'],
    ['mimeType', '文件类型'],
    ['hash', '文件Hash'],
    ['md5', '文件MD5'],
    ['fsize', '文件大小'],
    ['putTime', '上传时间'],
    ['uploader', '上传人员'],
  ] as const);

  const loading = ref(false);
  const visible = ref(false);
  const fileName = ref('');
  const filePath = ref('');

  const detailInfo = ref<Partial<API.SFileInfo & { name: string; fsize: string }>>({});
  const previewSrc = ref('');
  const mark = ref('');
  const updateMarkLoading = ref(false);
  const imageLoadError = ref(false);

  // 占位图片
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5pyq5Yqg6L29PC90ZXh0Pjwvc3ZnPg==';

  // 图片缩略图URL（用于显示）
  // 使用代理接口解决Mixed Content问题
  const imageView2Handle = computed(() => {
    if (!previewSrc.value || previewSrc.value.trim() === '') {
      return '';
    }
    // 如果URL是HTTP协议，使用代理接口
    if (previewSrc.value.startsWith('http://')) {
      // 使用代理接口，将HTTP的图片URL通过HTTPS代理
      return `/api/netdisk/manage/proxy?url=${encodeURIComponent(previewSrc.value)}`;
    }
    // HTTPS或data URL直接使用
    return previewSrc.value;
  });

  // 处理图片加载成功
  const handleImageLoad = () => {
    imageLoadError.value = false;
  };

  // 处理图片加载错误
  const handleImageError = (e: Event) => {
    const img = e.target as HTMLImageElement;
    const failedUrl = img.src;
    console.error('图片加载失败:', failedUrl);
    console.error('原始预览链接:', previewSrc.value);
    console.error('处理后的URL:', imageView2Handle.value);
    // 检查是否是CORS问题或其他网络问题
    if (failedUrl && failedUrl !== previewSrc.value && failedUrl !== imageView2Handle.value) {
      console.warn('图片URL可能被修改或编码:', {
        original: previewSrc.value,
        processed: imageView2Handle.value,
        failed: failedUrl,
      });
    }
    imageLoadError.value = true;
  };

  // 处理图片点击（打开大图预览）
  const handleImageClick = () => {
    if (previewSrc.value) {
      window.open(previewSrc.value, '_blank');
    }
  };

  const open = async (name, path) => {
    visible.value = true;
    fileName.value = name;
    filePath.value = path;
    imageLoadError.value = false;
    previewSrc.value = '';
    await nextTick();
    try {
      loading.value = true;
      const fileInfo = {
        name,
        path,
      };
      const data = await Api.netDiskManage.netDiskManageInfo(fileInfo);
      mark.value = data.mark || '';
      Array.from(detailInfoMap.keys()).forEach((key) => {
        if (key === 'fsize') {
          detailInfo.value.fsize = formatSizeUnits(data[key]);
        } else {
          detailInfo.value[key] = data[key];
        }
      });
      detailInfo.value.putTime = formatToDateTime(data.putTime);
      detailInfo.value.name = name;

      // 获取预览/下载链接
      if (hasPermission('netdisk:manage:download')) {
        try {
          // 如果是图片，使用预览接口（带图片处理参数）
          // 如果是其他文件，使用下载接口
          const isImage = detailInfo.value.mimeType?.startsWith('image/');
          
          let url: string;
          if (isImage) {
            // 图片使用预览接口，会自动添加图片处理参数
            // 对于私有空间，预览链接会包含签名和图片处理参数
            url = await Api.netDiskManage.netDiskManagePreview(fileInfo);
          }
          else {
            // 非图片文件使用下载接口
            url = await Api.netDiskManage.netDiskManageDownload(fileInfo);
          }

          if (url && url.trim() !== '') {
            previewSrc.value = url;
          }
          else {
            console.warn('获取预览链接失败，URL为空');
            message.warning('无法获取文件预览链接');
          }
        }
        catch (error: any) {
          console.error('获取预览链接失败:', error);
          message.error(error?.message || '获取文件预览链接失败');
        }
      }
      else {
        console.warn('没有下载权限，无法预览文件');
      }
    } catch (error) {
      console.error('获取文件详情失败:', error);
      message.error('获取文件详情失败');
      handleClose();
    } finally {
      loading.value = false;
    }
  };
  const updateMark = async () => {
    try {
      updateMarkLoading.value = true;
      await Api.netDiskManage.netDiskManageMark({
        name: fileName.value,
        path: filePath.value,
        mark: mark.value,
      });
      message.success('已更新文件备注');
    } finally {
      updateMarkLoading.value = false;
    }
  };
  const handleClose = () => {
    fileName.value = '';
    filePath.value = '';
    previewSrc.value = '';
    mark.value = '';
    detailInfo.value = {};
    imageLoadError.value = false;
    visible.value = false;
  };

  defineExpose({ open });
</script>

<style lang="less" scoped>
.preview-drawer-inner-box {
  min-height: 200px;
}

.preview-container {
  width: 100%;
  min-height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.preview-image {
  max-height: 210px;
  object-fit: contain;
}

.preview-resource-wrapper {
  min-height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-placeholder {
  width: 100%;
  height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  color: #999;
  font-size: 14px;
}

.preview-error {
  width: 100%;
  height: 210px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 14px;

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
</style>
