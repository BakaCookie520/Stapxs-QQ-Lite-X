<!--
 * @FileDescription: 群文件列表项模板
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
 *           2.0 (Mr.Lee)
 * @description:
 *           1.0 miss
 *           2.0 重构为 Vue 3 setup 语法 + 使用类
-->

<template>
    <div :class="{
             folder: item.type === 'folder',
             open: (item instanceof GroupFileFolder) && item.isOpen
         }"
        @click="(item instanceof GroupFileFolder) ? item.open() : ''">
        <font-awesome-icon v-if="item.type === 'folder'" :icon="['fas', 'folder']" />
        <font-awesome-icon v-else :icon="['fas', 'file']" />
        <div class="main">
            <span>{{ item.name }}</span>
            <div>
                <span>{{ item.createrName }}</span>
                <span>{{ item.createTime ? item.createTime.format('year', 'day') : '-' }}</span>
                <span v-if="item instanceof GroupFile && item.deadTimeFormat">{{
                    item.deadTimeFormat + $t('天后')
                }}</span>
                <span v-if="item instanceof GroupFileFolder">{{ $t('共 {num} 个文件', { num: item.count }) }}</span>
                <span v-else>{{ item.formatSize }}</span>
            </div>
        </div>
        <template v-if="item instanceof GroupFile">
            <div v-if="downloadPercent === undefined"
                class="download"
                @click.stop="item.download()">
                <font-awesome-icon :icon="['fas', 'angle-down']" />
            </div>
            <svg v-else-if="downloadPercent !== undefined && downloadPercent < 100"
                class="download-bar"
                xmlns="http://www.w3.org/2000/svg"
                @click.stop="">
                <circle cx="50%" cy="50%" r="40%"
                    stroke-width="15%" fill="none" stroke-linecap="round" />
                <circle cx="50%" cy="50%" r="40%"
                    stroke-width="15%" fill="none"
                    :stroke-dasharray="downloadPercent === undefined ? '0,10000' : `${(Math.floor(2 * Math.PI * 25) * downloadPercent) / 100},10000` " />
            </svg>
            <div v-else class="download"
                @click.stop="">
                <font-awesome-icon :icon="['fas', 'check']" />
            </div>
        </template>
        <div v-if="item instanceof GroupFileFolder"
            v-show="item.isOpen.value"
            class="file-list">
            <template v-if="folderItems !== undefined">
                <div v-for="sub_item in folderItems"
                    :key="'sub_file-' + sub_item.id">
                    <FileBody :item="markRaw(sub_item)" />
                </div>
            </template>
            <div v-else class="loading" style="opacity: 0.9;">
                <font-awesome-icon :icon="['fas', 'spinner']" />
                {{ $t('加载中') }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { computed, markRaw } from 'vue'

const { item } = defineProps<{
    item: GroupFile | GroupFileFolder
}>()

const downloadPercent = computed(() => {
    return item instanceof GroupFile ? item.downloadPercent.value : undefined
})
const folderItems = computed(() => {
    return item instanceof GroupFileFolder ? item.items.value : undefined
})
</script>
