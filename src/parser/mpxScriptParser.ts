import * as babel from "@babel/core";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import traverse from '@babel/traverse';

export function parseMpxScript(scriptContent: string) {
    try {
        const ast = parse(scriptContent, {
            sourceType: "module",
            plugins: ["jsx", "typescript"],
        });
        
        // 使用 traverse 遍历和修改 AST
        traverse(ast, {
            // 转换 createComponent 调用
            CallExpression(path: any) {
                if (
                    t.isIdentifier(path.node.callee, { name: "createComponent" }) &&
                    path.node.arguments.length === 1 &&
                    t.isObjectExpression(path.node.arguments[0])
                ) {
                    // 将 createComponent({...}) 转换为 export default {...}
                    const options = path.node.arguments[0];

                    // 转换 data 属性为函数形式
                    const transformedProperties = options.properties.map((prop: any) => {
                        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key, { name: "data" }) && t.isExpression(prop.value)) {
                            // 将 data: {...} 转换为 data() { return {...} }
                            const dataFunction = t.objectMethod("method", t.identifier("data"), [], t.blockStatement([t.returnStatement(prop.value)]));
                            return dataFunction;
                        }
                        return prop;
                    });

                    // 构建 Vue 组件选项
                    const vueOptions = t.objectExpression(transformedProperties);

                    // 替换为 export default
                    const exportDefault = t.exportDefaultDeclaration(vueOptions);

                    // 将整个 CallExpression 替换为 export default
                    if (t.isExpressionStatement(path.parent)) {
                        path.parentPath.replaceWith(exportDefault);
                    }
                }
            },
            // 移除 MPX 特有的 import
            ImportDeclaration(path: any) {
                if (t.isStringLiteral(path.node.source) && path.node.source.value === "@mpxjs/core") {
                    path.remove();
                }
            },
        });

        // 生成转换后的代码
        const result = babel.transformFromAstSync(ast, scriptContent, {
            code: true,
            ast: false,
        });

        return result?.code || scriptContent;
    } catch (error) {
        console.error('Error parsing MPX script:', error);
        return scriptContent;
    }
}
