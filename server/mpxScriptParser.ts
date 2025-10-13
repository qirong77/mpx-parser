import { parse } from "@babel/parser";
import traverseDefault from "@babel/traverse";
import generateDefault from "@babel/generator";
import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";

// @ts-ignore
const traverse = traverseDefault.default || traverseDefault;
// @ts-ignore
const generate = generateDefault.default || generateDefault;

export function parseMpxScript(scriptContent: string): string {
    try {
        // 解析 JavaScript 代码为 AST
        const ast = parse(scriptContent, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
        });
        // 遍历 AST 提取组件配置和导入语句
        traverse(ast, {
            CallExpression(path: NodePath<t.CallExpression>) {
                // createComponent({}) => export default createComponent({})
                // createPage({}) => export default createPage({})
                if (t.isIdentifier(path.node.callee) && path.node.callee.name === "createComponent") {
                    if (path.node.arguments.length > 0 && t.isObjectExpression(path.node.arguments[0])) {
                    }
                } else if (t.isIdentifier(path.node.callee) && path.node.callee.name === "createPage") {
                    if (path.node.arguments.length > 0 && t.isObjectExpression(path.node.arguments[0])) {
                    }
                }
            },
        });
    } catch (error) {
        console.error("Error parsing script:", error);
        return scriptContent;
    }
}
