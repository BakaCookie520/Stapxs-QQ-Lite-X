/*
 * @FileDescription: 资源模型
 * @Author: Mr.Lee
 * @Date: 2025/07/15
 * @Version: 1.0
 * @Description: 对tx资源id的封装，支持主动获取资源id
 */

import { markRaw, shallowRef } from 'vue'
import { runtimeData } from '../msg'
import { ProxyUrl } from './proxyUrl'

const timerRegistry = new FinalizationRegistry((timerId) => {
    clearInterval(timerId as ReturnType<typeof setInterval>)
})

export class Resource {
    _id?: string
    _url = shallowRef<ProxyUrl>(undefined as unknown as ProxyUrl)

    protected constructor(id: string | undefined, url: string) {
        this._id = id
        this._url.value = new ProxyUrl(url)

        // 设置定时更新
        if (!this._id) return
        if (!runtimeData.nowAdapter?.getResource) return
        const selfRef = new WeakRef(this)
        const interval = setInterval(async () => {
            const self = selfRef.deref()
            if (!self) return clearInterval(interval)
            if (!runtimeData.nowAdapter?.getResource) return
            const newUrl = await runtimeData.nowAdapter.getResource(this._id as string)
            if (!newUrl) return
            this._url.value = new ProxyUrl(newUrl)
        }, 30 * 60 * 1000)
        timerRegistry.register(this, interval)
    }

    /**
     * 通过资源id创建
     * 适配器不支持获取资源时url为空字符串
     * @param id
     * @returns
     */
    static async fromId(id: string): Promise<Resource> {
        if (!runtimeData.nowAdapter?.getResource) return new Resource(id, '')
        const url = await runtimeData.nowAdapter.getResource(id)
        if (!url) return new Resource(id, '')
        return markRaw(new Resource(id, url))
    }

    /**
     * 通过资源url创建
     * @param url
     * @param id
     * @returns
     */
    static fromUrl(url: string, id?: string): Resource {
        return markRaw(new Resource(id, url))
    }

    get url(): string {
        return this._url.value.url
    }

    get proxyUrl(): ProxyUrl {
        return this._url.value
    }

    get rawUrl(): string {
        return this._url.value.raw
    }
}
