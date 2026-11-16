# zkosemi cob

COB、测试车间与光引擎装配的交互式静态演示。

## 展示内容

- COB 车间：13 台独立设备、14 个区域。
- 测试车间：18 个功能区域。
- 光引擎装配：独立展项入口保留在 `optical-assembly/`。

设备内部结构、拆解动作、运行过程和指标均为模拟演示，不连接现场系统；结构示意不代表实际设备规格。

## GitHub Pages

网页入口：[COB 与测试车间交互展示](https://lukyim33.github.io/zkosemi-cob/)。

本仓库使用 GitHub Pages 从 `main` 分支根目录发布。提交更新后，由 GitHub Pages 部署网页。

运行文件位于仓库根目录，无需安装依赖或重新构建。未添加自定义 Actions 工作流。

## 文件入口

- `index.html`：COB / 测试车间演示。
- `optical-assembly/index.html`：光引擎装配演示。
- `.nojekyll`：按静态文件提供页面。

18 个运行文件来自已审核公开版，目录层级和相对路径保持不变。发布内容不含原始 PPT、原始形状数据、芯片车间资料或 Sites 项目标识。
