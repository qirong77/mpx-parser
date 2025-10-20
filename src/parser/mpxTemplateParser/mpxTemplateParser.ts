import { convertMpxToVue } from "./convertToVue";

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
interface Directive {
    name: string;
    value: string;
    modifiers?: string[];
}

// 属性类型定义
interface Attribute {
    name: string;
    value: string;
    isDirective: boolean;
    directive?: Directive;
}

// 解析结果类型定义
interface ParseResult {
    ast: ASTNode[];
    errors: string[];
    warnings: string[];
}

// 词法分析器
class Lexer {
    private input: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;

    constructor(input: string) {
        this.input = input;
    }

    current(): string {
        return this.input[this.position] || "";
    }

    peek(offset: number = 1): string {
        return this.input[this.position + offset] || "";
    }

    advance(): string {
        const char = this.current();
        this.position++;
        if (char === "\n") {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    skipWhitespace(): void {
        while (/\s/.test(this.current())) {
            this.advance();
        }
    }

    getPosition() {
        return {
            position: this.position,
            line: this.line,
            column: this.column,
        };
    }

    isEOF(): boolean {
        return this.position >= this.input.length;
    }

    match(pattern: RegExp): RegExpMatchArray | null {
        const remaining = this.input.slice(this.position);
        return remaining.match(pattern);
    }
}

// MPX 模板解析器
class MpxTemplateParser {
    private lexer: Lexer;
    private errors: string[] = [];
    private warnings: string[] = [];

    constructor(template: string) {
        this.lexer = new Lexer(template);
    }

    // 解析模板
    parse(): ParseResult {
        const ast: ASTNode[] = [];
        this.errors = [];
        this.warnings = [];

        try {
            while (!this.lexer.isEOF()) {
                this.lexer.skipWhitespace();
                if (this.lexer.isEOF()) break;

                const node = this.parseNode();
                if (node) {
                    ast.push(node);
                }
            }
        } catch (error) {
            this.errors.push(`解析错误: ${error}`);
        }

        return {
            ast,
            errors: this.errors,
            warnings: this.warnings,
        };
    }

    // 解析节点
    private parseNode(): ASTNode | null {
        if (this.lexer.current() === "<") {
            return this.parseElement();
        } else {
            return this.parseText();
        }
    }

    // 解析元素
    private parseElement(): ASTNode | null {
        const startPos = this.lexer.getPosition();

        if (!this.consumeChar("<")) {
            return null;
        }

        // 检查是否是注释
        if (this.lexer.current() === "!" && this.lexer.peek() === "-" && this.lexer.peek(2) === "-") {
            return this.parseComment();
        }

        // 检查是否是结束标签
        if (this.lexer.current() === "/") {
            // 这是结束标签，应该在其他地方处理
            return null;
        }

        // 解析标签名
        const tagName = this.parseTagName();
        if (!tagName) {
            this.addError("期望标签名");
            return null;
        }

        // 解析属性
        const attributes = this.parseAttributes();

        // 检查自闭合标签
        let isSelfClosing = false;
        if (this.lexer.current() === "/" && this.lexer.peek() === ">") {
            isSelfClosing = true;
            this.lexer.advance(); // 跳过 '/'
        }

        if (!this.consumeChar(">")) {
            this.addError('期望 ">"');
            return null;
        }

        const element: ASTNode = {
            type: "element",
            name: tagName,
            attributes: this.processAttributes(attributes),
            children: [],
            position: {
                start: startPos.position,
                end: this.lexer.getPosition().position,
                line: startPos.line,
                column: startPos.column,
            },
        };

        // 如果不是自闭合标签，解析子节点
        if (!isSelfClosing) {
            this.parseChildren(element, tagName);
        }

        return element;
    }

    // 解析注释
    private parseComment(): ASTNode {
        const startPos = this.lexer.getPosition();
        let content = "";

        // 跳过 '<!--'
        this.lexer.advance(); // '!'
        this.lexer.advance(); // '-'
        this.lexer.advance(); // '-'

        while (!this.lexer.isEOF()) {
            if (this.lexer.current() === "-" && this.lexer.peek() === "-" && this.lexer.peek(2) === ">") {
                // 找到注释结束
                this.lexer.advance(); // '-'
                this.lexer.advance(); // '-'
                this.lexer.advance(); // '>'
                break;
            }
            content += this.lexer.advance();
        }

        return {
            type: "comment",
            content,
            position: {
                start: startPos.position,
                end: this.lexer.getPosition().position,
                line: startPos.line,
                column: startPos.column,
            },
        };
    }

    // 解析文本节点
    private parseText(): ASTNode | null {
        const startPos = this.lexer.getPosition();
        let text = "";

        while (!this.lexer.isEOF() && this.lexer.current() !== "<") {
            text += this.lexer.advance();
        }

        if (text.trim()) {
            return {
                type: "text",
                content: text,
                position: {
                    start: startPos.position,
                    end: this.lexer.getPosition().position,
                    line: startPos.line,
                    column: startPos.column,
                },
            };
        }

        return null;
    }

    // 解析标签名
    private parseTagName(): string | null {
        let tagName = "";
        while (!this.lexer.isEOF() && /[a-zA-Z0-9\-_]/.test(this.lexer.current())) {
            tagName += this.lexer.advance();
        }
        return tagName || null;
    }

    // 解析属性
    private parseAttributes(): Attribute[] {
        const attributes: Attribute[] = [];

        while (!this.lexer.isEOF()) {
            this.lexer.skipWhitespace();

            if (this.lexer.current() === ">" || this.lexer.current() === "/") {
                break;
            }

            const attr = this.parseAttribute();
            if (attr) {
                attributes.push(attr);
            } else {
                break;
            }
        }

        return attributes;
    }

    // 解析单个属性
    private parseAttribute(): Attribute | null {
        const name = this.parseAttributeName();
        if (!name) {
            return null;
        }

        this.lexer.skipWhitespace();

        let value = "";
        if (this.lexer.current() === "=") {
            this.lexer.advance(); // 跳过 '='
            this.lexer.skipWhitespace();
            value = this.parseAttributeValue() || "";
        }

        // 检查是否是指令
        const isDirective = this.isDirectiveName(name);
        let directive: Directive | undefined;

        if (isDirective) {
            directive = this.parseDirective(name, value);
        }

        return {
            name,
            value,
            isDirective,
            directive,
        };
    }

    // 解析属性名
    private parseAttributeName(): string | null {
        let name = "";
        while (!this.lexer.isEOF() && /[a-zA-Z0-9\-_:@]/.test(this.lexer.current())) {
            name += this.lexer.advance();
        }
        return name || null;
    }

    // 解析属性值
    private parseAttributeValue(): string | null {
        if (this.lexer.current() === '"') {
            return this.parseQuotedString('"');
        } else if (this.lexer.current() === "'") {
            return this.parseQuotedString("'");
        } else {
            // 无引号的属性值
            let value = "";
            while (!this.lexer.isEOF() && !/[\s>\/]/.test(this.lexer.current())) {
                value += this.lexer.advance();
            }
            return value || null;
        }
    }

    // 解析带引号的字符串
    private parseQuotedString(quote: string): string {
        this.lexer.advance(); // 跳过开始引号
        let value = "";

        while (!this.lexer.isEOF() && this.lexer.current() !== quote) {
            if (this.lexer.current() === "\\") {
                this.lexer.advance(); // 跳过反斜杠
                if (!this.lexer.isEOF()) {
                    value += this.lexer.advance(); // 添加转义字符
                }
            } else {
                value += this.lexer.advance();
            }
        }

        if (this.lexer.current() === quote) {
            this.lexer.advance(); // 跳过结束引号
        }

        return value;
    }

    // 检查是否是指令名称
    private isDirectiveName(name: string): boolean {
        return name.startsWith("wx:") || name.startsWith("@") || name.startsWith("bind") || name.startsWith("catch");
    }

    // 解析指令
    private parseDirective(name: string, value: string): Directive {
        let directiveName = name;
        const modifiers: string[] = [];

        // 处理修饰符
        if (name.includes(".")) {
            const parts = name.split(".");
            directiveName = parts[0];
            modifiers.push(...parts.slice(1));
        }

        return {
            name: directiveName,
            value,
            modifiers,
        };
    }

    // 处理属性
    private processAttributes(attributes: Attribute[]): Record<string, any> {
        const result: Record<string, any> = {};

        for (const attr of attributes) {
            if (attr.isDirective && attr.directive) {
                if (!result.directives) {
                    result.directives = {};
                }
                result.directives[attr.directive.name] = {
                    value: attr.directive.value,
                    modifiers: attr.directive.modifiers || [],
                };
            } else {
                if (!result.props) {
                    result.props = {};
                }
                result.props[attr.name] = attr.value;
            }
        }
        result.attributesAll = attributes; // 保存所有属性信息
        return result;
    }

    // 解析子节点
    private parseChildren(element: ASTNode, tagName: string): void {
        while (!this.lexer.isEOF()) {
            this.lexer.skipWhitespace();

            if (this.lexer.isEOF()) {
                break;
            }

            // 检查是否是结束标签
            if (this.lexer.current() === "<" && this.lexer.peek() === "/") {
                const endTagName = this.parseEndTag();
                if (endTagName === tagName) {
                    break;
                } else {
                    this.addError(`不匹配的结束标签: 期望 </${tagName}>，但找到 </${endTagName}>`);
                    break;
                }
            }

            const child = this.parseNode();
            if (child) {
                element.children!.push(child);
            }
        }
    }

    // 解析结束标签
    private parseEndTag(): string | null {
        if (!this.consumeChar("<") || !this.consumeChar("/")) {
            return null;
        }

        const tagName = this.parseTagName();
        this.lexer.skipWhitespace();
        this.consumeChar(">");

        return tagName;
    }

    // 消费字符
    private consumeChar(expected: string): boolean {
        if (this.lexer.current() === expected) {
            this.lexer.advance();
            return true;
        }
        return false;
    }

    // 添加错误
    private addError(message: string): void {
        const pos = this.lexer.getPosition();
        this.errors.push(`第 ${pos.line} 行第 ${pos.column} 列: ${message}`);
    }
}

// 遍历器
export class ASTTraverser {
    // 遍历 AST
    traverse(
        ast: ASTNode[],
        visitor: {
            enter?: (node: ASTNode, parent?: ASTNode) => void;
            exit?: (node: ASTNode, parent?: ASTNode) => void;
        }
    ): void {
        for (const node of ast) {
            this.traverseNode(node, visitor);
        }
    }

    // 遍历单个节点
    private traverseNode(
        node: ASTNode,
        visitor: {
            enter?: (node: ASTNode, parent?: ASTNode) => void;
            exit?: (node: ASTNode, parent?: ASTNode) => void;
        },
        parent?: ASTNode
    ): void {
        if (visitor.enter) {
            visitor.enter(node, parent);
        }

        if (node.children) {
            for (const child of node.children) {
                this.traverseNode(child, visitor, node);
            }
        }

        if (visitor.exit) {
            visitor.exit(node, parent);
        }
    }
}

/**
 * 解析 MPX 模板内容
 * @param template - MPX 模板字符串
 * @returns 解析结果，包含 AST、错误和警告
 */

export function parseMpxTemplate(template: string): string {
    const parser = new MpxTemplateParser(template);
    const ast = parser.parse();
    return convertMpxToVue(ast.ast);
}
