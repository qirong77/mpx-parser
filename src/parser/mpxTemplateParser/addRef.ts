import { ASTNode } from "./types";

/**
 * 为 MPX 模板的 AST 添加 ref 属性
 * @param ast - MPX 模板的 AST 节点数组
 * @returns 添加了 ref 属性的新 AST
 */
function addRef(ast: ASTNode[]): ASTNode[] {
    return ast.map(node => addRefToNode(node, "1"));
}

/**
 * 为 MPX 模板的 AST 添加 ref 属性并转换为字符串
 * @param ast - MPX 模板的 AST 节点数组
 * @returns 添加了 ref 属性的模板字符串
 */
export function addRefAndConvertToString(ast: ASTNode[]): string {
    const astWithRef = addRef(ast);
    return astToTemplate(astWithRef);
}

/**
 * 为单个节点及其子节点添加 ref 属性
 * @param node - AST 节点
 * @param refPath - 当前节点的 ref 路径，如 "1", "1-1", "1-2-1" 等
 * @returns 添加了 ref 属性的新节点
 */
function addRefToNode(node: ASTNode, refPath: string): ASTNode {
    // 深拷贝节点，避免修改原始 AST
    const newNode: ASTNode = {
        ...node,
        attributes: node.attributes ? { ...node.attributes } : {},
        children: node.children ? [...node.children] : undefined,
    };

    // 只为元素节点添加 ref 属性
    if (newNode.type === "element" && newNode.name) {
        // 确保 attributes 结构存在
        if (!newNode.attributes) {
            newNode.attributes = {};
        }
        if (!newNode.attributes.props) {
            newNode.attributes.props = {};
        }

        // 生成 ref 值：devtools_{refPath}_{tagName}
        const refValue = `devtools_${refPath}_${newNode.name}`;
        
        // 添加 wx:ref 属性
        newNode.attributes.props["wx:ref"] = refValue;

        // 如果有 attributesAll 数组，也要更新它
        if (newNode.attributes.attributesAll) {
            newNode.attributes.attributesAll = [...newNode.attributes.attributesAll];
            
            // 检查是否已存在 wx:ref 属性
            const existingRefIndex = newNode.attributes.attributesAll.findIndex(
                (attr: any) => attr.name === "wx:ref"
            );
            
            if (existingRefIndex >= 0) {
                // 更新现有的 wx:ref 属性
                newNode.attributes.attributesAll[existingRefIndex] = {
                    ...newNode.attributes.attributesAll[existingRefIndex],
                    value: refValue
                };
            } else {
                // 添加新的 wx:ref 属性
                newNode.attributes.attributesAll.push({
                    name: "wx:ref",
                    value: refValue,
                    isDirective: true,
                    directive: {
                        name: "wx:ref",
                        value: refValue,
                        modifiers: []
                    }
                });
            }
        }
    }

    // 递归处理子节点
    if (newNode.children && newNode.children.length > 0) {
        newNode.children = newNode.children
            .map((child, index) => {
                // 只为元素节点生成子路径
                if (child.type === "element") {
                    const childRefPath = `${refPath}-${index + 1}`;
                    return addRefToNode(child, childRefPath);
                }
                // 非元素节点（如文本节点、注释节点）直接复制
                return { ...child };
            });
    }

    return newNode;
}

/**
 * 将添加了 ref 的 AST 转换回模板字符串
 * @param ast - 添加了 ref 的 AST 节点数组
 * @returns 模板字符串
 */
function astToTemplate(ast: ASTNode[]): string {
    return ast.map(node => nodeToString(node, 0)).join("");
}

/**
 * 将单个节点转换为字符串
 * @param node - AST 节点
 * @param indentLevel - 缩进级别
 * @returns 节点的字符串表示
 */
function nodeToString(node: ASTNode, indentLevel: number): string {
    const indent = "  ".repeat(indentLevel);
    
    switch (node.type) {
        case "element":
            return elementToString(node, indentLevel);
        case "text":
            const content = node.content?.trim();
            return content ? `${content}` : "";
        case "comment":
            return `${indent}<!-- ${node.content || ""} -->`;
        default:
            return "";
    }
}

/**
 * 将元素节点转换为字符串
 * @param node - 元素节点
 * @param indentLevel - 缩进级别
 * @returns 元素的字符串表示
 */
function elementToString(node: ASTNode, indentLevel: number): string {
    const indent = "  ".repeat(indentLevel);
    const tagName = node.name || "";
    
    let result = `${indent}<${tagName}`;
    
    // 添加属性
    if (node.attributes) {
        const attributeStrings: string[] = [];
        
        // 使用 attributesAll 来保持属性顺序，如果存在的话
        if (node.attributes.attributesAll) {
            for (const attr of node.attributes.attributesAll) {
                if (attr.value !== undefined && attr.value !== "") {
                    attributeStrings.push(`${attr.name}="${attr.value}"`);
                } else if (attr.name === "wx:else") {
                    // wx:else 没有值
                    attributeStrings.push(attr.name);
                }
            }
        } else {
            // 回退到使用 props 和 directives
            if (node.attributes.props) {
                for (const [name, value] of Object.entries(node.attributes.props)) {
                    if (value !== undefined && value !== "") {
                        attributeStrings.push(`${name}="${value}"`);
                    }
                }
            }
            
            if (node.attributes.directives) {
                for (const [name, directive] of Object.entries(node.attributes.directives)) {
                    const dir = directive as any;
                    if (dir.value !== undefined && dir.value !== "") {
                        attributeStrings.push(`${name}="${dir.value}"`);
                    } else if (name === "wx:else") {
                        attributeStrings.push(name);
                    }
                }
            }
        }
        
        if (attributeStrings.length > 0) {
            result += " " + attributeStrings.join(" ");
        }
    }
    
    // 检查是否有子节点
    const hasChildren = node.children && node.children.length > 0;
    const hasTextChildren = hasChildren && node.children!.some(child => 
        child.type === "text" && child.content?.trim()
    );
    const hasElementChildren = hasChildren && node.children!.some(child => 
        child.type === "element"
    );
    
    if (!hasChildren) {
        // 自闭合标签
        result += ">";
        result += `</${tagName}>`;
    } else {
        result += ">";
        
        if (hasElementChildren) {
            // 有元素子节点，换行处理
            result += "\n";
            for (const child of node.children!) {
                if (child.type === "element") {
                    result += nodeToString(child, indentLevel + 1) + "\n";
                } else if (child.type === "text") {
                    const content = child.content?.trim();
                    if (content) {
                        result += `${content}`;
                    }
                }
            }
            result += `${indent}</${tagName}>`;
        } else if (hasTextChildren) {
            // 只有文本子节点，内联处理
            for (const child of node.children!) {
                result += nodeToString(child, 0);
            }
            result += `</${tagName}>`;
        } else {
            // 其他情况
            for (const child of node.children!) {
                result += nodeToString(child, indentLevel + 1);
            }
            result += `</${tagName}>`;
        }
    }
    
    return result;
}