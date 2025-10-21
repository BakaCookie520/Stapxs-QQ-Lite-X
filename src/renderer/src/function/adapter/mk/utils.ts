import app from '@renderer/main'
import { Gender, Role } from '../enmu'
import { SenderData } from '../interface'

export function $t(value: string): string {
    return app.config.globalProperties.$t(value)
}

/**
 * 获取性别
 * @param sex 性别字符串
 * @returns
 */
export function getGender(sex: 'male' | 'female' | 'unknown'): Gender {
    switch (sex) {
        case 'male': return Gender.Male
        case 'female': return Gender.Female
        case 'unknown': return Gender.Unknown
    }
}

/**
 * 获取角色
 * @param role 角色
 */
export function getRole(role: 'owner' | 'admin' | 'member'): Role {
    switch (role) {
        case 'owner': return Role.Owner
        case 'admin': return Role.Admin
        case 'member': return Role.User
    }
}

/**
 * 创建SenderData
 * @param user_id 用户ID
 * @param nickname 昵称
 */
export function createSender(user_id: number, nickname?: string): SenderData {
    if (!nickname) nickname = user_id.toString()
    return {
        id: user_id,
        nickname,
        sex: Gender.Unknown,
    }
}

/**
 * 文件转二进制文件
 * @param file
 * @returns
 */
export async function fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const binary = bytes.reduce((acc, byte) => acc + String.fromCodePoint(byte), '')
    return btoa(binary)
}
