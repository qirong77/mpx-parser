import { ASTNode } from "./types";

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