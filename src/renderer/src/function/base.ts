/*
 * @FileDescription: 基础功能模块
 * @Author: Stapxs
 * @Date: 2022/10/20
 * @Version: 1.0
 * @Description: 此模块主要为程序相关的基础功能
 */

import { shallowReactive } from 'vue'
import { PopInfoElem } from './elements/system'
import Option from './option'

// =============== 日志 ===============

export enum LogType {
    WS,
    UI,
    ERR,
    INFO,
    DEBUG,
    SYSTEM,
    _GET,
    _PUT,
}

export class Logger {
    private logTypeInfo: [string, string][]

    constructor() {
        // 日志类型输出文本前缀样式，顺序对应 LogType
        this.logTypeInfo = [
            ['7abb7e', 'fff'],
            ['b573f7', 'fff'],
            ['ff5370', 'fff'],
            ['99b3db', 'fff'],
            ['677480', 'fff'],
            ['e5a5a9', 'fff'],
            ['357837ff', 'fff'],
            ['1765a5ff', 'fff'],
        ]
    }

    /**
     * 输出一条日志
     * @param mode 日志类型
     * @param args 日志内容
     */
    add(type: LogType, args: string, data = '' as any, hidden = false, deep = 0) {
        deep ++
        // PS：WS, UI, ERR, INFO, DEBUG
        // all 将会输出以上全部类型，debug 将会输出 DEBUG、UI，info 将会输出 INFO，err 将会输出 ERR
        // api 通信不受这个控制,受api_log控制
        if (!this.normallyContditionCheck(type)) return
        this.print(type, args, data, hidden, deep)
    }
    info(args: string, hidden = false, deep = 0) {
        deep ++
        this.add(LogType.INFO, args, undefined, hidden, deep)
    }
    error(e: Error | null, args: string, hidden = false, deep = 0) {
        deep ++
        if (e) {
            this.add(LogType.ERR, args + '\n', e, hidden, deep)
        } else {
            this.add(LogType.ERR, args, undefined, hidden, deep)
        }
    }
    debug(args: string, hidden = false, deep = 0) {
        deep ++
        this.add(LogType.DEBUG, args, undefined, hidden, deep)
    }
    system(args: string, deep = 0) {
        deep ++
        this.add(LogType.SYSTEM, args, undefined, true, deep)
    }
    get(api: string, data: any, deep = 0) {
        if (!this.apiConditionCheck(api)) return
        return this.add(LogType._GET, 'GET|' + api, data, false, deep)
    }
    put(api: string, params: any, deep = 0) {
        if (!this.apiConditionCheck(api)) return
        this.add(LogType._PUT, 'PUT|' + api, params, false, deep)
    }
    private normallyContditionCheck(type: LogType): boolean {
        const logLevel = Option.get('log_level')
        if (type === LogType._GET || type === LogType._PUT) return true
        if (logLevel === 'all') return true
        if (logLevel === 'debug' && (type === LogType.DEBUG || type === LogType.UI)) return true
        if (logLevel === 'info' && type === LogType.INFO) return true
        if (logLevel === 'err' && type === LogType.ERR) return true
        if (import.meta.env.MODE === 'development' && type === LogType.SYSTEM) return true
        return false

    }
    private apiConditionCheck(api: string): boolean {
        let api_log = Option.get('api_log')?.trim()
        if (!api_log) return false
        if (api_log === 'all') return true
        api_log = api_log.split(',').map((e: string) => e.trim())
        return api_log.includes(api)
    }
    /**
     * 打印一条日志
     * @param type 日志类型
     * @param args 日志内容
     * @param data 附加数据
     * @param hidden 是否隐藏日志（不显示调用者信息）
     * @param deep 调用深度（用于获取调用者信息）
     * @private
     */
    private print(type: LogType, args: string, data: any, hidden: boolean, deep: number) {
        deep ++
        const error = new Error()
        // 浏览器类型，用于判断是不是 webkit
        let isWebkit = /webkit/i.test(navigator.userAgent)
        if(window.electron != undefined) {
            // electron 是 chrome，但是 userAgent 里面含有 webkit 字样
            isWebkit = false
        }
        // 从调用栈中获取调用者信息
        let from = undefined as string | undefined
        const stack = error.stack?.split('\n').at(deep)
        if (stack) {
            if (isWebkit ? stack.startsWith('@') : !stack.includes('at Logger')) {
                // 取出链接部分，去除括号
                from = stack.replace(/\(|\)/g, '').split(' ').pop() || ''
                from = from.replace(
                    'webpack-internal:///./',
                    'webpack-internal:///',
                )
                if (from.startsWith('@')) {
                    from = from.substring(1)
                }
                if (from.startsWith('webpack-internal:///node_modules')) {
                    from = undefined
                }

                // zen(基于火狐)拿出来的东西和上面的不一样,我不知道上面的啥意思
                // 下面的是我针对火狐的删连接的代码
                // 火狐的原始格式:onclose @http://localhost:8080/src/function/connect.ts?t=1753012335169:220:12
                //   -- by Mr.Lee
                if (from) {
                    from = from.replace(`${window.location.origin}/`, '')
                        .replace(/\?t=\d+:/, ' ')
                        .replace('/', '.')
                }
            }
        }
        // 打印日志
        let typeStr = LogType[type]
        // 更换WS收发的样式,from参数
        if (typeStr === 'WS') {
            if (args.startsWith('GET')) {
                type = LogType._GET
            } else if (args.startsWith('PUT')) {
                type = LogType._PUT
            }
        }
        if (type === LogType._GET) {
            typeStr = '<<<'
            if (args.startsWith('GET|')) {
                from = args.replace('GET|', '')
                args = ''
            }
        }else if (type === LogType._PUT) {
            typeStr = '>>>'
            if (args.startsWith('PUT|')){
                from = args.replace('PUT|', '')
                args = ''
            }
        }

        // 如果存在 vconsole 就不打印带 css 样式的日志（它不支持）
        // 因为在 capturer 下 from 是无意义的，所以也不显示
        if (document.getElementById('__vconsole')) {
            const { message } = this.buildLogParams(typeStr, args, hidden, type)
            this.logOutput(message.replaceAll('%c', ' | '), [], data, false)
        } else {
            const { message, styles } = this.buildLogParams(typeStr, args, hidden, type, from)
            this.logOutput(message, styles, data)
        }
    }

