# 第 3 篇 · Java 应用接入 SkyWalking

> 前提：第 2 篇的环境已搭好并验证（UI 能打开）。本篇将让两个真实的 Spring Boot 服务被 SkyWalking 监控起来：**全程不改一行业务代码**，只在启动参数上加一个 `-javaagent`。读完你将能在 UI 上看到拓扑图和完整调用链。

---

## 一、原理：javaagent 与字节码增强

SkyWalking Java 探针基于 JVM 的 **javaagent 机制**（Java 自带的能力，启动时通过 `-javaagent:xxx.jar` 挂载）：

1. JVM 启动时先加载 `skywalking-agent.jar`；
2. 探针在**类被加载前**拦截，按 `agent/plugins/` 里的插件规则，对匹配的类（Tomcat 的请求处理、Spring MVC 的 Controller、RestTemplate、MySQL 驱动、Redis 客户端……）做**字节码增强**——在原方法的前后插入"开始计时/结束计时/记录异常"的埋点代码；
3. 埋点产生的 Span 在线程内组装成 Segment，跨服务时通过 HTTP 头（`sw8`）等载体自动传递上下文；
4. 探针异步批量把数据通过 **gRPC 上报到 OAP 的 11800 端口**。

因为是运行时字节码增强：

- **业务代码零侵入**——不加依赖、不加注解、不改配置（除非要用进阶功能）；
- **自动埋点的覆盖面取决于 plugins 目录里装了哪些插件**——常用框架基本都覆盖（见第六节）；
- 带来的性能开销很低，但高并发场景建议按第 4 篇配置采样。

## 二、准备两个演示服务

我们造一个最小双服务链路：`service-a`（订单）调用 `service-b`（库存），两个都是普通 Spring Boot 工程。用 Spring Boot 2.7.x（JDK 8 / 11 / 17 都能跑）。

### 2.1 service-a

`pom.xml` 关键依赖：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.7.18</version>
</parent>
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

`src/main/resources/application.yml`：

```yaml
server:
  port: 8081          # 注意避开 SkyWalking UI 的 8080
spring:
  application:
    name: service-a
```

`OrderController.java`：

```java
package com.demo.servicea;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
public class OrderController {

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/order/pay")
    public String pay(@RequestParam("orderId") String orderId) throws InterruptedException {
        // 模拟下单业务逻辑耗时
        Thread.sleep(50);
        // 调用下游服务 service-b 扣库存（Exit Span 将在这里产生）
        String result = restTemplate.getForObject(
                "http://127.0.0.1:8082/stock/deduct?orderId=" + orderId, String.class);
        return "order[" + orderId + "] paid, stock: " + result;
    }
}
```

`SkywalkingDemoApplication.java`：

