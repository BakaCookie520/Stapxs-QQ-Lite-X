/*
 * @FileDescription: 数据结构相关模型
 * @Author: Mr.Lee
 * @Date: 2025/07/18
 * @Version: 1.0
 * @Description: 定义数据结构
 */

import pinyin from 'tiny-pinyin'
import {
    getTimeConfig,
    getTrueLang,
    getViewTime
} from '../utils/systemUtil'

export class TimeoutSet<T> {
    private data: Map<T, number> = new Map()
    private timeout: number

    constructor(timeout: number = 600) {
        this.timeout = timeout
    }

    add(item: T): void {
        if (this.data.has(item)) {
            throw new Error(`${item}重复存在`)
        }
        const rm = setTimeout(() => {
            this.data.delete(item)
        }, this.timeout)
        this.data.set(item, rm as unknown as number)
    }

    has(item: T): boolean {
        return this.data.has(item)
    }

    delete(item: T): boolean {
        if (!this.data.has(item)) return false
        clearTimeout(this.data.get(item) as unknown as number)
        return this.data.delete(item)
    }

    get length(): number {
        return this.data.size
    }
}

/**
 * 限制长度的通道
 */
export class Channel<T> {
    private data: T[] = []
    private size: number
    constructor(size: number = 10) {
        this.size = size
    }
    push(item: T): void {
        this.data.push(item)
        if (this.data.length > this.size) this.data.shift()
    }
    async pop(timeout: number=5): Promise<T | undefined> {
        let intervalId: ReturnType<typeof setInterval>
        let timeoutId: ReturnType<typeof setTimeout>
        return new Promise((resolve) => {
            timeoutId = setTimeout(()=>{
                clearInterval(intervalId)
                resolve(undefined)
            }, timeout * 1000)
            intervalId = setInterval(() => {
                if (this.data.length > 0) {
                    clearTimeout(timeoutId)
                    clearInterval(intervalId)
                    resolve(this.data.shift())
                }
            }, 100)
        })
    }
    clear(): void {
        this.data = []
    }
    get length(): number {
        return this.data.length
    }
    get maxLength(): number {
        return this.size
    }
}

export class URL {
    // SSL白名单,这些协议一定不是SSL协议,其他的看是不是s结尾,是的话就是采用ssl
    private static SSL_WHITE_LIST = ['ws']
    private _protocol: string = ''
    private _host: string = ''
    private _port: number | null = null
    private _path: string = ''
    private _query: Record<string, string> = {}
    private _hash: string = ''
    private _ssl: boolean = false

    constructor(url: string) {
        this.parse(url)
    }

    private parse(url: string): void {
        // 兼容所有环境的自定义 URL 解析
        // 正则解析协议
    const urlPattern = /^(\w+):\/\/([^/?#:]*)(?::(\d+))?([^?#]*)?(?:\?([^#]*))?(?:#(.*))?/
        const match = url.match(urlPattern)
        if (!match) {
            throw new Error(`无效的URL  ${url}`)
        }
        // match[1]: protocol, match[2]: host, match[3]: port, match[4]: path, match[5]: query, match[6]: hash
        this.parseProtocol(match[1] || '')
        this._host = match[2] || ''
        this._port = match[3] ? parseInt(match[3]) : null
        this._path = match[4] || ''
        this._hash = match[6] || ''
        this._query = {}
        if (match[5]) {
            match[5].split('&').forEach(pair => {
                const [key, value] = pair.split('=')
                if (key) this._query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
            })
        }
    }

    private parseProtocol(originProtocol: string): void {
        const protocol = originProtocol.replace(':', '')
        if (URL.SSL_WHITE_LIST.includes(protocol)) {
            this._ssl = false
            this._protocol = protocol
            return
        }

        if (protocol.endsWith('s')) {
            this._ssl = true
            this._protocol = protocol.slice(0, -1)
        } else {
            this._ssl = false
            this._protocol = protocol
        }
    }

    get protocol(): string {
        return this._protocol
    }

    get host(): string {
        return this._host
    }

    get port(): number | null {
        return this._port
    }

    get path(): string {
        return this._path
    }

    get hash(): string {
        return this._hash
    }

    get ssl(): boolean {
        return this._ssl
    }
}

/**
 * 包含拼音的名称类
 * 可以通过matchStr方法来匹配字符串
 * 支持中文、拼音、首字母等匹配方式
 * @extends String
 */
export class Name extends String {
    private _name!: string
    private _pinyinName!: string
    private _pinyinShort!: string
    private _pinyinHead!: string

    constructor(name: string) {
        super(name)
        this.resetContent(name)
    }

    private resetContent(newName: string): void {
        this._name = String(newName)
        this._pinyinName = pinyin.convertToPinyin(this._name, '', true).toLowerCase()
        this._pinyinShort = pinyin.convertToPinyin(this._name, '|||', true).
            toLowerCase().
            split('|||').
            map(item => item[0] ?? '').
            join('')
        this._pinyinHead = this._pinyinName[0]
    }

    matchStr(str: string): boolean {
        if (this._name.includes(str)) return true
        if (this._pinyinName.includes(str)) return true
        if (this._pinyinShort.includes(str)) return true
        if (this._pinyinHead.includes(str)) return true
        return false
    }

    get py(): string {
        return this._pinyinName
    }
}

/**
 * 对时间的封装
 * 自动进行 getViewTime 处理
 * 自带格式化方法
 */
export class Time {
    private _time: number

    constructor(time: number|string) {
        if (typeof time === 'string') this._time = new Date(time).getTime()
        else this._time = time
        this._time = getViewTime(this._time)
    }

    format(
        start:
          'year'
        | 'month'
        | 'week'
        | 'day'
        | 'hour'
        | 'minute'
        | 'second'
        | 'auto' = 'auto',
        end:
          'year'
        | 'month'
        | 'week'
        | 'day'
        | 'hour'
        | 'minute'
        | 'second'
        | 'auto' = 'auto'
    ): string {
        const lang = getTrueLang()
        let timeConfig: Intl.DateTimeFormatOptions = {}
        if (end === 'auto') end = 'minute'
        if (start === 'auto') timeConfig = getTimeConfig(new Date(this._time))
        else switch (start) {
            case 'year':
                timeConfig.year = 'numeric'
                if (end === 'year') break
            // eslint-disable-next-line no-fallthrough
            case 'month':
                timeConfig.month = '2-digit'
                if (end === 'month') break
            // eslint-disable-next-line no-fallthrough
            case 'week':
                if (start === 'week') timeConfig.weekday = 'short'
                if (end === 'week') break
            // eslint-disable-next-line no-fallthrough
            case 'day':
                timeConfig.day = '2-digit'
                if (end === 'day') break
            // eslint-disable-next-line no-fallthrough
            case 'hour':
                timeConfig.hour = 'numeric'
                if (end === 'hour') break
            // eslint-disable-next-line no-fallthrough
            case 'minute':
                timeConfig.minute = 'numeric'
                if (end === 'minute') break
            // eslint-disable-next-line no-fallthrough
            case 'second':
                timeConfig.second = 'numeric'
                break
        }
        return Intl.DateTimeFormat(lang, timeConfig).format(this._time)
    }

    get time(): number {
        return this._time
    }
}
