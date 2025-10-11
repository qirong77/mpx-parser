import { mpxFileParser } from "./parser/mpxFileParser";
import { parseMpxScript } from "./parser/mpxScriptParser";
import { parseMpxTemplate } from "./parser/mpxTemplateParser";
import "./style.css";
import * as monaco from "monaco-editor";

// Monaco Editor 实例
let mpxEditor: monaco.editor.IStandaloneCodeEditor;
let vueEditor: monaco.editor.IStandaloneCodeEditor;

// 默认 MPX 模板
const defaultMpxTemplate = `
<template>
  <view class="list">
    <view wx:for="{{listData}}" wx:key="*this">{{item}}</view>
  </view>
</template>

<script>
import { createComponent } from '@mpxjs/core'

createComponent({
  data: {
    listData: ['手机', '电视', '电脑']
  }
})
</script>

<style lang="stylus">
  .list
    background-color red
</style>

<script type="application/json">
  {
    "component": true
  }
</script>
`;

// 初始化 Monaco Editor
function initializeMonacoEditors() {
    // 配置 Monaco Editor 环境
    (self as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: any, label: string) {
            if (label === "json") {
                return "./vs/language/json/json.worker.js";
            }
            if (label === "css" || label === "scss" || label === "less") {
                return "./vs/language/css/css.worker.js";
            }
            if (label === "html" || label === "handlebars" || label === "razor") {
                return "./vs/language/html/html.worker.js";
            }
            if (label === "typescript" || label === "javascript") {
                return "./vs/language/typescript/ts.worker.js";
            }
            return "./vs/editor/editor.worker.js";
        },
    };

    // 创建 MPX 编辑器
    const mpxContainer = document.getElementById("mpx-editor-container");
    if (mpxContainer) {
        mpxEditor = monaco.editor.create(mpxContainer, {
            value: defaultMpxTemplate,
            language: "html",
            theme: "vs-dark",
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            minimap: { enabled: true },
            wordWrap: "on",
            automaticLayout: true,
        });
    }

    // 创建 Vue 编辑器 (只读)
    const vueContainer = document.getElementById("vue-editor-container");
    if (vueContainer) {
        vueEditor = monaco.editor.create(vueContainer, {
            value: "<!-- Vue 模板将在这里显示... -->",
            language: "html",
            theme: "vs-dark",
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            minimap: { enabled: true },
            wordWrap: "on",
            readOnly: true,
            automaticLayout: true,
        });
    }
}

// Web 界面交互
function initializeApp() {
    // 初始化 Monaco Editor
    initializeMonacoEditors();

    const parseBtn = document.getElementById("parse-btn") as HTMLButtonElement;
    const copyVueBtn = document.getElementById("copy-vue-btn") as HTMLButtonElement;
    const astOutput = document.getElementById("ast-output") as HTMLDivElement;

    // 标签页切换
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = (btn as HTMLElement).dataset.tab;

            // 更新标签按钮状态
            tabBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            // 更新面板显示
            tabPanels.forEach((panel) => panel.classList.remove("active"));
            document.getElementById(`${target}-output`)?.classList.add("active");
        });
    });

    // 解析按钮点击事件
    parseBtn.addEventListener("click", () => {
        const template = mpxEditor.getValue().trim();
        if (!template) {
            alert("请输入 MPX 模板代码！");
            return;
        }
        try {
            const blocks = mpxFileParser(template);
            const templateResult = parseMpxTemplate(template);
            const scriptResult = parseMpxScript(blocks.script || "");
            const styleResult = parseMpxScript(blocks.style || "");
            const jsonResult = blocks.json || "";
            let vueContent = "";
            vueContent += `<template>\n${templateResult}\n</template>\n\n`;
            vueContent += `<script>\n${scriptResult}\n</script>\n\n`;
            vueContent += `<style>\n${styleResult}\n</style>\n\n`;
            vueContent += `<script type="application/json">\n${jsonResult}\n</script>\n`;
            vueEditor.setValue(vueContent);
        } catch (error) {
            console.error("解析失败:", error);
            astOutput.innerHTML = `<div class="error">解析失败: ${error}</div>`;
            vueEditor.setValue(`<!-- 解析失败: ${error} -->`);
        }
    });

    // 复制 Vue 代码按钮
    copyVueBtn.addEventListener("click", async () => {
        const vueCode = vueEditor.getValue();
        if (!vueCode || vueCode.includes("Vue 模板将在这里显示") || vueCode.includes("无法转换模板")) {
            alert("请先解析 MPX 模板！");
            return;
        }

        try {
            await navigator.clipboard.writeText(vueCode);
            copyVueBtn.classList.add("copied");
            copyVueBtn.textContent = "✓ 已复制";

            setTimeout(() => {
                copyVueBtn.classList.remove("copied");
                copyVueBtn.textContent = "📋 复制 Vue 代码";
            }, 2000);
        } catch (error) {
            console.error("复制失败:", error);
            // 降级方案：选择文本
            vueEditor.focus();
            vueEditor.setSelection(vueEditor.getModel()!.getFullModelRange());
            alert("请使用 Ctrl+C (或 Cmd+C) 复制选中的代码");
        }
    });

    // 初始解析默认模板
    setTimeout(() => {
        if (parseBtn) {
            parseBtn.click();
        }
    }, 1000);
}

// DOM 加载完成后初始化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
} else {
    initializeApp();
}
