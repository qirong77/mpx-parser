// AST 节点类型定义
interface ASTNode {
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
class ASTTraverser {
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
function parseMpxTemplate(template: string): ParseResult {
    const parser = new MpxTemplateParser(template);
    return parser.parse();
}

// MPX 到 Vue 转换器
class MpxToVueConverter extends ASTTraverser {
    private output: string = '';
    private indentLevel: number = 0;
    private indentSize: number = 2;

    // 转换 MPX 模板到 Vue 模板
    convertToVue(ast: ASTNode[]): string {
        this.output = '';
        this.indentLevel = 0;
        
        this.traverse(ast, {
            enter: (node, parent) => this.onEnterNode(node, parent),
            exit: (node, parent) => this.onExitNode(node, parent)
        });
        
        return this.output.trim();
    }
    
    private onEnterNode(node: ASTNode, _parent?: ASTNode): void {
        if (node.type === 'element') {
            this.writeElement(node, true);
        } else if (node.type === 'text') {
            this.writeText(node);
        } else if (node.type === 'comment') {
            this.writeComment(node);
        }
    }
    
    private onExitNode(node: ASTNode, _parent?: ASTNode): void {
        if (node.type === 'element' && node.children && node.children.length > 0) {
            this.writeElement(node, false);
        }
    }
    
    private writeElement(node: ASTNode, isStart: boolean): void {
        const tagName = this.convertTagName(node.name || '');
        
        if (isStart) {
            let tag = `<${tagName}`;
            
            // 处理属性和指令
            if (node.attributes) {
                const attributes = this.convertAttributes(node.attributes);
                if (attributes) {
                    tag += ` ${attributes}`;
                }
            }
            
            // 检查是否是自闭合标签
            const isSelfClosing = !node.children || node.children.length === 0;
            if (isSelfClosing && this.isSelfClosingTag(tagName)) {
                tag += ' />';
                this.writeLine(tag);
            } else {
                tag += '>';
                this.writeLine(tag);
                this.indentLevel++;
            }
        } else {
            // 结束标签
            this.indentLevel--;
            this.writeLine(`</${tagName}>`);
        }
    }
    
    private writeText(node: ASTNode): void {
        const content = node.content?.trim();
        if (content) {
            // 转换 MPX 插值语法到 Vue
            const vueContent = this.convertInterpolation(content);
            this.writeLine(vueContent);
        }
    }
    
    private writeComment(node: ASTNode): void {
        this.writeLine(`<!-- ${node.content || ''} -->`);
    }
    
    private convertTagName(mpxTag: string): string {
        // MPX 到 Vue 标签转换映射
        const tagMapping: Record<string, string> = {
            'view': 'div',
            'text': 'span',
            'image': 'img',
            'navigator': 'router-link',
            'button': 'button',
            'input': 'input',
            'textarea': 'textarea',
            'scroll-view': 'div',
            'swiper': 'div',
            'swiper-item': 'div',
            'picker': 'select',
            'picker-view': 'div',
            'slider': 'input',
            'switch': 'input',
            'checkbox': 'input',
            'radio': 'input',
            'form': 'form',
            'label': 'label'
        };
        
        return tagMapping[mpxTag] || mpxTag;
    }
    
    private convertAttributes(attributes: Record<string, any>): string {
        const parts: string[] = [];
        
        // 处理普通属性
        if (attributes.props) {
            for (const [name, value] of Object.entries(attributes.props)) {
                const vueAttr = this.convertAttribute(name, value as string);
                if (vueAttr) {
                    parts.push(vueAttr);
                }
            }
        }
        
        // 处理指令
        if (attributes.directives) {
            for (const [name, directive] of Object.entries(attributes.directives)) {
                const vueDirective = this.convertDirective(name, directive as any);
                if (vueDirective) {
                    parts.push(vueDirective);
                }
            }
        }
        
        return parts.join(' ');
    }
    