```java
package com.demo.servicea;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class SkywalkingDemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(SkywalkingDemoApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

### 2.2 service-b

`application.yml` 改为 `port: 8082`、`name: service-b`，包名与主类照搬改一下。控制器：

```java
package com.demo.serviceb;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StockController {

    @GetMapping("/stock/deduct")
    public String deduct(@RequestParam("orderId") String orderId,
                         @RequestParam(value = "fail", required = false) String fail)
            throws InterruptedException {
        Thread.sleep(200); // 模拟扣库存耗时
        if ("true".equals(fail)) {
            throw new RuntimeException("库存扣减失败，模拟业务异常");
        }
        return "deducted for " + orderId;
    }
}
```

> 故意留了一个 `?fail=true` 开关：稍后用它演示"链路上如何呈现错误"。

两个服务打包成 `service-a.jar` / `service-b.jar`（`mvn package`），放到任意目录（**路径里不要有中文和空格**）。

## 三、Java Agent 的获取与配置

### 3.1 获取 agent

两种方式任选：

- **方式一（推荐）**：单独下载最新 agent 包 `apache-skywalking-java-agent-9.8.0.tgz`（下载地址见第 2 篇），解压得到 `agent/` 目录；
- **方式二**：直接用 OAP 发行包里自带的 `agent/` 目录（`D:\skywalking\apache-skywalking-apm-bin\agent\`），它随 OAP 一起发布，版本可能略旧但完全够用。

> 建议 agent 放在**不含中文/空格**的路径，例如 `D:\skywalking\agent\`（Linux 例：`/opt/skywalking/agent`）。

### 3.2 agent.config：探针自己的配置

`agent/config/agent.config` 里最常用的几项（都用 `环境变量:默认值` 的写法，可用环境变量覆盖）：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `agent.service_name` | `Your_ApplicationName` | **服务名**，UI 顶层展示的名字。建议统一小写中划线，如 `order-service`；**用英文**，中文会显示成问号 |
| `collector.backend_service` | `127.0.0.1:11800` | **OAP 地址**。跨机部署时改成 OAP 服务器的 `IP:11800` |
| `agent.namespace` | 空 | 多套 SkyWalking 环境隔离用，学习可忽略 |
| `agent.sample_n_per_3_secs` | `-1` | 每 3 秒采样的链路条数，`-1` = 全采样 |
| `agent.ignore_suffix` | `.jpg,.js,.png...` | 忽略的请求后缀，不产生埋点 |

理论上改这一个文件就能接入，但**生产上更推荐通过 JVM 参数覆盖**（同一个 agent 目录可以服务多个应用，不用改文件）：

```bash
-Dskywalking.agent.service_name=xxx        # 覆盖 service_name
-Dskywalking.collector.backend_service=x.x.x.x:11800   # 覆盖 OAP 地址
```

`-D` 参数 > 环境变量 > agent.config 文件，优先级以此递减。

## 四、接入：两步完成

### 步骤 1：加 `-javaagent` 参数

启动命令里把 agent 挂上（**`-javaagent` 必须写在 `-jar` 之前**）：

```bash
# Windows CMD（^ 为换行续行符）
java -javaagent:D:\skywalking\agent\skywalking-agent.jar ^
     -Dskywalking.agent.service_name=service-a ^
     -Dskywalking.collector.backend_service=127.0.0.1:11800 ^
     -jar service-a.jar

# Linux
java -javaagent:/opt/skywalking/agent/skywalking-agent.jar \
     -Dskywalking.agent.service_name=service-a \
     -Dskywalking.collector.backend_service=127.0.0.1:11800 \
     -jar service-a.jar
