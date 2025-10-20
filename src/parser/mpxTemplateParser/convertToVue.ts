import { ASTNode, ASTTraverser } from "./mpxTemplateParser";

class MpxToVueConverter extends ASTTraverser {
    private output: string = "";
    private indentLevel: number = 0;
    private indentSize: number = 2;

    // 转换 MPX 模板到 Vue 模板
    convertToVue(ast: ASTNode[]): string {
        this.output = "";
        this.indentLevel = 0;

        this.traverse(ast, {
            enter: (node, parent) => this.onEnterNode(node, parent),
            exit: (node, parent) => this.onExitNode(node, parent),
        });

        return this.output.trim();
    }

    private onEnterNode(node: ASTNode, _parent?: ASTNode): void {
        if (node.type === "element") {
            this.writeElement(node, true);
        } else if (node.type === "text") {
            this.writeText(node);
        } else if (node.type === "comment") {
            this.writeComment(node);
        }
    }

    private onExitNode(node: ASTNode, _parent?: ASTNode): void {
        if (node.type === "element" && node.children && node.children.length > 0) {
            this.writeElement(node, false);
        }
    }

    private writeElement(node: ASTNode, isStart: boolean): void {
        const tagName = this.convertTagName(node.name || "");

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
                tag += " />";
                this.writeLine(tag);
            } else {
                tag += ">";
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
        this.writeLine(`<!-- ${node.content || ""} -->`);
    }

    private convertTagName(mpxTag: string): string {
        // MPX 到 Vue 标签转换映射
        const tagMapping: Record<string, string> = {
            view: "div",
            text: "span",
            image: "img",
            navigator: "router-link",
            button: "button",
            input: "input",
            textarea: "textarea",
            "scroll-view": "div",
            swiper: "div",
            "swiper-item": "div",
            picker: "select",
            "picker-view": "div",
            slider: "input",
            switch: "input",
            checkbox: "input",
            radio: "input",
            form: "form",
            label: "label",
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

        return parts.join(" ");
    }

    private convertAttribute(name: string, value: string): string {
        // 属性名转换
        const attrMapping: Record<string, string> = {
            "wx:key": "key",
            "hover-class": ":class",
            "hover-start-time": "",
            "hover-stay-time": "",
            "scroll-x": "",
            "scroll-y": "",
            "scroll-top": ":scroll-top",
            "scroll-left": ":scroll-left",
            "enable-back-to-top": "",
            bindscroll: "@scroll",
            bindinput: "@input",
            bindchange: "@change",
            bindblur: "@blur",
            bindfocus: "@focus",
        };

        const vueName = attrMapping[name] || name;
        if (!vueName) return ""; // 跳过不支持的属性

        // 处理特殊情况
        if (name === "src" && value) {
            return `${vueName}="${value}"`;
        }

        if (name === "class" || name === "id" || name === "style") {
            return `${vueName}="${value}"`;
        }

        return `${vueName}="${value}"`;
    }

    private convertDirective(name: string, directive: { value: string; modifiers: string[] }): string {
        // MPX 指令到 Vue 指令的转换
        switch (name) {
            case "wx:if":
                return `v-if="${this.convertExpression(directive.value)}"`;

            case "wx:elif":
                return `v-else-if="${this.convertExpression(directive.value)}"`;

            case "wx:else":
                return "v-else";

            case "wx:for":
                // MPX: wx:for="{{ list }}" wx:key="index"
                // Vue: v-for="(item, index) in list" :key="index"
                const listExpr = this.convertExpression(directive.value);
                return `v-for="(item, index) in ${listExpr}"`;

            case "wx:key":
                // 这个会在 wx:for 中处理
                return `:key="${directive.value}"`;

            case "wx:model":
                return `v-model="${this.convertExpression(directive.value)}"`;

            case "bindtap":
            case "catchtap":
                return `@click="${directive.value}"`;

            case "bindinput":
                return `@input="${directive.value}"`;

            case "bindchange":
                return `@change="${directive.value}"`;

            case "bindfocus":
                return `@focus="${directive.value}"`;

            case "bindblur":
                return `@blur="${directive.value}"`;

            case "@tap":
                return `@click="${directive.value}"`;

            default:
                // 处理其他 bind 事件
                if (name.startsWith("bind")) {
                    const eventName = name.substring(4); // 移除 'bind' 前缀
                    return `@${eventName}="${directive.value}"`;
                }

                if (name.startsWith("catch")) {
                    const eventName = name.substring(5); // 移除 'catch' 前缀
                    return `@${eventName}.stop="${directive.value}"`;
                }

                if (name.startsWith("@")) {
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

        if (expr.startsWith("{{") && expr.endsWith("}}")) {
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
        const selfClosingTags = ["img", "input", "br", "hr", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"];
        return selfClosingTags.includes(tagName);
    }

    private writeLine(content: string): void {
        const indent = " ".repeat(this.indentLevel * this.indentSize);
        this.output += indent + content + "\n";
    }
}

/**
 * 将 MPX 模板转换为 Vue 模板
 * @param ast - MPX 模板的 AST
 * @returns Vue 模板字符串
 */
export function convertMpxToVue(ast: ASTNode[]): string {
    const converter = new MpxToVueConverter();
    return converter.convertToVue(ast);
}