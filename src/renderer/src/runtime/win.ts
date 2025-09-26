import horizontalStyles from '@renderer/assets/css/append/mobile/append_mobile_horizontal.css?raw'
import verticalCss from '@renderer/assets/css/append/mobile/append_mobile_vertical.css?raw'
import { Logger } from '@renderer/function/base'
import { runtimeData } from '@renderer/function/msg'
import option from '@renderer/function/option'
import { computed, ComputedRef, shallowRef, watchEffect, markRaw } from 'vue'
import { backend } from './backend'

export type WinAction = 'maximize' | 'minimize' | 'unmaximize' | 'close'

const win = markRaw({
    _isTiling: undefined as any as ComputedRef<boolean>,
    _isMaximized: shallowRef(false),
    _needBar: undefined as any as ComputedRef<boolean>,
    _needMargin: undefined as any as ComputedRef<boolean>,

    _forceTilingState: shallowRef<undefined|boolean>(),

    hasInit: false,

    TILING_WMS: [
        'i3',
        'sway',
        'bspwm',
        'awesome',
        'herbstluftwm',
        'hyprland'
    ],

    /**
     * 初始化
     */
    async init() {
        const logger = new Logger()

        // computed 初始化
        this._needBar = computed(()=>{
            if (backend.isWeb()) return false
            return !win.tiling
        })
        this._needMargin = computed(()=>{
            if (backend.isWeb()) return false
            if (win.tiling) return false
            return !win.maximized
        })
        this._isTiling = computed(()=>{
            if (backend.platform !== 'linux') return false
            return this.TILING_WMS.indexOf(backend.de || '') >= 0
        })

        // 最大化检测
        backend.addListener(undefined, 'win:maximizedChanged',
            (_, data) => win.maximized = data
        )
		win.maximized = await backend.call(undefined, 'win:isMaximized', true)
        // 添加样式
        await this.loadAppendStyle()
        watchEffect(()=>{
            if (win.margin)
                document.body.classList.add('margin')
            else
                document.body.classList.remove('margin')

            if (win.withBar)
                document.body.classList.add('with-bar')
            else
                document.body.classList.remove('with-bar')
        })
        // 安全区域规划
        document.body.style.setProperty('--safe-area-bottom',
            (option.get('fs_adaptation') > 0 ? option.get('fs_adaptation') : 0) + 'px')
        document.body.style.setProperty('--safe-area-top', '0')
        document.body.style.setProperty('--safe-area-left', '0')
        document.body.style.setProperty('--safe-area-right', '0')
        // Capacitor：移动端初始化安全区域
        if (backend.isMobile()) {
            const safeArea = await backend.call('SafeArea', 'getSafeArea', true)
            if (safeArea) {
                logger.debug('安全区域：', safeArea)
                document.body.style.setProperty('--safe-area-top', safeArea.top + 'px')
                document.body.style.setProperty('--safe-area-bottom', safeArea.bottom + 'px')
                document.body.style.setProperty('--safe-area-left', safeArea.left + 'px')
                document.body.style.setProperty('--safe-area-right', safeArea.right + 'px')
            }
        }

        this.hasInit = true
    },

    /**
     * 窗口最小化
     */
    minimize() {
        this.control('minimize')
    },

    /**
     * 切换最大化
     */
    switchMaximize() {
        this.control(this.maximized ? 'unmaximize' : 'maximize')
    },

    /**
     * 关闭窗口
     */
    close() {
        this.control('close')
    },

    /**
     * 操控窗口
     * @param action
     */
    control(action: WinAction) {
        backend.call(undefined, `win:${action}`, false)
    },

    async loadAppendStyle() {
        const platform = backend.platform
        const logger = new Logger()
        logger.info('正在装载补充样式……')
        // UI 2.0 附加样式
        if (backend.isDesktop()) {
            await import('@renderer/assets/css/append/append_new.css')
            logger.info('UI 2.0 附加样式加载完成')
        }

        if(platform != undefined) {
            try {
                await import(`@renderer/assets/css/append/append_${platform}.css`)
                logger.info(`${platform} 平台附加样式加载完成`)
            } catch (error) {
                logger.info('未找到对应平台的附加样式：' + platform)
            }
        }

        // 添加手机端样式
        const updateCss = (appendCss = '') => {
            const cssStyle = document.getElementById('mobile-css')

            const width = window.innerWidth
            const height = window.innerHeight
            if(cssStyle) {
                if(width > 600) {
                    cssStyle.innerHTML = (width > height ? horizontalStyles : (horizontalStyles + verticalCss)) + appendCss
                } else {
                    cssStyle.innerHTML = horizontalStyles + verticalCss + appendCss
                }
            }

            if(backend.isDesktop()) {
                backend.call(undefined, 'win:maximize', false)
                const topBar = document.getElementsByClassName('top-bar')[0] as HTMLElement
                if(topBar) {
                    topBar.style.display = 'none'
                }
            }
        }
        if(backend.isMobile()) {
            const styleTag = document.createElement('style')
            styleTag.id = 'mobile-css'
            document.head.appendChild(styleTag)
            updateCss()
            // 屏幕旋转事件处理
            window.addEventListener('resize', () => {
                updateCss()
            })
        }

        await import('@renderer/assets/css/append/append_vibrancy.css')
        if (backend.platform === 'linux')
            await import('@renderer/assets/css/append/append_linux_vibrancy.css')
        new Logger().info('透明 UI 附加样式加载完成')

        if (runtimeData.sysConfig.vibrancy) this.useVibrancy()
    },

    /**
     * 添加透明效果
     */
    useVibrancy() {
        if (runtimeData.tags.vibrancy) return
        document.body.classList.add('vibrancy')
        runtimeData.tags.vibrancy = true
        new Logger().info('透明 UI 附加样式启用')
    },
    /**
     * 移除透明效果
     */
    removeVibrancy() {
        if (!runtimeData.tags.vibrancy) return
        document.body.classList.remove('vibrancy')
        runtimeData.tags.vibrancy = false
        new Logger().info('已移除透明 UI 效果禁用')
    },

    async supportVibrancyCheck(): Promise<boolean> {
        // 透明 UI 附加样式
        if (!backend.isDesktop()) return false
        let subVersion = backend.release?.split(' ')?.[1]?.split('.') as any
        subVersion = subVersion ? Number(subVersion[2]) : 0

        // mac
        if (backend.platform == 'darwin') return true

        // windows 10 20H1 以上
        if (backend.platform == 'win32' && subVersion > 22621) return true

        // linux 一大帮自
        if (backend.de === 'hyprland') return true
        if (backend.de === 'gnome') {
            const gnomeExtInfo = await backend.call(undefined, 'sys:getGnomeExt', true)
            if (gnomeExtInfo) {
                const info = await gnomeExtInfo
                if (
                    info['enable-all'] == 'true' ||
                    (
                        info['whitelist'] != undefined &&
                        info['whitelist'].indexOf('stapxs-qq-lite') > 0
                    )
                ) {
                    return true
                }
            }
        }

        return false
    },

    /**
     * 是否为平铺桌面
     */
    get tiling() {
        if (this._forceTilingState.value !== undefined)
            return this._forceTilingState.value
        return this._isTiling.value
    },

    /**
     * 是否为最大化
     */
    get maximized() {
        return this._isMaximized.value
    },

    set maximized(value) {
        this._isMaximized.value = value
    },

    get withBar() {
        return this._needBar.value
    },

    get margin() {
        return this._needMargin.value
    },
})

export default win