```

service-b 同理，`service_name=service-b`。

**IDEA 里调试**：`Run/Debug Configurations → 选中应用 → Modify options → Add VM options`，在 *VM options* 里粘贴同样的两行（去掉外层命令）：

```text
-javaagent:D:\skywalking\agent\skywalking-agent.jar
-Dskywalking.agent.service_name=service-a
-Dskywalking.collector.backend_service=127.0.0.1:11800
```

> 老式 Tomcat 项目（war 包）：把参数写进 `bin/catalina.bat` 第一行
> `set "CATALINA_OPTS=-javaagent:... -Dskywalking.agent.service_name=..."`（Linux 写 `catalina.sh` 的 `CATALINA_OPTS`），再启动。

### 步骤 2：确认探针活着

启动后看两处日志：

1. **探针日志** `agent/logs/skywalking-api.log`：正常应无 ERROR；如果反复出现 `Connection refused` 指向 11800，说明 OAP 没起或地址/防火墙不通；
2. 应用启动无异常、接口能正常访问。

## 五、验证：在 UI 里看见你的服务

先制造一点流量（CMD / Linux 各自执行）：

```bash
curl "http://127.0.0.1:8081/order/pay?orderId=1001"
curl "http://127.0.0.1:8081/order/pay?orderId=1002"
curl "http://127.0.0.1:8081/order/pay?orderId=1003&fail=true"   # 最后一条故意失败
```

打开 **http://localhost:8080**：

1. **General Service → Service**：几秒后应出现 `service-a`、`service-b` 两个服务，带调用量/响应时间/SLA 指标曲线；
2. **Topology（拓扑图）**：应出现 `service-a → service-b` 的调用关系，边上标注 QPS/耗时/错误率；
3. **Trace（链路查询）**：能看到三条 Trace。点开第三条（失败的）：
   - Span 树：`POST /order/pay`（Entry）→ `RestTemplate/GET /stock/deduct`（Exit，标红）→ `POST /stock/deduct`（service-b 的 Entry，标红）；
   - 出错 Span 的 Tag 里有异常堆栈（`http.status_code=500`）；
   - 时间轴瀑布图显示每一段耗时（本例 `Thread.sleep` 的 200ms 一目了然）。

到这里，"给微服务装 CT 机"的目标已达成。之后接入更多服务，只是重复"加参数、改 service_name"。

## 六、自动埋点都覆盖了什么

`agent/plugins/` 里的插件开箱即用，覆盖包括但不限于：

| 分类 | 组件 |
| --- | --- |
| HTTP 服务端 | Tomcat / Jetty / Undertow / Spring MVC |
| RPC | Dubbo / gRPC / Motan / SofaRPC |
| HTTP 客户端 | RestTemplate / OpenFeign / HttpClient / OkHttp / WebClient |
| 数据库 | MySQL / PostgreSQL / Oracle JDBC 驱动、MyBatis、ShardingSphere |
| 缓存/NoSQL | Jedis / Lettuce / Redisson / MongoDB / Elasticsearch |
| 消息 | Kafka / RocketMQ / RabbitMQ / Pulsar |
| 注册/配置/网关 | Nacos / ZooKeeper / Spring Cloud Gateway（optional） |
| 可观测性 | 自动上报 JVM 指标（CPU / 堆 / GC / 线程） |

完整列表见官方文档 [Supported list](https://skywalking.apache.org/docs/skywalking-java/latest/en/setup/service-agent/java-agent/supported-list/)。注意：`optional-plugins/` 里的插件（如 Gson、Spring Cloud Gateway）**默认不生效**，把 jar 拷进 `plugins/` 才启用；`plugins/` 里删掉某个 jar 即停用对应插件。

## 七、排错速查表

| 现象 | 排查顺序 |
| --- | --- |
| UI 完全没有服务出现 | ① `agent/logs/skywalking-api.log` 有无 ERROR；② OAP 是否存活（11800 可 `telnet`）；③ `backend_service` 是否写对；④ 业务机器与 OAP 之间防火墙 |
| 服务名显示 `Your_ApplicationName` | 忘了配 `service_name`，或 `-D` 参数写在了 `-jar` 之后（VM 参数必须前置） |
| 有服务、没有链路 | 大概率链路被采样过滤（改过 `agent.sample_n_per_3_secs`），或访问的接口不在埋点范围（如静态资源后缀） |
| 服务名变问号 | service_name 用了中文，改英文 |
| `-javaagent` 报错找不到文件 | 路径含中文/空格，或 jar 名写错 |
| 探针日志正常但 UI 无数据 | 确认没开 `agent.namespace` 与 OAP 不一致的隔离；确认 OAP 所在机器没把 11800 只绑定在内网 |
| 应用启动变慢 | 首次加载插件增强的类会略慢，属正常；若明显异常，检查重复挂载 agent（`-javaagent` 写了两次） |

## 八、小结

- Java 接入 = **一个 `-javaagent` 参数 + 服务名 + OAP 地址**，零代码侵入；
- 探针日志在 `agent/logs/skywalking-api.log`，OAP 日志在 `logs/skywalking-oap-server.log`，两边对照排错最快；
- 服务名是 UI 的顶层维度，建议团队提前定好命名规范（`团队-系统-服务` 之类）；
- 自动埋点覆盖绝大多数中间件，特殊需求（自定义方法、异步线程）看第 4 篇。

---

*导航：[README](/) · 上一篇：[02-搭建环境](02-搭建环境.md) · 下一篇：[04-进阶功能与生产实践](04-进阶功能与生产实践.md)*
