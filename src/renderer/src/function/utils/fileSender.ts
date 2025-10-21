import { i18n } from '@renderer/main'
import { GroupSession, Session, UserSession } from '../model/session'
import { Msg } from '../model/msg'
import { runtimeData } from '../msg'
import { PopInfo, PopType } from '../base'
import { noticePopBox } from './popBox'
import { TimeoutSet } from '../model/data'
import { GroupFileFolder } from '../model/file'
import { FileSegData } from '../adapter/interface'
import { FileSeg } from '../model/seg'

export class FileSender {
    private static lock: number = 0
    static readonly sendIds: TimeoutSet<string> = new TimeoutSet()

    static async sendFile(file: File, target: UserSession | GroupSession): Promise<undefined|Msg>
    static async sendFile(file: File, target: GroupSession, path?: GroupFileFolder): Promise<undefined|Msg>
    static async sendFile(file: File, target: Session, fold?: GroupFileFolder): Promise<undefined|Msg> {
        const $t = i18n.global.t

        // 检测
        if (target.type === 'temp') return
        if (!runtimeData.nowAdapter?.getHistoryMsg) {
            new PopInfo().add(PopType.ERR, $t('当前适配器不支持发送文件！'))
            return
        }

        if (target.type === 'group' && !runtimeData.nowAdapter?.sendGroupFile) {
            new PopInfo().add(PopType.ERR, $t('当前适配器不支持发送群文件！'))
            return
        }
        if (target.type === 'user' && !runtimeData.nowAdapter?.sendPrivateFile) {
            new PopInfo().add(PopType.ERR, $t('当前适配器不支持发送私聊文件！'))
            return
        }

        if (file.size > 50 * 1024 * 1024) {
            noticePopBox($t('不支持大于50MB的文件发送！'))
            return
        }

        // 发送文件
        this.lock++
        let re: string | undefined
        if (target.type === 'group') {
            re = await runtimeData.nowAdapter.sendGroupFile!(target as GroupSession, file, fold)
        } else {
            re = await runtimeData.nowAdapter.sendPrivateFile!(target as UserSession, file)
        }
        if (re) this.sendIds.add(re)
        this.lock--

        // 获取发送结果
        const retryTime = 5
        let head: undefined | Msg
        for (let i = 0; i < retryTime; i++) {
            const msgs = await runtimeData.nowAdapter.getHistoryMsg(target, 20, head)
            if (!msgs) continue

            for (const msg of msgs) {
                if (msg.message.length !== 1) continue
                if (msg.message[0].type !== 'file') continue
                const seg: FileSegData = msg.message[0] as FileSegData
                if (seg.file_id === re) return new Msg(msg)
            }

            head = new Msg(msgs[0])
        }

        return
    }

    /**
     * 锁，直到所有发送结束
     */
    static async waitSendLock(): Promise<void> {
        return new Promise((resolve) => {
            const check = () => {
                if (this.lock === 0) {
                    resolve()
                } else {
                    setTimeout(check, 100)
                }
            }
            check()
        })
    }

    /**
     * 判断该消息是否是自己发送的
     */
    static async isSendFile(msg: Msg): Promise<boolean> {
        if (msg.message.length !== 1) return false
        if (msg.message[0].type !== 'file') return false
        const seg: FileSeg = msg.message[0] as FileSeg
        const fileId = seg.file_id
        if (!fileId) return false
        await this.waitSendLock()
        if (this.sendIds.has(fileId)) {
            this.sendIds.delete(fileId)
            return true
        }
        return false
    }
}