    private convertAttribute(name: string, value: string): string {
        // 属性名转换
        const attrMapping: Record<string, string> = {
            'wx:key': 'key',
            'hover-class': ':class',
            'hover-start-time': '',
            'hover-stay-time': '',
            'scroll-x': '',
            'scroll-y': '',
            'scroll-top': ':scroll-top',
            'scroll-left': ':scroll-left',
            'enable-back-to-top': '',
            'bindscroll': '@scroll',
            'bindinput': '@input',
            'bindchange': '@change',
            'bindblur': '@blur',
            'bindfocus': '@focus'
        };
        
        const vueName = attrMapping[name] || name;
        if (!vueName) return ''; // 跳过不支持的属性
        
        // 处理特殊情况
        if (name === 'src' && value) {
            return `${vueName}="${value}"`;
        }
        
        if (name === 'class' || name === 'id' || name === 'style') {
            return `${vueName}="${value}"`;
        }
        
        return `${vueName}="${value}"`;
    }
    
    private convertDirective(name: string, directive: { value: string; modifiers: string[] }): string {
        // MPX 指令到 Vue 指令的转换
        switch (name) {
            case 'wx:if':
                return `v-if="${this.convertExpression(directive.value)}"`;
            
            case 'wx:elif':
                return `v-else-if="${this.convertExpression(directive.value)}"`;
            
            case 'wx:else':
                return 'v-else';
            
            case 'wx:for':
                // MPX: wx:for="{{ list }}" wx:key="index"
                // Vue: v-for="(item, index) in list" :key="index"
                const listExpr = this.convertExpression(directive.value);
                return `v-for="(item, index) in ${listExpr}"`;
            
            case 'wx:key':
                // 这个会在 wx:for 中处理
                return `:key="${directive.value}"`;
            
            case 'wx:model':
                return `v-model="${this.convertExpression(directive.value)}"`;
            
            case 'bindtap':
            case 'catchtap':
                return `@click="${directive.value}"`;
            
            case 'bindinput':
                return `@input="${directive.value}"`;
            
            case 'bindchange':
                return `@change="${directive.value}"`;
            
            case 'bindfocus':
                return `@focus="${directive.value}"`;
            
            case 'bindblur':
                return `@blur="${directive.value}"`;
            
            case '@tap':
                return `@click="${directive.value}"`;
            
            default:
                // 处理其他 bind 事件
                if (name.startsWith('bind')) {
                    const eventName = name.substring(4); // 移除 'bind' 前缀
                    return `@${eventName}="${directive.value}"`;
                }
                
                if (name.startsWith('catch')) {
                    const eventName = name.substring(5); // 移除 'catch' 前缀
                    return `@${eventName}.stop="${directive.value}"`;
                }
                
                if (name.startsWith('@')) {
                    // 已经是 Vue 风格的事件绑定
                    const eventName = name.substring(1);
                    return `@${eventName}="${directive.value}"`;
                }
                
                return `${name}="${directive.value}"`;
        }
    }
    
    private convertExpression(expr: string): string {
        // 转换 MPX 表达式到 Vue 表达式
        // MPX: {{ variable }} -> Vue: variable
        // MPX: {{ obj.prop }} -> Vue: obj.prop
        
        if (expr.startsWith('{{') && expr.endsWith('}}')) {
            return expr.slice(2, -2).trim();
        }
        
        return expr;
    }
    
    private convertInterpolation(text: string): string {
        // 转换文本中的插值表达式
        // MPX: {{ variable }} -> Vue: {{ variable }}
        // 在 Vue 中插值语法是相同的，所以直接返回
        return text;
    }
    
    private isSelfClosingTag(tagName: string): boolean {
        const selfClosingTags = ['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
        return selfClosingTags.includes(tagName);
    }
    
    private writeLine(content: string): void {
        const indent = ' '.repeat(this.indentLevel * this.indentSize);
        this.output += indent + content + '\n';
    }
}

/**
 * 遍历 AST 节点
 * @param ast - AST 节点数组
 * @param visitor - 访问者对象，包含 enter 和 exit 回调
 */
function traverse(
    ast: ASTNode[],
    visitor: {
        enter?: (node: ASTNode, parent?: ASTNode) => void;
        exit?: (node: ASTNode, parent?: ASTNode) => void;
    }
): void {
    const traverser = new ASTTraverser();
    traverser.traverse(ast, visitor);
}

/**
 * 将 MPX 模板转换为 Vue 模板
 * @param ast - MPX 模板的 AST
 * @returns Vue 模板字符串
 */
function convertMpxToVue(ast: ASTNode[]): string {
    const converter = new MpxToVueConverter();
    return converter.convertToVue(ast);
}

export const mpxTemplateParser = {
    parseMpxTemplate,
    traverse,
    convertMpxToVue,
};

export type { ASTNode, ParseResult, Directive, Attribute };
