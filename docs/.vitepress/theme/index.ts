import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'vitepress-mermaid-renderer/css'

/** 跟随 VitePress 的明暗模式 */
const resolveMermaidTheme = (): 'default' | 'dark' =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'default'

/** 每张图的工具栏：缩放 / 重置 / 复制源码 / 全屏 / 下载 */
const toolbarOptions = {
  showLanguageLabel: false,
  downloadFormat: 'png' as const,
  fullscreenMode: 'dialog' as const,
  desktop: {
    zoomIn: 'enabled' as const,
    zoomOut: 'enabled' as const,
    resetView: 'enabled' as const,
    copyCode: 'enabled' as const,
    toggleFullscreen: 'enabled' as const,
    download: 'enabled' as const,
    toggleToolbar: 'enabled' as const,
    zoomLevel: 'enabled' as const,
    positions: { vertical: 'bottom' as const, horizontal: 'right' as const },
    collapsed: 'expanded' as const
  },
  mobile: {
    zoomIn: 'enabled' as const,
    zoomOut: 'enabled' as const,
    resetView: 'enabled' as const,
    copyCode: 'enabled' as const,
    toggleFullscreen: 'enabled' as const,
    download: 'enabled' as const,
    toggleToolbar: 'enabled' as const,
    zoomLevel: 'enabled' as const,
    positions: { vertical: 'bottom' as const, horizontal: 'right' as const },
    collapsed: 'expanded' as const
  },
  fullscreen: {
    zoomIn: 'enabled' as const,
    zoomOut: 'enabled' as const,
    resetView: 'enabled' as const,
    copyCode: 'enabled' as const,
    toggleFullscreen: 'enabled' as const,
    download: 'enabled' as const,
    toggleToolbar: 'enabled' as const,
    zoomLevel: 'enabled' as const,
    positions: { vertical: 'bottom' as const, horizontal: 'right' as const },
    collapsed: 'expanded' as const
  },
  i18n: {
    localeIndex: 'root',
    tooltips: {
      zoomIn: '放大',
      zoomOut: '缩小',
      resetView: '重置视图',
      copyCode: '复制源码',
      copyCodeCopied: '已复制',
      toggleFullscreen: '全屏查看',
      download: '下载图片',
      renderErrorText: '图表渲染失败',
      toggleErrorDetailsText: '查看详情',
      toggleErrorDetailsHideText: '收起详情',
      toggleToolbarExpand: '展开工具栏',
      toggleToolbarCollapse: '收起工具栏'
    }
  }
}

export default {
  extends: DefaultTheme,

  enhanceApp() {
    if (typeof window === 'undefined') return

    // mermaid 体积较大：异步加载，避免拖慢首屏；加载完成后自动接管页面内的 ```mermaid 代码块
    import('vitepress-mermaid-renderer')
      .then(({ createMermaidRenderer }) => {
        const renderer = createMermaidRenderer({
          startOnLoad: false,
          theme: resolveMermaidTheme(),
          securityLevel: 'loose',
          fontFamily: 'inherit',
          flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
          sequence: { useMaxWidth: false },
          gantt: { useMaxWidth: false },
          themeVariables: { fontSize: '15px' }
        })

        renderer?.setToolbar(toolbarOptions)

        // 明暗切换时按新主题重新渲染，避免深色页面里出现白底图表
        let lastTheme = resolveMermaidTheme()
        new MutationObserver(() => {
          const next = resolveMermaidTheme()
          if (next === lastTheme) return
          lastTheme = next
          renderer?.setConfig({ theme: next })
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      })
      .catch(() => {
        /* 图表库加载失败不影响正文阅读 */
      })
  }
} satisfies Theme
