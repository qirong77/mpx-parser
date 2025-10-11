import { mpxTemplateParser } from "./mpxTemplateParser";

// 测试 MPX 到 Vue 转换功能
console.log('🔄 测试 MPX 到 Vue 模板转换\n');

const testCases = [
  {
    name: '基础 MPX 模板',
    mpx: `<template>
  <view class="container" wx:if="{{ isVisible }}">
    <text bindtap="handleClick">{{ message }}</text>
    <input wx:model="{{ inputValue }}" type="text" />
    <image src="{{ imageUrl }}" />
  </view>
</template>`
  },
  {
    name: '列表渲染',
    mpx: `<view>
  <text wx:for="{{ items }}" wx:key="id" bindtap="onItemClick">
    {{ item.name }}
  </text>
</view>`
  },
  {
    name: '条件渲染和事件绑定',
    mpx: `<view>
  <yks-button wx:if="{{ !isLoggedIn }}" bindtap="login">登录</yks-button>
  <text wx:else>已登录</text>
  <input bindinput="onInput" bindchange="onChange" />
</view>`
  }
];

testCases.forEach((testCase, index) => {
  console.log(`📋 测试 ${index + 1}: ${testCase.name}`);
  console.log('=' .repeat(60));
  
  console.log('🔸 MPX 模板:');
  console.log(testCase.mpx);
  
  try {
    // 解析 MPX 模板
    const result = mpxTemplateParser.parseMpxTemplate(testCase.mpx);
    
    if (result.errors.length > 0) {
      console.log('❌ 解析错误:', result.errors);
    } else {
      // 转换为 Vue 模板
      const vueTemplate = mpxTemplateParser.convertMpxToVue(result.ast);
      
      console.log('\n🔹 Vue 模板:');
      console.log(vueTemplate);
    }
  } catch (error) {
    console.log('❌ 转换失败:', error);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
});

console.log('🎉 MPX 到 Vue 转换测试完成！');