    private buildLogParams(
        typeStr: string,
        args: string,
        hidden: boolean,
        type: LogType,
        from?: string
    ): { message: string; styles: string[] } {
        const hasFrom = !hidden && from
        if (hasFrom) {
            return {
                message: `%c${typeStr}%c${from}%c\n${args}`,
                styles: [
                    `background:#${this.logTypeInfo[type][0]};color:#${this.logTypeInfo[type][1]};border-radius:7px 0 0 7px;padding:2px 4px 2px 7px;margin-bottom:7px;`,
                    'background:#e3e8ec;color:#000;padding:2px 7px 4px 4px;border-radius:0 7px 7px 0;margin-bottom:7px;',
                    ''
                ]
            }
        } else {
            return {
                message: `%c${typeStr}%c ${args}`,
                styles: [
                    `background:#${this.logTypeInfo[type][0]};color:#${this.logTypeInfo[type][1]};border-radius:7px;padding:2px 4px 2px 7px;margin-bottom:7px;`,
                    '',
                    ''
                ]
            }
        }
    }

    private logOutput(message: string, styles: string[], data: any, useStyles = true) {
        if (!data) data = ''
        if (useStyles) {
            // eslint-disable-next-line no-console
            console.log(message, ...styles, data)
        } else {
            // eslint-disable-next-line no-console
            console.log(message, data)
        }
    }
}

// =============== 系统消息 ===============

export enum PopType {
    INFO = 'circle-info',
    ERR = 'circle-exclamation',
}

export class PopInfo {
    /**
     *
     * @param typeInfo 消息类型
     * @param args 消息内容
     * @param isAutoClose 是否自动关闭（默认为 true）
     */
    add(icon: PopType, args: string, isAutoClose = true) {
        const data: PopInfoElem = {
            id: popList.length,
            svg: icon,
            text: args,
            autoClose: isAutoClose,
        }
        popList.splice(popList.length, 0, data)
        // 创建定时器
        if (data.autoClose) {
            setTimeout(() => {
                this.remove(data.id)
            }, 5000)
        }
    }

    /**
     * 移除一条消息
     * @param id 消息编号
     */
    remove(id: number) {
        const index = popList.findIndex((item) => {
            return item.id === id
        })
        if (index !== -1) {
            popList.splice(index, 1)
        }
    }

    /**
     * 清空所有消息
     */
    clear() {
        // 因为消息是有动画的，所以需要延迟清空
        setTimeout(() => {
            popList.splice(0, popList.length)
        }, 300)
    }
}

export const popList: PopInfoElem[] = shallowReactive([])
