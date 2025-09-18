/*
 * @FileDescription: 文件相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/28
 * @Version: 1.0
 * @Description: 文件和文件夹模型
 */

import app from '@renderer/main'
import { shallowRef, ShallowRef } from 'vue'
import { GroupFileData, GroupFolderData } from '../adapter/interface'
import { PopInfo, PopType } from '../base'
import { runtimeData } from '../msg'
import { downloadFile } from '../utils/appUtil'
import { getSizeFromBytes } from '../utils/systemUtil'
import { Name, Time } from './data'
import { GroupSession } from './session'

export class GroupFile {
    type: string = 'file'

    group: GroupSession
    id: string
    _name: Name
    size: number
    downloadTimes: number
    deadTime?: number
    _createrName: Name
    createTime?: Time
    url?: string

    downloadPercent: ShallowRef<number|undefined> = shallowRef()

    constructor(data: GroupFileData, group: GroupSession) {
        this.id = data.file_id
        this._name = new Name(data.file_name)
        this.size = data.size
        this.downloadTimes = data.download_times
        if(data.dead_time) this.deadTime = data.dead_time
        if (data.uploader_id) this._createrName = new Name(getSenderName(data.uploader_id, group))
        else if (data.uploader_name) this._createrName = new Name(data.uploader_name)
        else throw new Error('文件上传者信息错误')
        if(data.upload_time) this.createTime = new Time(data.upload_time)
        this.group = group
    }

    /**
     * 下载文件
     * @returns 文件是否下载成功
     */
    async download(): Promise<boolean> {
        this.downloadPercent.value = 0

        // 如果没有url，则获取url
        if (!this.url) {
            const re = await this.getUrl()
            this.downloadPercent.value = undefined
            if (!re) return false
        }

        let re: boolean | undefined

        downloadFile(this.url as string, this.name, (event: ProgressEvent) => {
            if (!event.lengthComputable) return
            const percent = Math.floor((event.loaded / event.total) * 100)
            this.downloadPercent.value = percent
            if (percent >= 100) re = true
        },
        ()=>{
            this.downloadPercent.value = undefined
            re = false
        })

        return await new Promise((resolve) => {
            const timer = setInterval(() => {
                if (re !== undefined) {
                    clearInterval(timer)
                    resolve(false)
                }
            }, 100)
        })
    }

    /**
     * 获取url
     * @returns 获取url是否成功
     */
    async getUrl() {
        const { $t } = app.config.globalProperties
        if (!runtimeData.nowAdapter) return

        const data = await runtimeData.nowAdapter.getGroupFileUrl!(this)

        if (!data) {
            new PopInfo().add(PopType.ERR, $t('获取下载连接失败'))
            return false
        }

        this.url = data
        return true
    }

    match(search: string): boolean {
        search = search.trim().toLowerCase()
        if (this._name.matchStr(search)) return true
        if (this._createrName.matchStr(search)) return true
        return false
    }

    get deadTimeFormat(): string | undefined {
        if (!this.deadTime) return undefined
        return (this.deadTime - Date.now() / 86400 - 1).toFixed(0)
    }

    get formatSize(): string {
        return getSizeFromBytes(this.size)
    }

    get name(): string {
        return this._name.toString()
    }

    set name(name: string | Name) {
        if (typeof name === 'string') this._name = new Name(name)
        else this._name = name
    }

    get createrName(): string {
        return this._createrName.toString()
    }

    set createrName(name: string | Name) {
        if (typeof name === 'string') this._createrName = new Name(name)
        else this._createrName = name
    }
}

export class GroupFileFolder {
    type: string = 'folder'

    group: GroupSession
    id: string
    _name: Name
    count: number
    createTime?: Time
    _createrName: Name

    items: ShallowRef<(GroupFile | GroupFileFolder)[] | undefined> = shallowRef(undefined)
    isOpen: ShallowRef<boolean> = shallowRef(false)
    constructor(data: GroupFolderData, group: GroupSession) {
        this.id = data.folder_id
        this._name = new Name(data.folder_name)
        this.count = data.count
        if(data.create_time) this.createTime = new Time(data.create_time)
        if (data.creater_id) this._createrName = new Name(getSenderName(data.creater_id, group))
        else if (data.creater_name) this._createrName = new Name(data.creater_name)
        else throw new Error('文件夹创建者信息错误')
        this.group = group
    }

    async open(): Promise<boolean> {
        this.isOpen.value = !this.isOpen.value

        if (this.items.value !== undefined) return true

        const { $t } = app.config.globalProperties

        if (!runtimeData.nowAdapter) return false

        const data = await runtimeData.nowAdapter.getGroupFolderFile!(this.group, this.id)
        if (!data) {
            new PopInfo().add(PopType.ERR, $t('获取文件夹内容失败'))
            return false
        }

        const sort = (a, b) => {
            if (!a.createTime) return -1
            if (!b.createTime) return 1
            return b.createTime.time - a.createTime.time
        }

        const out: (GroupFile | GroupFileFolder)[] = [
            ...data.folders.map(folder => new GroupFileFolder(folder, this.group)).sort(sort),
            ...data.files.map(file => new GroupFile(file, this.group)).sort(sort),
        ]

        this.items.value = out

        return true
    }

    match(search: string): boolean {
        search = search.trim().toLowerCase()
        if (this._name.matchStr(search)) return true
        if (this._createrName.matchStr(search)) return true

        if (this.items.value) {
            for (const item of this.items.value) {
                if (item.match(search)) return true
            }
        }

        return false
    }

    get name(): string {
        return this._name.toString()
    }

    set name(name: string | Name) {
        if (typeof name === 'string') this._name = new Name(name)
        else this._name = name
    }

    get createrName(): string {
        return this._createrName.toString()
    }

    set createrName(name: string | Name) {
        if (typeof name === 'string') this._createrName = new Name(name)
        else this._createrName = name
    }
}

function getSenderName(id: number, session: GroupSession): string {
    const { $t } = app.config.globalProperties
    const member = session.getUserById(id)
    if (member) return member.name

    return $t('已退群( {userId} )', { userId: id })
}
