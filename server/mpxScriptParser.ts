

import { parse } from '@babel/parser';
import traverseDefault from '@babel/traverse';
import generateDefault from '@babel/generator';
import * as t from '@babel/types';

// @ts-ignore
const traverse = traverseDefault.default || traverseDefault;
// @ts-ignore
const generate = generateDefault.default || generateDefault;

interface MpxComponent {
    props?: any;
    data?: any;
    computed?: any;
    methods?: any;
    created?: any;
    mounted?: any;
    [key: string]: any;
}

export function parseMpxScript(scriptContent: string): string {
    try {
        // 解析 JavaScript 代码为 AST
        const ast = parse(scriptContent, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx']
        });

        let componentConfig: MpxComponent = {};
        let imports: string[] = [];

        // 遍历 AST 提取组件配置和导入语句
        traverse(ast, {
            ImportDeclaration(path: any) {
                const importStr = generate(path.node).code;
                // 跳过 MPX 特有的导入，保留其他导入
                if (!importStr.includes('@mpxjs/core')) {
                    imports.push(importStr);
                }
            },
            CallExpression(path: any) {
                // 查找 createComponent 调用
                if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'createComponent') {
                    if (path.node.arguments.length > 0 && t.isObjectExpression(path.node.arguments[0])) {
                        componentConfig = extractComponentConfig(path.node.arguments[0]);
                    }
                }
            }
        });

        // 生成 Vue 2 组件代码
        const vue2Script = generateVue2Component(componentConfig, imports);
        return vue2Script;

    } catch (error) {
        console.error("Error parsing script:", error);
        return scriptContent;
    }
}

function extractComponentConfig(objExpr: t.ObjectExpression): MpxComponent {
    const config: MpxComponent = {};

    objExpr.properties.forEach(prop => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            const key = prop.key.name;
            const value = generate(prop.value).code;
            
            // 处理特殊的属性
            switch (key) {
                case 'data':
                    // MPX 的 data 可能是对象或函数，Vue 2 需要函数
                    if (t.isObjectExpression(prop.value)) {
                        config.data = `function() { return ${value} }`;
                    } else {
                        config.data = value;
                    }
                    break;
                case 'computed':
                    // 处理 computed 中的 mapState 等辅助函数
                    config.computed = processComputed(prop.value);
                    break;
                case 'methods':
                    config.methods = processComputed(prop.value);
                    break;
                case 'props':
                    config.props = value;
                    break;
                case 'created':
                case 'mounted':
                case 'beforeDestroy':
                case 'destroyed':
                    // 生命周期钩子直接转换，确保是函数格式
                    if (t.isFunctionExpression(prop.value) || t.isArrowFunctionExpression(prop.value)) {
                        config[key] = value;
                    } else {
                        config[key] = `function${value}`;
                    }
                    break;
                default:
                    config[key] = value;
            }
        } else if (t.isSpreadElement(prop)) {
            // 处理展开语法，如 ...mapState()
            let spreadCode = generate(prop).code;
            
            // 转换 MPX store 语法为 Vuex 语法
            spreadCode = spreadCode.replace(/(\w+Store)\.mapState/g, 'mapState')
                                  .replace(/(\w+Store)\.mapGetters/g, 'mapGetters')
                                  .replace(/(\w+Store)\.mapMutations/g, 'mapMutations')
                                  .replace(/(\w+Store)\.mapActions/g, 'mapActions');
            
            if (!config.computed) {
                config.computed = `{ ${spreadCode} }`;
            } else if (typeof config.computed === 'string') {
                // 如果 computed 已经存在，合并展开语法
                config.computed = config.computed.replace(/^{/, `{ ${spreadCode},`);
            }
        }
    });

    return config;
}

function processComputed(computedValue: t.Node): string {
    const code = generate(computedValue).code;
    
    // 处理 MPX store 相关的辅助函数，保持展开语法
    return code.replace(/(\w+Store)\.mapState/g, 'mapState')
               .replace(/(\w+Store)\.mapGetters/g, 'mapGetters')
               .replace(/(\w+Store)\.mapMutations/g, 'mapMutations')
               .replace(/(\w+Store)\.mapActions/g, 'mapActions');
}

function generateVue2Component(config: MpxComponent, imports: string[]): string {
    let script = '';
    
    // 添加导入语句
    if (imports.length > 0) {
        script += imports.join('\n') + '\n\n';
    }

    // 如果使用了 store 映射函数，添加 Vuex 导入
    const hasStoreHelpers = JSON.stringify(config).includes('mapState') || 
                           JSON.stringify(config).includes('mapGetters') || 
                           JSON.stringify(config).includes('mapMutations') || 
                           JSON.stringify(config).includes('mapActions');
    
    if (hasStoreHelpers) {
        script += "import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'\n\n";
    }

    // 生成组件导出
    script += 'export default {\n';
    
    // 添加组件名称（可选）
    script += "  name: 'MpxComponent',\n";
    
    // 添加各个配置项
    Object.entries(config).forEach(([key, value]) => {
        if (value !== undefined) {
            if (typeof value === 'string') {
                if (key === 'data' && !value.startsWith('function')) {
                    script += `  ${key}: function() { return ${value} },\n`;
                } else {
                    // 清理多余的点号和格式化代码
                    const cleanValue = value.replace(/\.\.+/g, '...');
                    script += `  ${key}: ${cleanValue},\n`;
                }
            } else {
                script += `  ${key}: ${JSON.stringify(value, null, 2).replace(/"/g, '')},\n`;
            }
        }
    });
    
    script += '}';
    
    return script;
}
