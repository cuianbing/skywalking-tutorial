import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'SkyWalking 从零到一',
  description: '面向从未使用过 SkyWalking 的开发人员，从概念、环境搭建到程序接入与生产实践，一步一个脚印讲清楚。',

  // GitHub Pages 项目站点 base 路径
  base: '/skywalking-tutorial/',

  lang: 'zh-CN',
  // GitHub Pages 不支持无扩展名访问，保留默认（生成 .html）
  cleanUrls: false,
  lastUpdated: true,

  // 教程内出现的 http://localhost:8080 等仅为示例地址，不做死链校验
  ignoreDeadLinks: [/^https?:\/\/localhost/, /^https?:\/\/127\.0\.0\.1/],

  head: [
    ['link', { rel: 'icon', href: '/skywalking-tutorial/favicon.svg', type: 'image/svg+xml' }]
  ],

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '开始阅读', link: '/01-认识SkyWalking' },
      {
        text: '官方资源',
        items: [
          { text: '官方下载页', link: 'https://skywalking.apache.org/downloads' },
          { text: '官方文档', link: 'https://skywalking.apache.org/docs/#SkyWalkingAPM' },
          { text: 'GitHub', link: 'https://github.com/apache/skywalking' },
          { text: '中文博客', link: 'https://skywalking.apache.org/zh/blog/' }
        ]
      }
    ],

    sidebar: [
      {
        text: '系列教程',
        items: [
          { text: '第 1 篇 · 认识 SkyWalking', link: '/01-认识SkyWalking' },
          { text: '第 2 篇 · 搭建环境', link: '/02-搭建环境' },
          { text: '第 3 篇 · Java 应用接入', link: '/03-Java应用接入' },
          { text: '第 4 篇 · 进阶功能与生产实践', link: '/04-进阶功能与生产实践' },
          { text: '第 5 篇 · 多语言接入概览', link: '/05-多语言接入概览' }
        ]
      }
    ],

    outline: {
      label: '本页目录',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新于'
    },

    editLink: {
      pattern: 'https://github.com/cuianbing/skywalking-tutorial/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cuianbing/skywalking-tutorial' }
    ],

    footer: {
      message: '基于 Apache SkyWalking 10.4.0 编写，仅供学习交流。',
      copyright: 'Copyright © 2026 cuianbing'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
