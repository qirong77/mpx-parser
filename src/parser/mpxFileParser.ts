interface MPXBlock {
    template?: string;
    script?: string;
    style?: string;
    json?: string;
}
export function mpxFileParser(content: string): MPXBlock {
    const blocks: MPXBlock = {};

    // 匹配 template 标签
    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
    if (templateMatch) {
        blocks.template = templateMatch[1].trim();
    }

    // 匹配 script 标签（排除 json 类型）
    const scriptMatch = content.match(/<script(?!\s+type="application\/json").*?>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        blocks.script = scriptMatch[1].trim();
    }

    // 匹配 style 标签
    const styleMatch = content.match(/<style.*?>([\s\S]*?)<\/style>/);
    if (styleMatch) {
        blocks.style = styleMatch[1].trim();
    }

    // 匹配 json 配置
    const jsonMatch = content.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
    if (jsonMatch) {
        blocks.json = jsonMatch[1].trim();
    }

    return blocks;
}
