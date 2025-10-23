<!--
 * @FileDescription: 会话右键菜单
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *      原本的只能在Message.vue中使用的右键菜单，现在抽离出来，方便其他组件使用
-->
<template>
    <Menu ref="menu" name="chat-menu">
        <div class="ss-card msg-menu-body" @click.stop>
            <div v-if="displayTag.download" @click="download">
                <div><font-awesome-icon :icon="['fas', 'angle-down']" /></div>
                <a>{{ $t('下载') }}</a>
            </div>
            <div v-if="displayTag.open" @click="switchOpen">
                <div><font-awesome-icon :icon="['fas', 'grip-lines']" /></div>
                <a>{{ $t('打开') }}</a>
            </div>
            <div v-if="displayTag.close" @click="switchOpen">
                <div><font-awesome-icon :icon="['fas', 'trash-can']" /></div>
                <a>{{ $t('关闭') }}</a>
            </div>
            <div v-if="displayTag.upload" @click="upload">
                <div><font-awesome-icon :icon="['fas', 'check-to-slot']" /></div>
                <a>{{ $t('上传') }}</a>
            </div>
            <div v-if="displayTag.rename" @click="rename">
                <div><font-awesome-icon :icon="['fas', 'edit']" /></div>
                <a>{{ $t('重命名') }}</a>
            </div>
            <div v-if="displayTag.delete" @click="deleteFile">
                <div><font-awesome-icon :icon="['fas', 'trash']" style="color: var(--color-red)" /></div>
                <a style="color: var(--color-red)">{{ $t('删除') }}</a>
            </div>
        </div>
    </Menu>
</template>

<script setup lang="ts">
import { MenuEventData } from '@renderer/function/elements/information'
import Menu from './Menu.vue'

import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { runtimeData } from '@renderer/function/msg'
import { i18n } from '@renderer/main'
import {
    shallowReactive,
    shallowRef,
    useTemplateRef,
} from 'vue'
import { FileSender } from '@renderer/function/utils/fileSender'
import { PopInfo, PopType } from '@renderer/function/base'
import { ensurePopBox, inputPopBox } from '@renderer/function/utils/popBox'
import { Role } from '@renderer/function/adapter/enmu'

//#region == 声明变量 ================================================================
const $t = i18n.global.t
const menu = useTemplateRef('menu')
const displayTag = shallowReactive({
    download: false,
    open: false,
    close: false,
    upload: false,
    delete: false,
    rename: false
})
const currentFile = shallowRef<GroupFile | GroupFileFolder | undefined>()

// 导出
defineExpose({
    open,
})
//#endregion

//#region == 方法函数 ================================================================
async function open(
    file: GroupFile | GroupFileFolder,
    event: MenuEventData
): Promise<void> {
    if (!menu.value) return
    if (menu.value?.isShow()) return

    currentFile.value = file
    for (const key in displayTag) {
        displayTag[key] = false
    }

    displayTag.rename = true

    if (file instanceof GroupFile) {
        displayTag.download = true
    } else {
        displayTag.close = file.isOpen
        displayTag.open = !file.isOpen
        displayTag.upload = true
    }

    if (
        file.group.getMe().canAdmin(file.creator.role ?? Role.User) ||
        file.creator.user_id === runtimeData.selfInfo?.user_id
    )
        displayTag.delete = true

    await menu.value.showMenu(event.x, event.y)

    currentFile.value = undefined
}

function close(): void {
    if (!menu.value) return
    menu.value.closeMenu()
}

function download(): void {
    (currentFile.value as GroupFile)?.download()
    close()
}
function switchOpen(): void {
    (currentFile.value as GroupFileFolder)?.open()
    close()
}
function upload(): void {
    const folder: GroupFileFolder = currentFile.value as GroupFileFolder
    FileSender.autoUploadFile(folder.group, folder)
    close()
}
async function rename() {
    const file = currentFile.value!
    close()
    if (file instanceof GroupFile) {
        await renameFile()
    } else {
        await renameFolder()
    }
    await file.group.loadFiles(false)
}
async function renameFile() {
    const file = currentFile.value as GroupFile

    if (!runtimeData.nowAdapter?.renameGroupFile) {
        new PopInfo().add(PopType.INFO, $t('当前适配器不支持重命名文件'))
        return
    }

    const newName = await inputPopBox({
        title: $t('重命名'),
        svg: 'file-pen',
        placeholder: $t('请输入新的文件名称'),
        value: file.name,
    })

    if (!newName || newName === '' || newName === file.name) return

    await runtimeData.nowAdapter.renameGroupFile(file, newName)
}
async function renameFolder() {
    const folder = currentFile.value as GroupFileFolder

    if (!runtimeData.nowAdapter?.renameGroupFileFolder) {
        new PopInfo().add(PopType.INFO, $t('当前适配器不支持重命名文件夹'))
        return
    }

    const newName = await inputPopBox({
        title: $t('重命名'),
        svg: 'folder-pen',
        placeholder: $t('请输入新的文件夹名称'),
        value: folder.name,
    })

    if (!newName || newName === '' || newName === folder.name) return

    await runtimeData.nowAdapter.renameGroupFileFolder(folder, newName)
}
async function deleteFile(): Promise<void> {
    close()
    const file = currentFile.value
    if (!file) return
    if (file instanceof GroupFile) {
        if (!runtimeData.nowAdapter?.deleteGroupFile) {
            new PopInfo().add(PopType.INFO, $t('当前适配器不支持删除文件'))
            return
        }
        await runtimeData.nowAdapter.deleteGroupFile(file)
    } else {
        if (!runtimeData.nowAdapter?.deleteGroupFileFolder) {
            new PopInfo().add(PopType.INFO, $t('当前适配器不支持删除文件夹'))
            return
        }
        if (file.count > 0) {
            const re = await ensurePopBox($t('文件夹不为空，确认删除？'))
            if (!re) return
        }
        await runtimeData.nowAdapter.deleteGroupFileFolder(file)

        await file.group.loadFiles(false)
    }
}
//#endregion
</script>
