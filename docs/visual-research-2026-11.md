# COB 客户展厅：工业数字孪生视觉与导航参考

核对日期：2026-11-17。范围：官方产品资料、项目维护者的 GitHub 源码与许可证。本次只研究并写本文，未安装依赖、未运行候选库，也未修改应用代码。

## 结论

建议沿用当前 Three.js r180 和离线单文件交付，把提升集中在**设备材质、空间层次、清楚的选中反馈，以及“全景 → 工序 → 设备”的导览**。工业数字孪生案例最值得借鉴的是对象与信息对应、稳定导航和按需显示。光追、云协作和海量 CAD 平台不属于当前展厅的必要架构。

当前源码已经有 `RoomEnvironment + PMREM`、ACES、软阴影、正交相机、设备拆解及统一模拟时钟。因此第一阶段无需引入新的渲染库。以下建议是针对本项目的设计推导，不代表各平台原样采用同一界面，也不构成性能实测。

## 官方案例与可落实的借鉴

| 参考与已核对事实 | 对本展厅的具体建议 | 代价与边界 |
| --- | --- | --- |
| NVIDIA / BMW 的 FactoryExplorer 提供 Factory Filter、Navigation/Waypoint 等专用扩展，并整合厂房、设备与物流来源数据。[官方案例](https://www.nvidia.com/en-us/case-studies/bmw-group-develop/) | 设置有明确名称的导览视点；每站保存相机位置、目标和所选对象。进入工序时只突出相关设备，保留其余设备的低对比空间背景。每站说明一个工艺作用，用户手动操作立即结束巡览。 | 维护少量视点数据及状态恢复即可。案例依赖 Omniverse / OpenUSD 的工程体系，本项目只借鉴交互方法，不迁移其平台，也不据此声称拥有真实工厂仿真。 |
| Siemens 在 2025 年发布 Teamcenter Digital Reality Viewer，将 Omniverse 实时光追用于工程数据的材质、外观和环境评审。[产品说明](https://blogs.sw.siemens.com/teamcenter/introducing-teamcenter-digital-reality-viewer/)；2026 年仍在推进相关产品。[2026 官方公告](https://press.siemens.com/in/en/pressrelease/siemens-launches-teamcenter-digital-reality-viewer-and-digital-twin-composer-india) | 以喷涂机柜、金属导轨、深色工作腔、玻璃观察窗四类材质建立设备辨识度；保持受控的主光、补光及柔和环境反射。橙色只用于选中状态和关键操作部位。先用轮廓、接触阴影和少量可见机构提升结构感。 | 当前 WebGL 的 PBR 能表达这些层次。不得把实时光追品质或云 GPU 性能作为本机浏览器的承诺；没有照片/CAD时继续标注通用结构示意。 |
| Bentley iTwin 的 ViewDefinition 同时保存相机、显示模型、CategorySelector 与 DisplayStyle；视图可列出名称并附缩略图。[iTwin 官方视图文档](https://www.itwinjs.org/learning/frontend/views/) | 将“全景、工序聚焦、设备结构”实现为完整视图状态，不只移动相机。返回全景时恢复车间、筛选、标注和选中项；提供一键回到总览。小型平面定位图和三维共用对象 ID。 | 不需要接入 iTwin SDK。需要防止巡览、搜索、拆解、视图切换相互覆盖状态。文档中的视图系统是工程数据管理能力，本项目采用其信息组织思路。 |

建议的画面层级：全景看区域和布局；工序视图看少量设备和动作；设备视图看结构与一个解释重点。全景标注优先显示选中项和主要区域，其他名称在悬停或聚焦后显示。选中反馈使用底座边线、名称和侧栏一致的强调色，不用全场发光代替对象层级。

## Three.js r180 的开源候选与取舍

以下版本由官方仓库的版本标签核对；依赖声明覆盖 r180 只说明允许安装，不等于已在本项目通过验证。

| 项目 / 一手链接 | 用途、兼容性与许可证 | 性能和维护成本 / 建议 |
| --- | --- | --- |
| [Three.js r180](https://github.com/mrdoob/three.js/tree/r180)、[r180 package.json](https://github.com/mrdoob/three.js/blob/r180/package.json)、[MIT 许可证](https://github.com/mrdoob/three.js/blob/r180/LICENSE) | 主版本为 `0.180.0`。保留现有材质、PMREM、OrbitControls；复用几何和材质，重复静态部件按需使用 `InstancedMesh`。分发保留版权及许可文本。 | 与现有交付方式最一致。先优化模型可读性和实例复用；避免为了质感给每台设备增加独立阴影灯。官方 examples 中的外部素材应逐项核对授权，不能只凭 Three.js 的代码许可证搬运模型或 HDR。 |
| [r180 OutlinePass 示例源码](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_outline.html)、[r180 GTAO 示例源码](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_gtao.html) | Three.js 同版 addons，可参考选中轮廓和接触遮蔽。示例使用 `EffectComposer` 与 `OutputPass`；代码随 Three.js 的 MIT 许可。 | 后处理增加全屏缓冲和渲染步骤，成本随像素数量增加。当前已有选中边线，先保留；只有选中不清楚时才试 Outline。AO 优先作为设备近景的可关闭高画质项。引入时须同步 resize、相机和 dispose，并保持离线打包。 |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)、[v6.39.6 版本声明](https://github.com/pmndrs/postprocessing/blob/v6.39.6/package.json)、[Zlib 许可证](https://github.com/pmndrs/postprocessing/blob/v6.39.6/LICENSE.md) | `6.39.6` 声明 `three >=0.168.0 <0.188.0`，覆盖 r180。可组合抗锯齿、轮廓、AO 等效果；`EffectPass` 可合并适合的效果。Zlib 要求保留源代码许可声明、标明修改且不冒认原作者；项目也注明部分基础代码来自 MIT 的 Three.js。 | 只需一两项效果时优先原生 addons。若采用该库，应使用它的一套 composer，不把两家的 Pass 当成可直接互换。官方要求其流程用 renderer 的 `NoToneMapping`，再在末端做 ToneMappingEffect；直接叠到现有 ACES 会改变颜色链。高精度中间缓冲增加显存/带宽成本。 |
| [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)、[v0.9.18 版本声明](https://github.com/gkjohnson/three-mesh-bvh/blob/v0.9.18/package.json)、[MIT 许可证](https://github.com/gkjohnson/three-mesh-bvh/blob/v0.9.18/LICENSE) | `0.9.18` 声明 `three >=0.159.0`，覆盖 r180。适合未来高面数 CAD/glTF 的拾取和几何查询；保留版权及许可。 | 为几何构建 MeshBVH 需要时间和内存；顶点改变时需 refit 或重建。仅改变物体的位置/旋转不同于改顶点，适合刚性拆解。现有模型由大量低面数小物体组成，先用设备包围盒、候选对象筛选和实例复用；MeshBVH 不会自动消除这些物体的 draw calls。暂不引入。 |

## 按当前代码落实的顺序

1. **材质与灯光先行。** 在 `src/models.js` 统一上述材质族；在 `src/scene.js` 调整环境反射和阴影层次。屏幕、指示灯发光应弱于白色机柜的主体层次，设备近景避免看不清工作腔。依然保留程序化示意的身份。
2. **导览保存完整状态。** 以现有 `animateCamera` 为基础，预设全景与若干工序视点；保存 `room / selection / camera / target / span / labels / filter`。视点顺序以现有区域和说明内容组织，不能凭导览顺序虚构现场物料流程。
3. **减少常驻文字。** 全景先看布局；选中后再出现设备名、工序与动作说明。名称、底座强调和详情面板保持同一选中状态，保留键盘和“一键总览”。
4. **按实测升级。** 当前 DPR 已上限 1.5；这意味着同 CSS 尺寸下像素量约为 DPR 1 的 2.25 倍。先测现有阴影和模型，再决定 AO、后处理或 BVH。推荐以实际展厅机器达到 30 fps、常规交互争取 60 fps 作为验收目标，不将其写成当前已达到的结果。

一次针对性验证即可回答是否值得加依赖：在目标机器运行全线演示、选中设备、连续拆解/复位、切换车间和调整窗口，记录帧时间与 `renderer.info`；再断网双击构建产物核对字体、材质和操作。保留“模拟”标识；设备尺寸、洁净等级、温度、节拍、产能与真实路径均不能从参考案例推定。

本轮无需复制商业案例素材，无需新增运行依赖。优先把现有渲染与导航做扎实，后处理列为可选项，BVH 留待真实高面数资产进入后评估。
