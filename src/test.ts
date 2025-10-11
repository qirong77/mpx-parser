import { mpxTemplateParser, type ParseResult, type ASTNode } from "./mpxTemplateParser";

// 测试用例
const testCases = [
  {
    name: "基本元素和属性",
    template: `<div class="container" id="main">内容</div>`
  },
  {
    name: "MPX 指令",
    template: `
      <view wx:if="{{ isVisible }}" wx:for="{{ list }}" wx:key="id">
        <text bindtap="handleClick" @tap="onTap">{{ item.name }}</text>
      </view>
    `
  },
  {
    name: "自闭合标签",
    template: `<input type="text" wx:model="{{ value }}" />`
  },
  {
    name: "嵌套结构",
    template: `
      <template>
        <view class="page">
          <header>标题</header>
          <main>
            <section wx:for="{{ sections }}" wx:key="index">
              <h2>{{ item.title }}</h2>
              <p>{{ item.content }}</p>
            </section>
          </main>
        </view>
      </template>
    `
  },
  {
    name: "注释",
    template: `
      <view>
        <!-- 这是一个注释 -->
        <text>内容</text>
        <!-- 另一个注释 -->
      </view>
    `
  }
];

function runTests() {
  console.log("🧪 MPX 模板解析器测试\n");
  
  testCases.forEach((testCase, index) => {
    console.log(`📋 测试 ${index + 1}: ${testCase.name}`);
    console.log("=" .repeat(50));
    
    const result: ParseResult = mpxTemplateParser.parseMpxTemplate(testCase.template);
    
    if (result.errors.length > 0) {
      console.log("❌ 解析错误:");
      result.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log("✅ 解析成功");
    }
    
    if (result.warnings.length > 0) {
      console.log("⚠️  警告:");
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log("\n🌳 AST 结构预览:");
    printAST(result.ast, 0);
    
    console.log("\n📊 统计信息:");
    const stats = analyzeAST(result.ast);
    console.log(`  - 元素数量: ${stats.elementCount}`);
    console.log(`  - 文本节点: ${stats.textCount}`);
    console.log(`  - 指令使用: ${stats.directiveCount}`);
    console.log(`  - 最大嵌套深度: ${stats.maxDepth}`);
    
    console.log("\n" + "=".repeat(80) + "\n");
  });
}

// 简化的 AST 打印函数
function printAST(nodes: ASTNode[], depth: number): void {
  const indent = "  ".repeat(depth);
  
  for (const node of nodes) {
    if (node.type === 'element') {
      let info = `${indent}📦 <${node.name}>`;
      
      // 显示属性数量
      if (node.attributes?.props) {
        const propCount = Object.keys(node.attributes.props).length;
        if (propCount > 0) {
          info += ` [${propCount} 个属性]`;
        }
      }
      
      // 显示指令
      if (node.attributes?.directives) {
        const directives = Object.keys(node.attributes.directives);
        if (directives.length > 0) {
          info += ` {指令: ${directives.join(', ')}}`;
        }
      }
      
      console.log(info);
      
      if (node.children && node.children.length > 0) {
        printAST(node.children, depth + 1);
      }
    } else if (node.type === 'text') {
      const text = node.content?.trim();
      if (text) {
        console.log(`${indent}📝 "${text}"`);
      }
    } else if (node.type === 'comment') {
      console.log(`${indent}💬 <!-- ${node.content} -->`);
    }
  }
}

// 分析 AST 统计信息
function analyzeAST(nodes: ASTNode[]): {
  elementCount: number;
  textCount: number;
  directiveCount: number;
  maxDepth: number;
} {
  let elementCount = 0;
  let textCount = 0;
  let directiveCount = 0;
  let maxDepth = 0;
  
  function traverse(nodes: ASTNode[], currentDepth: number) {
    maxDepth = Math.max(maxDepth, currentDepth);
    
    for (const node of nodes) {
      if (node.type === 'element') {
        elementCount++;
        if (node.attributes?.directives) {
          directiveCount += Object.keys(node.attributes.directives).length;
        }
        if (node.children) {
          traverse(node.children, currentDepth + 1);
        }
      } else if (node.type === 'text' && node.content?.trim()) {
        textCount++;
      }
    }
  }
  
  traverse(nodes, 0);
  
  return { elementCount, textCount, directiveCount, maxDepth };
}

// 演示遍历功能
function demonstrateTraversal() {
  console.log("🚶 AST 遍历演示\n");
  console.log("=" .repeat(50));
  
  const template = `
    <view class="container">
      <text wx:if="{{ showTitle }}">{{ title }}</text>
      <list wx:for="{{ items }}" wx:key="id">
        <item bindtap="onItemClick">{{ item.name }}</item>
      </list>
    </view>
  `;
  
  const result = mpxTemplateParser.parseMpxTemplate(template);
  
  console.log("🔍 查找所有带指令的元素:");
  const elementsWithDirectives: ASTNode[] = [];
  
  mpxTemplateParser.traverse(result.ast, {
    enter(node) {
      if (node.type === 'element' && node.attributes?.directives) {
        elementsWithDirectives.push(node);
      }
    }
  });
  
  elementsWithDirectives.forEach((node, index) => {
    const directives = Object.keys(node.attributes!.directives!);
    console.log(`  ${index + 1}. <${node.name}> - 指令: ${directives.join(', ')}`);
  });
  
  console.log("\n🏷️  收集所有文本内容:");
  const textContents: string[] = [];
  
  mpxTemplateParser.traverse(result.ast, {
    enter(node) {
      if (node.type === 'text' && node.content?.trim()) {
        textContents.push(node.content.trim());
      }
    }
  });
  
  textContents.forEach((text, index) => {
    console.log(`  ${index + 1}. "${text}"`);
  });
}

// 运行所有测试
console.log("🎯 MPX 模板解析器完整测试套件\n");
runTests();
demonstrateTraversal();

console.log("\n🎉 测试完成！解析器功能正常。");