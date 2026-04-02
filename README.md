# cloudflare_temp_email_worker

这是一个基于 [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) 后端进行魔改后的 `worker.js` 包。

## 这是什么

这个仓库不包含完整项目源码，也不是完整部署包。
它的用途很简单：

- 先按原项目教程部署好 `cloudflare_temp_email`
- 保留你原来的 D1、KV、环境变量、前端等配置
- 然后把原项目后端 Worker 替换成这里提供的魔改版 `worker.js`

## 适用场景

适合已经部署或准备部署原版 `cloudflare_temp_email`，但希望后端支持：

- 根域配置
- 自动接受该根域下的泛子域邮箱

例如当你配置根域：

```json
["example.com"]
```

后端将支持：

- `example.com`
- `a.example.com`
- `b.example.com`
- `x.y.example.com`

注意：这里的意思是**后端域名校验支持泛子域**。

## 使用方法

### 第一步：先部署原项目

请先参考原项目文档完成完整部署：

- GitHub 项目：<https://github.com/dreamhunter2333/cloudflare_temp_email>
- 原项目文档：<https://temp-mail-docs.awsl.uk>

你需要先把这些内容部署好：

- 前端
- Cloudflare Worker
- D1
- KV
- 环境变量
- 其它你自己的 Cloudflare 配置

### 第二步：确认环境变量

这个魔改版：
- 不要写 `*.` 通配符格式

正确示例：

```json
["12313123.eu.cc"]
```

不建议这样写：

```json
["*.12313123.eu.cc"]
```

配置根域后，后端会自动接受该根域及其所有子域。

### 第三步：替换 Worker 后端代码

在你原本已经部署好的 `cloudflare_temp_email` Worker 中：

1. 打开 Cloudflare Workers 控制台
2. 找到原项目对应的 Worker
3. 进入代码编辑界面
4. 用本仓库中的 `worker.js` 替换原有 Worker 代码
5. 保存并重新部署

## 说明

- 这是对原项目后端 Worker 的魔改版本
- 主要修改的是后端域名校验逻辑
- 前端默认界面如果还是只显示根域，这是正常的；该魔改主要是后端支持泛子域

## 已知说明

- 前端如果没有额外修改，默认仍可能只允许通过界面选择根域
- 如需测试泛子域，可直接调用后端创建地址接口并传入子域
- Cloudflare 路由是否能真正把子域邮件投递进来，不属于这个 `worker.js` 本身负责的范围

## 致谢

本魔改基于原项目：

- <https://github.com/dreamhunter2333/cloudflare_temp_email>
