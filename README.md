# MPX 模板语法解析器

一个用于解析 MPX 模板语法的 TypeScript 解析器，支持 MPX 框架的所有核心模板功能。

## 功能特性

- ✅ **元素解析**: 支持 HTML 元素和自定义组件
- ✅ **属性解析**: 普通属性和动态属性
- ✅ **指令解析**: wx:if、wx:for、wx:model、bindtap 等 MPX 指令
- ✅ **文本节点**: 支持插值表达式 `{{ }}`
- ✅ **注释解析**: HTML 注释
- ✅ **自闭合标签**: `<input />` 等自闭合元素
- ✅ **嵌套结构**: 完整的 DOM 树结构
- ✅ **位置信息**: 每个节点的行列位置
- ✅ **错误处理**: 详细的解析错误和警告
- ✅ **AST 遍历**: 提供遍历器访问所有节点
- 🆕 **Monaco Editor**: 专业的代码编辑器，支持语法高亮
- 🆕 **MPX 到 Vue 转换**: 自动将 MPX 模板转换为 Vue 模板
- 🆕 **三列布局**: MPX 输入、Vue 输出、解析结果三列展示
- 🆕 **实时转换**: 支持实时预览转换结果

## 使用方法

### 基本使用

```typescript
import { mpxTemplateParser } from './src/mpxTemplateParser';

// 解析 MPX 模板
const template = `
<template>
  <view class="container" wx:if="{{ isVisible }}">
    <text bindtap="handleClick">{{ message }}</text>
  </view>
</template>
`;

const result = mpxTemplateParser.parseMpxTemplate(template);

// 查看 AST
console.log('AST:', result.ast);

// 查看错误
if (result.errors.length > 0) {
  console.log('错误:', result.errors);
}
```

### AST 遍历

```typescript
// 遍历 AST 节点
mpxTemplateParser.traverse(result.ast, {
  enter(node, parent) {
    console.log(`进入节点: ${node.type}`);
    if (node.type === 'element') {
      console.log(`元素名: ${node.name}`);
      
      // 查看指令
      if (node.attributes?.directives) {
        console.log('指令:', Object.keys(node.attributes.directives));
      }
    }
  },
  exit(node) {
    console.log(`离开节点: ${node.type}`);
  }
});
```

## API 参考

### `parseMpxTemplate(template: string): ParseResult`

解析 MPX 模板字符串，返回解析结果。

**参数:**
- `template`: MPX 模板字符串

**返回值:**
```typescript
interface ParseResult {
  ast: ASTNode[];        // 抽象语法树
  errors: string[];      // 解析错误列表
  warnings: string[];    // 警告列表
}
```

### `traverse(ast: ASTNode[], visitor): void`

遍历 AST 节点。

**参数:**
- `ast`: AST 节点数组
- `visitor`: 访问者对象
  ```typescript
  {
    enter?: (node: ASTNode, parent?: ASTNode) => void;
    exit?: (node: ASTNode, parent?: ASTNode) => void;
  }
  ```

### `convertMpxToVue(ast: ASTNode[]): string` 🆕

将 MPX 模板的 AST 转换为 Vue 模板字符串。

**参数:**
- `ast`: MPX 模板的 AST 节点数组

**返回值:**
- `string`: Vue 模板字符串

**转换规则:**
- `view` → `div`
- `text` → `span`  
- `image` → `img`
- `wx:if` → `v-if`
- `wx:for` → `v-for`
- `wx:model` → `v-model`
- `bindtap` → `@click`
- `bindinput` → `@input`

## AST 节点结构

### 元素节点
```typescript
{
  type: 'element',
  name: 'view',                    // 元素名
  attributes: {
    props: {                       // 普通属性
      class: 'container',
      id: 'main'
    },
    directives: {                  // 指令
      'wx:if': {
        value: '{{ isVisible }}',
        modifiers: []
      }
    }
  },
  children: [...],               // 子节点
  position: {                    // 位置信息
    start: 0,
    end: 100,
    line: 1,
    column: 1
  }
}
```

### 文本节点
```typescript
{
  type: 'text',
  content: '{{ message }}',      // 文本内容
  position: { ... }
}
```

### 注释节点
```typescript
{
  type: 'comment',
  content: ' 这是注释 ',         // 注释内容
  position: { ... }
}
```

## 支持的 MPX 指令

| 指令 | 说明 | 示例 |
|------|------|------|
| `wx:if` | 条件渲染 | `wx:if="{{ condition }}"` |
| `wx:elif` | 条件渲染 | `wx:elif="{{ condition }}"` |
| `wx:else` | 条件渲染 | `wx:else` |
| `wx:for` | 列表渲染 | `wx:for="{{ list }}"` |
| `wx:key` | 列表项key | `wx:key="id"` |
| `wx:model` | 双向绑定 | `wx:model="{{ value }}"` |
| `bindtap` | 事件绑定 | `bindtap="handleTap"` |
| `catchtap` | 事件绑定 | `catchtap="handleTap"` |
| `@tap` | 事件绑定(简写) | `@tap="handleTap"` |

## 运行示例

```bash
# 安装依赖
npm install

# 启动 Web 界面 (推荐)
npm run dev
# 访问 http://localhost:5173

# 运行基础示例
npm run test

# 运行完整测试套件
npm run test:full

# 测试 MPX 到 Vue 转换
npm run test:convert
```

## 项目结构

```
src/
├── mpxTemplateParser.ts    # 核心解析器代码
├── main.ts                 # 基本使用示例
├── test.ts                 # 完整测试套件
└── style.css              # 样式文件
```

## 类型定义

所有主要类型都已导出，可以在 TypeScript 项目中使用：

```typescript
import type { ASTNode, ParseResult, Directive, Attribute } from './src/mpxTemplateParser';
```

## 开发说明

该解析器专注于 MPX 模板语法解析，不处理以下内容：
- JavaScript 代码解析
- CSS 样式解析  
- MPX 组件逻辑部分
- 构建和打包功能

如需完整的 MPX 开发支持，请结合官方 MPX 工具链使用。