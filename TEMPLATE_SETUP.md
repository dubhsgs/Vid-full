# 证书模板设置说明

## 如何添加证书背景模板

请将您的参考图片（VID.jpg）保存为：

```
/tmp/cc-agent/64519110/project/public/certificate-template.jpg
```

或者通过命令行：

```bash
cp VID.jpg /tmp/cc-agent/64519110/project/public/certificate-template.jpg
```

## 模板系统说明

新的 VIDCard 组件使用了"图层系统"实现：

1. **底图层**：您的参考图片作为 `background-image` 完整覆盖容器
2. **头像层**：用户头像精确定位在左侧圆形区域（12.8% left, 36.5% top）
3. **文字层**：所有动态数据使用绝对定位叠加在右侧信息区域

## 坐标定位

所有位置使用百分比定位，确保响应式适配：

- **容器**：16:9 宽高比（1440px × 810px）
- **头像圆形遮罩**：左侧 12.8%，顶部 36.5%，宽度 16.2%
- **信息区域**：左侧 48.5%，顶部 28.5%，宽度 45%
- **HASH 信息**：右侧 5.5%，底部 9.5%

## 响应式设计

使用 `clamp()` 确保文字在不同屏幕尺寸下都能正确显示：

- 标签文字：`clamp(10px, 1.1vw, 16px)`
- 主要数值：`clamp(24px, 3.5vw, 50px)`
- 次要数值：`clamp(22px, 3.2vw, 46px)`
- HASH 文字：`clamp(6px, 0.65vw, 9px)`
