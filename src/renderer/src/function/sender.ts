/*
 * @FileDescription: 消息发送模块
 * @Author: Stapxs
 * @Date:
 *      2022/10/20
 *      2022/12/12
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
 * @Description: 此模块包括消息发送相关的功能
 */

// 消息类型结构参考
// https://github.com/takayama-lily/oicq/blob/main/lib/message/elements.ts
// CQ Code 参考
// https://docs.go-cqhttp.org/cqcode/#%E8%BD%AC%E4%B9%89

import { Msg } from './model/msg'
import { ReplySeg, Seg, TxtSeg } from './model/seg'
import { runtimeData } from './msg'

/**
 * 反序列化消息
 * @param msg 带有 SQCode 标记的文本消息（也可以不带有）
 * @param cache 多媒体消息缓存列表
 * @param reply 回复消息对象
 * @returns 消息序列
 */
export function parseMsg(msg: string, cache: Seg[], reply?: Msg|string): Seg[] {
    // 处理消息
    let back = parseMsgToSegs(msg, cache)
    // 插入引用
    if (reply instanceof Msg) reply = reply.message_id
    if (reply) back = [new ReplySeg(reply), ...back]
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

/**
 * 获取字符串内的所有 SQCode
 * @param msg
 * @returns SQCode 字符串列表
 */
export function getSQList(msg: string) {
    const reg = /\[SQ:\d+\]/gm
    return msg.match(reg)
}

export default {
    parseMsg,
    getSQList,
}

// ========================================

/**
 * 将消息对象转为 JSON，这儿也会完成所有的发送前处理
 * @param msg
 * @param cache
 * @returns
 */
function parseMsgToSegs(msg: string, cache: Seg[]) {
    const back: Seg[] = []
    // 处理消息文本
    const specialList = getSQList(msg)
    if (specialList !== null) {
        specialList.forEach((item) => {
            const index = Number(
                item.replace('[', '').replace(']', '').split(':')[1],
            )
            const regCut = RegExp('^[^\\[]*\\[SQ:' + index + '\\]', 'g')
            // 处理内容
            const cutList = msg.match(regCut)
            if (cutList !== null) {
                const cutMsg = cutList[0].replace(item, '')
                // 添加前段文本
                if (cutMsg !== '') {
                    back.push(new TxtSeg(cutMsg))
                }
                // 添加后段特殊消息
                if (cache[index] !== null) {
                    back.push(cache[index])
                }
                // 去除内容
                msg = msg.replace(cutList[0], '')
            }
        })
    }
    if (msg !== '') {
        back.push(new TxtSeg(msg))
    }

    // 返回
    return back
}
