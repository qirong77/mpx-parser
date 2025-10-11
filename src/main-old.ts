import { mpxTemplateParser, type ParseResult, type ASTNode } from "./mpxTemplateParser";
import './style.css';
import * as monaco from 'monaco-editor';

// Monaco Editor 实例
let mpxEditor: monaco.editor.IStandaloneCodeEditor;
let vueEditor: monaco.editor.IStandaloneCodeEditor;

// Web 界面交互
function initializeApp() {
  // 初始化 Monaco Editor
  initializeMonacoEditors();
  
  const parseBtn = document.getElementById('parse-btn') as HTMLButtonElement;
  const copyVueBtn = document.getElementById('copy-vue-btn') as HTMLButtonElement;
  const astOutput = document.getElementById('ast-output') as HTMLDivElement;
  const statsOutput = document.getElementById('stats-output') as HTMLDivElement;
  const errorsOutput = document.getElementById('errors-output') as HTMLDivElement;
  
  // 标签页切换
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = (btn as HTMLElement).dataset.tab;
      
      // 更新标签按钮状态
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // 更新面板显示
      tabPanels.forEach(panel => panel.classList.remove('active'));
      document.getElementById(`${target}-output`)?.classList.add('active');
    });
  });
  
  // 解析按钮点击事件
  parseBtn.addEventListener('click', () => {
    const template = templateInput.value.trim();
    if (!template) {
      alert('请输入 MPX 模板代码！');
      return;
    }
    
    try {
      const result = mpxTemplateParser.parseMpxTemplate(template);
      console.log(result)
      displayResults(result);
    } catch (error) {
      console.error('解析失败:', error);
      astOutput.innerHTML = `<div class="error">解析失败: ${error}</div>`;
    }
  });
  
  // 显示解析结果
  function displayResults(result: ParseResult) {
    // 显示 AST
    astOutput.innerHTML = formatAST(result.ast);
    
    // 显示统计信息
    const stats = analyzeAST(result.ast);
    statsOutput.innerHTML = formatStats(stats);
    
    // 显示错误和警告
    errorsOutput.innerHTML = formatErrors(result.errors, result.warnings);
  }
  
  // 格式化 AST 显示
  function formatAST(nodes: ASTNode[]): string {
    if (nodes.length === 0) {
      return '<div class="empty">没有解析到任何节点</div>';
    }
    
    let html = '<div class="ast-tree">';
    html += formatASTNodes(nodes, 0);
    html += '</div>';
    return html;
  }
  
  function formatASTNodes(nodes: ASTNode[], depth: number): string {
    let html = '';
    
    for (const node of nodes) {
      if (node.type === 'element') {
        html += `<div class="ast-node element" style="margin-left: ${depth * 20}px">`;
        html += `<span class="node-type">📦</span>`;
        html += `<span class="tag-name">&lt;${node.name}&gt;</span>`;
        
        // 显示属性数量
        if (node.attributes?.props) {
          const propCount = Object.keys(node.attributes.props).length;
          if (propCount > 0) {
            html += `<span class="props-count">[${propCount} 个属性]</span>`;
          }
        }
        
        // 显示指令
        if (node.attributes?.directives) {
          const directives = Object.keys(node.attributes.directives);
          if (directives.length > 0) {
            html += `<span class="directives">{${directives.join(', ')}}</span>`;
          }
        }
        
        html += '</div>';
        
        if (node.children && node.children.length > 0) {
          html += formatASTNodes(node.children, depth + 1);
        }
      } else if (node.type === 'text') {
        const text = node.content?.trim();
        if (text) {
          html += `<div class="ast-node text" style="margin-left: ${depth * 20}px">`;
          html += `<span class="node-type">📝</span>`;
          html += `<span class="text-content">"${escapeHtml(text)}"</span>`;
          html += '</div>';
        }
      } else if (node.type === 'comment') {
        html += `<div class="ast-node comment" style="margin-left: ${depth * 20}px">`;
        html += `<span class="node-type">💬</span>`;
        html += `<span class="comment-content">&lt;!-- ${escapeHtml(node.content || '')} --&gt;</span>`;
        html += '</div>';
      }
    }
    
    return html;
  }
  
  // 分析 AST 统计信息
  function analyzeAST(nodes: ASTNode[]) {
    let elementCount = 0;
    let textCount = 0;
    let commentCount = 0;
    let directiveCount = 0;
    let maxDepth = 0;
    const elementTypes = new Set<string>();
    const directives = new Set<string>();
    
    function traverse(nodes: ASTNode[], currentDepth: number) {
      maxDepth = Math.max(maxDepth, currentDepth);
      
      for (const node of nodes) {
        if (node.type === 'element') {
          elementCount++;
          elementTypes.add(node.name || '');
          if (node.attributes?.directives) {
            const nodeDirectives = Object.keys(node.attributes.directives);
            directiveCount += nodeDirectives.length;
            nodeDirectives.forEach(d => directives.add(d));
          }
          if (node.children) {
            traverse(node.children, currentDepth + 1);
          }
        } else if (node.type === 'text' && node.content?.trim()) {
          textCount++;
        } else if (node.type === 'comment') {
          commentCount++;
        }
      }
    }
    
    traverse(nodes, 0);
    
    return {
      elementCount,
      textCount,
      commentCount,
      directiveCount,
      maxDepth,
      elementTypes: Array.from(elementTypes),
      directives: Array.from(directives)
    };
  }
  
  // 格式化统计信息
  function formatStats(stats: any): string {
    return `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.elementCount}</div>
          <div class="stat-label">元素数量</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.textCount}</div>
          <div class="stat-label">文本节点</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.commentCount}</div>
          <div class="stat-label">注释节点</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.directiveCount}</div>
          <div class="stat-label">指令使用</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.maxDepth}</div>
          <div class="stat-label">最大深度</div>
        </div>
      </div>
      
      <div class="details">
        <h3>元素类型</h3>
        <div class="tag-list">
          ${stats.elementTypes.map((type: string) => `<span class="tag">${type}</span>`).join('')}
        </div>
        
        ${stats.directives.length > 0 ? `
          <h3>使用的指令</h3>
          <div class="directive-list">
            ${stats.directives.map((dir: string) => `<span class="directive">${dir}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // 格式化错误和警告
  function formatErrors(errors: string[], warnings: string[]): string {
    let html = '';
    
    if (errors.length === 0 && warnings.length === 0) {
      html = '<div class="success">✅ 解析成功，没有错误或警告</div>';
    } else {
      if (errors.length > 0) {
        html += '<div class="error-section">';
        html += '<h3>❌ 错误</h3>';
        html += '<ul class="error-list">';
        errors.forEach(error => {
          html += `<li class="error-item">${escapeHtml(error)}</li>`;
        });
        html += '</ul></div>';
      }
      
      if (warnings.length > 0) {
        html += '<div class="warning-section">';
        html += '<h3>⚠️ 警告</h3>';
        html += '<ul class="warning-list">';
        warnings.forEach(warning => {
          html += `<li class="warning-item">${escapeHtml(warning)}</li>`;
        });
        html += '</ul></div>';
      }
    }
    
    return html;
  }
  
  // HTML 转义
  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // 初始解析默认模板
  parseBtn.click();
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 在控制台也输出示例，方便开发调试
console.log('🚀 MPX 模板解析器已加载！');
console.log('可以通过 mpxTemplateParser.parseMpxTemplate(template) 直接在控制台测试解析。');

// 导出到全局对象，方便在浏览器控制台中使用
(window as any).mpxTemplateParser = mpxTemplateParser;