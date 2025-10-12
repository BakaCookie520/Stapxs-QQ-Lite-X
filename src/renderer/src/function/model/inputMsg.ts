/*
 * @FileDescription: 输入消息模块
 * @Author: Mr.Lee
 * @Date:
 *      2025/10/6
 * @Description: 用于处理用户输入消息
 */
import { shallowRef, shallowReactive, computed } from 'vue'
import { Msg } from './msg'
import { ImgSeg, ReplySeg, Seg, TxtSeg } from './seg'
import { autoMarkRaw } from './utils'
import app from '@renderer/main'
import { runtimeData } from '../msg'

@autoMarkRaw
export class InputMsg {
    private readonly _reply = shallowRef<Msg | undefined>()
    private readonly _content = shallowRef<string>('')
    private readonly _isVoid = computed<boolean>(()=>{
        if (this.reply) return false
        return this.content.trim().length === 0
    })
    private readonly _sqList = computed(()=>{
        const reg = /\[SQ:\d+\]/gm
        return this.content.match(reg) || []
    })
    readonly sqCache = shallowReactive<Seg[]>([])
    readonly imgCache = shallowReactive<Map<number, string>>(new Map())

    /**
     * 设置当前回复消息
     * @param msg
     */
    setReply(msg: Msg) {
        this._reply.value = msg
    }
    /**
     * 移除当前回复消息
     */
    rmReply() {
        this._reply.value = undefined
    }
    /**
     * 添加一个特殊消息段
     * @param seg
     */
    addSq(seg: Seg): number {
        const id = this.sqCache.length
        this.sqCache.push(seg)
        this.content += `[SQ:${id}]`
        return id
    }

    /**
     * 添加一个图片
     * @param dataurl
     */
    addImg(dataurl: string): number {
        const $t = app.config.globalProperties.$t
        const data = new TxtSeg('[' + $t('图片') + ']')
        const id = this.addSq(data)
        this.imgCache.set(id, dataurl)
        return id
    }

    /**
     * 移除一张图片
     * @param index
     */
    rmImg(index: number): void {
        this.imgCache.delete(index)
        this.content = this.content.replace(`[SQ:${index}]`, '')
    }

    /**
     * 渲染出消息序列
     */
    render(): Seg[] {
        // 解析图片
        for (const [key, base64data] of this.imgCache) {
            this.sqCache[key] = new ImgSeg(
                'base64://' +
                base64data.substring(
                    base64data.indexOf('base64,') + 7,
                    base64data.length
                )
            )
        }
        // 解析消息
        let back = this.parseMsgToSegs()
        // 插入引用
        if (this.reply?.message_id) back = [new ReplySeg(this.reply.message_id), ...back]
        // 插入小尾巴
        if (runtimeData.sysConfig.msg_taill) {
            const taill = (runtimeData.sysConfig.msg_taill as string).replaceAll(
                '\\n',
                '\n',
            )
            if (taill && taill != '') {
                for (let i = back.length - 1; i >= 0; i--) {
                    const seg = back[i]
                    if (seg instanceof TxtSeg) {
                        seg.text += taill
                        break
                    }
                }
            }
        }
        return back
    }

    clear(): void {
        this._content.value = ''
        this.sqCache.length = 0
        this.imgCache.clear()
        this.rmReply()
    }

    /**
     * 输入文本内容
     */
    get content(): string {
        return this._content.value
    }
    /**
     * 输入文本内容
     */
    set content(val: string) {
        this._content.value = val
    }

    /**
     * 获取当前回复消息
     */
    get reply(): Msg | undefined {
        return this._reply.value
    }

    /**
     * 当前消息内的 SQCode 列表
     */
    get sqList(): string[] {
        return this._sqList.value
    }

    /**
     * 当前输入内容是否为空
     */
    get isVoid(): boolean {
        return this._isVoid.value
    }

    /**
     * 当前输入内容的行数
     */
    get lines(): number {
        return this.content.split('\n').length
    }

    /**
     * 将消息对象转为 JSON，这儿也会完成所有的发送前处理
     * @param msg
     * @param cache
     * @returns
     */
    private parseMsgToSegs(): Seg[] {
        const back: Seg[] = []
        let msg = this.content
        // 处理消息文本
        for (const sq of this.sqList) {
            const index = Number(
                sq.replace('[SQ:', '').replace(']', ''),
            )
            const regCut = RegExp('^[^\\[]*\\[SQ:' + index + '\\]', 'g')
            // 处理内容
            const cutList = regCut.exec(msg)
            if (cutList !== null) {
                const cutMsg = cutList[0].replace(sq, '')
                // 添加前段文本
                if (cutMsg !== '') {
                    back.push(new TxtSeg(cutMsg))
                }
                // 添加后段特殊消息
                if (this.sqCache.at(index)) back.push(this.sqCache.at(index)!)
                // 去除内容
                msg = msg.replace(cutList[0], '')
            }
        }
        if (msg !== '') {
            back.push(new TxtSeg(msg))
        }

        // 返回
        return back
    }
}
