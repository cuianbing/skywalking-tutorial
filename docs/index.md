---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'SkyWalking 从零到一'
  text: '分布式链路追踪实战教程'
  tagline: 面向从未使用过 SkyWalking 的开发人员，从概念、环境搭建到程序接入与生产实践，一步一个脚印讲清楚。
  actions:
    - theme: brand
      text: 开始阅读 →
      link: /01-认识SkyWalking
    - theme: alt
      text: 官方文档
      link: https://skywalking.apache.org/docs/

features:
  - icon: 🔍
    title: 第 1 篇 · 认识 SkyWalking
    details: 是什么、为什么需要、架构组成、核心概念（Trace / Span / Segment）、与同类工具对比。
    link: /01-认识SkyWalking
    linkText: 阅读本篇
  - icon: 🛠️
    title: 第 2 篇 · 搭建环境
    details: Windows 本地直装 / Docker Compose / Linux 服务器三条路线，BanyanDB 存储配置，验证清单。
    link: /02-搭建环境
    linkText: 阅读本篇
  - icon: ☕
    title: 第 3 篇 · Java 应用接入
    details: javaagent 原理、Spring Boot 双服务实战、IDEA/命令行接入、UI 上验证链路、排错。
    link: /03-Java应用接入
    linkText: 阅读本篇
  - icon: 🚀
    title: 第 4 篇 · 进阶功能与生产实践
    details: UI 深入、自定义埋点（@Trace）、日志带 traceId、告警规则、采样、TTL、生产建议。
    link: /04-进阶功能与生产实践
    linkText: 阅读本篇
  - icon: 🌐
    title: 第 5 篇 · 多语言接入概览
    details: Node.js / Go / Python 接入、OpenTelemetry、Service Mesh、前端监控。
    link: /05-多语言接入概览
    linkText: 阅读本篇
---

## 版本约定（教程写作时点：2026 年 11 月）

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| OAP Server（apache-skywalking-apm） | **10.4.0** | 10.x 稳定线最后一版，**内置 Web UI**，新手体验最顺 |
| Java Agent（apache-skywalking-java-agent） | **9.8.0** | 支持 JDK 8 ~ 25；OAP 发行包内也自带 agent，可单独升级 |
| BanyanDB（默认存储） | **0.10.x** | 与 OAP 10.4.0 配套（API 版本 0.10）；**不要**用 0.11.x 配 10.4.0 |
| JDK（跑 OAP / UI） | 17（11/21/25 亦可） | 业务应用侧 JDK 8+ 均可接 agent |

::: warning 为什么不用最新的 11.x？
SkyWalking 11.0（2026-08 发布）起不再内置 Web UI，改为独立发布的 Horizon UI。新手用 10.x 学习成本最低，
且与网上绝大多数中文资料形态一致；11.x 的差异与升级注意事项见
[第 2 篇的「11.x 变化速览」](/02-搭建环境#九-11x-版本变化速览)。
:::

## 全系列约定

- Windows 示例统一把 SkyWalking 解压到 `D:\skywalking\`；Linux 示例统一放 `/opt/skywalking/`
- 演示应用为两个 Spring Boot 服务：`service-a`（8081）→ `service-b`（8082），注意避开 UI 的 8080
- 所有链接与版本号以[官方下载页](https://skywalking.apache.org/downloads)和[官方文档](https://skywalking.apache.org/docs/)为准
