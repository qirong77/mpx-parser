// AST 节点类型定义
export interface ASTNode {
    type: string;
    name?: string;
    attributes?: Record<string, any>;
    children?: ASTNode[];
    content?: string;
    startTag?: string;
    endTag?: string;
    position?: {
        start: number;
        end: number;
        line: number;
        column: number;
    };
}

// 指令类型定义
export interface Directive {
    name: string;
    value: string;
    modifiers?: string[];
}

// 属性类型定义
export interface Attribute {
    name: string;
    value: string;
    isDirective: boolean;
    directive?: Directive;
}

// 解析结果类型定义
export interface ParseResult {
    ast: ASTNode[];
    errors: string[];
    warnings: string[];
}