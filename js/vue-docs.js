// Vue 2 / Vue 3 速查文档
// 面向初学者：每条目均包含「是什么 / 为什么 / 什么时候用」描述 + 带详细注释的代码示例
(function () {
    'use strict';

    // ========== Vue 2 文档数据 ==========
    const V2 = [
        // ---------- 入门 ----------
        {
            cat: '入门',
            items: [
                {
                    id: 'v2-intro', t: '什么是 Vue？',
                    desc: `Vue 是一套构建用户界面（前端页面）的 JavaScript 框架。
核心思想是「数据驱动视图」：你只需修改数据，Vue 会自动更新页面上对应的内容，不需要手动 document.getElementById(...).innerText = ...。

为什么用 Vue？
1) 上手简单：会 HTML / CSS / JS 就能写
2) 双向绑定：表单数据和变量自动同步
3) 组件化：把页面拆成可复用的小块（按钮、卡片、表单……）
4) 中文文档完善，国内生态成熟

什么时候用？
做"中后台管理系统、移动端 H5、轻量级 SPA"基本都用得上。`,
                    code: `<!-- 一个最简单的 Vue 2 页面（直接用 <script> 引入即可） -->
<!DOCTYPE html>
<html>
<head>
  <!-- 1) 通过 CDN 或本地引入 Vue.js -->
  <script src="https://unpkg.com/vue@2"></script>
</head>
<body>
  <!-- 2) 一个挂载点（Vue 接管这块 DOM） -->
  <div id="app">
    <p>{{ message }}</p>           <!-- {{ }} 是插值语法，把变量显示出来 -->
    <button @click="count++">点了 {{ count }} 次</button>
  </div>

  <script>
    // 3) 创建一个 Vue 实例，告诉它管理哪个 DOM、用什么数据
    new Vue({
      el: '#app',                  // 挂载到 #app 这个元素
      data: {                      // 这里的数据都会变成"响应式"——改了页面自动更新
        message: 'Hello Vue 2',
        count: 0
      }
    });
  </script>
</body>
</html>`,
                    tips: ['data 中的字段必须在初始化时声明，后加的不响应（除非用 this.$set）', 'Vue 2 的入口是 new Vue({...})；Vue 3 是 createApp(...).mount(...)']
                },
                {
                    id: 'v2-options', t: '组件选项总览（最常用的 5 个）',
                    desc: `Vue 2 用「选项式 API」(Options API) 写组件：把数据、方法、生命周期等分门别类放进 export default {} 的不同字段里。

只要记住这 5 个最常用的字段就能写大部分页面：
- data()      ：组件的响应式状态（变量）
- methods     ：方法/事件处理函数
- computed    ：派生数据（依赖变了才重新算）
- watch       ：监听某个数据，变化时触发逻辑
- created/mounted：生命周期钩子（什么时机执行）`,
                    code: `<template>
  <div>
    <input v-model="name">                  <!-- v-model：双向绑定 -->
    <p>你好，{{ greeting }}</p>             <!-- computed -->
    <button @click="reset">重置</button>     <!-- methods -->
  </div>
</template>

<script>
export default {
  // ① 数据：必须写成函数返回对象（组件复用时各自独立）
  data() {
    return { name: '世界', count: 0 };
  },

  // ② 方法：在模板里 @click="reset" 就是调用它
  methods: {
    reset() {
      this.name = '';
      this.count = 0;
    }
  },

  // ③ 派生数据：name 不变时，下次访问 greeting 直接拿缓存
  computed: {
    greeting() {
      return this.name + '！';
    }
  },

  // ④ 监听：count 变化就触发，常用于"数据变了 → 调接口"
  watch: {
    count(newVal, oldVal) {
      console.log('count 从', oldVal, '变成', newVal);
    }
  },

  // ⑤ 生命周期：组件挂到页面后执行，常在这里调接口
  mounted() {
    console.log('组件就绪');
  }
};
</script>`,
                    tips: ['data 必须是函数（return 一个对象）——这是 Vue 2 组件的硬性规定', 'methods 里不能用箭头函数，否则 this 不是组件实例', '这 5 个字段就能覆盖 90% 的业务场景']
                }
            ]
        },
        // ---------- 模板语法 ----------
        {
            cat: '模板语法',
            items: [
                {
                    id: 'v2-interp', t: '插值表达式 {{ }}',
                    desc: `把 JS 变量/表达式的结果显示到页面里，是 Vue 最基础的语法。

是什么：双大括号 {{ }} 表示"这里放一个 JS 表达式的值"。
为什么：让 HTML 静态文本能"嵌入变量"，告别 innerText 拼接。
什么时候用：只要想在页面上显示一个变量的值就用它。

注意：{{ }} 只能写 JS「表达式」，不能写「语句」（如 if、for、return）。`,
                    code: `<template>
  <div>
    <!-- ① 最简单：直接显示变量 -->
    <p>{{ message }}</p>

    <!-- ② 可以写表达式（加减、调用方法、三元运算） -->
    <p>{{ count + 1 }}</p>
    <p>{{ ok ? '通过' : '未通过' }}</p>
    <p>{{ message.split('').reverse().join('') }}</p>   <!-- 字符串反转 -->

    <!-- ③ 想渲染原始 HTML（如带 <b> 标签）要用 v-html -->
    <p v-html="rawHtml"></p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello',
      count: 0,
      ok: true,
      rawHtml: '<b>加粗</b>'
    };
  }
};
</script>`,
                    tips: ['{{ }} 内只能写表达式，不能写 if/for/var 这种语句', '默认会 HTML 转义防止 XSS（黑客注入脚本）', 'v-html 渲染原始 HTML 时要确保内容可信，否则可能被攻击']
                },
                {
                    id: 'v2-bind', t: 'v-bind 属性绑定（简写 :）',
                    desc: `把变量的值动态绑定到 HTML 标签的属性上，比如让 <img> 的 src、<a> 的 href 跟着变量走。

是什么：v-bind:属性名="变量"，简写成 :属性名="变量"。
为什么：HTML 原生 <img src="abc.png"> 中 src 是写死的，没办法跟着 JS 变量动态变。v-bind 让属性"活起来"。
什么时候用：图片地址、链接、动态 class、动态 style、disabled 状态……几乎所有"属性要根据数据变"的场景。`,
                    code: `<template>
  <div>
    <!-- ① 完整写法 vs 简写（推荐简写 :） -->
    <img v-bind:src="imgUrl" v-bind:alt="title">
    <img :src="imgUrl" :alt="title">

    <!-- ② 动态控制元素是否禁用 -->
    <button :disabled="loading">提交</button>

    <!-- ③ 动态 class（对象语法：key 是类名，value 是 true 才加上） -->
    <div :class="{ active: isActive, 'text-danger': hasError }"></div>

    <!-- ④ 动态 class（数组语法：同时加多个） -->
    <div :class="[baseClass, isActive ? 'on' : 'off']"></div>

    <!-- ⑤ 动态行内 style -->
    <div :style="{ color: textColor, fontSize: size + 'px' }"></div>

    <!-- ⑥ 一次绑定多个属性 -->
    <div v-bind="{ id: 'foo', title: '提示' }"></div>
  </div>
</template>`,
                    tips: [':class 优先用「对象语法」，可读性最好', ':style 用驼峰命名：fontSize（不是 font-size）', '简写冒号 : 是日常开发的标准写法，几乎不会写完整的 v-bind:']
                },
                {
                    id: 'v2-on', t: 'v-on 事件监听（简写 @）',
                    desc: `给元素绑定点击、输入、按键等事件，并在事件发生时执行 method。

是什么：v-on:事件名="处理函数"，简写成 @事件名="处理函数"。
为什么：替代原生 addEventListener / onclick，写法更直观，自动绑定 this。
什么时候用：所有用户交互——点击、按键、表单提交、鼠标移入……

修饰符是 Vue 的"语法糖"，比如 @submit.prevent 自动调用 event.preventDefault()。`,
                    code: `<template>
  <div>
    <!-- ① 基本：点击调用方法 -->
    <button v-on:click="greet">问候（完整写法）</button>
    <button @click="greet">问候（简写，推荐）</button>

    <!-- ② 内联表达式：直接写运算 -->
    <button @click="count += 1">{{ count }}</button>

    <!-- ③ 传参：用 $event 拿原生事件对象 -->
    <button @click="say('hello', $event)">传参</button>

    <!-- ④ 事件修饰符：自动处理 preventDefault/stopPropagation -->
    <form @submit.prevent="onSubmit">提交</form>     <!-- 阻止表单刷新页面 -->
    <div @click.stop="onClick">阻止冒泡</div>         <!-- 不冒泡到父元素 -->
    <div @click.self="onlySelf">只点自己触发</div>    <!-- 子元素点击不算 -->
    <div @click.once="onceOnly">只触发一次</div>

    <!-- ⑤ 按键修饰符 -->
    <input @keyup.enter="onEnter">         <!-- 回车键 -->
    <input @keyup.esc="onCancel">          <!-- ESC 键 -->
  </div>
</template>

<script>
export default {
  data() { return { count: 0 }; },
  methods: {
    greet() { alert('Hello'); },
    say(msg, e) { console.log(msg, e.target); }
  }
};
</script>`,
                    tips: ['事件修饰符：.stop .prevent .capture .self .once .passive', '按键修饰符：.enter .tab .esc .space .up .down .left .right .delete', '修饰符可串联：@click.stop.prevent']
                },
                {
                    id: 'v2-if', t: 'v-if / v-else-if / v-else（条件渲染）',
                    desc: `根据变量真假决定要不要渲染某个元素到页面上。

v-if vs v-show 选哪个？
- v-if：条件为 false 时元素不会出现在 DOM 里（彻底不存在）
- v-show：永远渲染，只是用 CSS display: none 隐藏

切换频繁（如 tab 切换）→ v-show（性能好）
条件几乎不变（如权限判断）→ v-if（DOM 更干净）`,
                    code: `<template>
  <div>
    <!-- ① 三段式条件渲染 -->
    <p v-if="score >= 90">优秀</p>
    <p v-else-if="score >= 60">及格</p>
    <p v-else>不及格</p>

    <!-- ② v-show：始终渲染，只切换 display -->
    <p v-show="visible">这段总是在 DOM 里，只是看不到</p>

    <!-- ③ <template> 包裹多个元素，自身不渲染外层标签 -->
    <template v-if="loaded">
      <h1>标题</h1>
      <p>段落</p>
    </template>
  </div>
</template>`,
                    tips: ['频繁切换显示/隐藏用 v-show', '不要把 v-if 和 v-for 写在同一个元素上（Vue 2 中 v-for 优先级更高，会有问题）', '想包裹多个元素而不引入额外 DOM 时用 <template>']
                },
                {
                    id: 'v2-for', t: 'v-for 列表渲染（务必加 :key）',
                    desc: `遍历数组或对象，把每一项渲染成一个 DOM 元素。

是什么：v-for="(item, index) in 数组"，相当于 JS 的 forEach。
为什么：渲染列表（表格行、菜单项、卡片列表）的标准方式。
什么时候用：任何"要把一堆数据展示成多个相似元素"的场景。

为什么必须加 :key？
Vue 用 key 来识别"哪一项是哪一项"，没有 key 时数组变化（增删改顺序）会出现错位 bug。
key 必须是「唯一且稳定」的值——用 item.id 最佳，避免用 index（顺序变了会失效）。`,
                    code: `<template>
  <div>
    <!-- ① 遍历数组（最常用） -->
    <ul>
      <li v-for="(item, idx) in list" :key="item.id">
        {{ idx }} - {{ item.name }}
      </li>
    </ul>

    <!-- ② 遍历对象：拿到 value, key, index -->
    <ul>
      <li v-for="(val, key, i) in user" :key="key">
        {{ i }}. {{ key }}: {{ val }}
      </li>
    </ul>

    <!-- ③ 遍历数字：1 到 5（常用于分页/星级评分） -->
    <span v-for="n in 5" :key="n">{{ n }} </span>

    <!-- ④ 配合 computed 做"过滤"或"排序" -->
    <li v-for="item in activeItems" :key="item.id">{{ item.name }}</li>
  </div>
</template>

<script>
export default {
  data() {
    return {
      list: [{id:1, name:'A'}, {id:2, name:'B'}],
      user: { name: '张三', age: 20 }
    };
  },
  computed: {
    activeItems() {
      return this.list.filter(it => it.active);
    }
  }
};
</script>`,
                    tips: [':key 必须唯一且稳定，强烈推荐用数据的 id 字段', '不要用 index 当 key（数组顺序变化时会出 bug）', '需要过滤/排序时，在 computed 里做，不要直接改原数组']
                },
                {
                    id: 'v2-model', t: 'v-model 双向绑定（表单核心）',
                    desc: `让表单元素（input、select、checkbox 等）和 data 变量「自动同步」。
用户在输入框打字 → 变量自动更新；代码改变量 → 输入框内容自动更新。

是什么：v-model 是 :value + @input 的「语法糖」。
为什么：写表单时不用手动监听 input 事件再 setState，省一大半代码。
什么时候用：所有表单元素——文本框、密码框、勾选、单选、下拉……`,
                    code: `<template>
  <div>
    <!-- ① 文本输入框 -->
    <input v-model="text">
    <textarea v-model="content"></textarea>
    <p>你输入的是：{{ text }}</p>

    <!-- ② 单个复选框（boolean） -->
    <input type="checkbox" v-model="checked">
    <p>是否勾选：{{ checked }}</p>

    <!-- ③ 多个复选框（数组，存的是选中的 value） -->
    <input type="checkbox" value="A" v-model="hobby">
    <input type="checkbox" value="B" v-model="hobby">
    <p>已选：{{ hobby }}</p>     <!-- ['A', 'B'] -->

    <!-- ④ 单选 -->
    <input type="radio" value="m" v-model="gender">男
    <input type="radio" value="f" v-model="gender">女

    <!-- ⑤ 下拉选择 -->
    <select v-model="city">
      <option value="bj">北京</option>
      <option value="sh">上海</option>
    </select>

    <!-- ⑥ 修饰符：让 v-model 自动转换/过滤 -->
    <input v-model.number="age">    <!-- 自动转数字 -->
    <input v-model.trim="name">     <!-- 自动 trim 空格 -->
    <input v-model.lazy="search">   <!-- 失焦才同步（性能优化） -->
  </div>
</template>`,
                    tips: ['v-model 本质 = :value + @input，理解了这点就理解了所有的"自定义 v-model"', '在自定义组件上 v-model 默认绑定 value prop + 触发 input 事件', '.lazy 修饰符可避免每次输入都触发 watch（适合大表单）']
                }
            ]
        },
        // ---------- 数据 & 逻辑 ----------
        {
            cat: '计算属性 & 监听器',
            items: [
                {
                    id: 'v2-computed', t: 'computed 计算属性',
                    desc: `「根据其他数据算出来」的数据，比如「全名 = 姓 + 名」「商品总价 = 数量 × 单价」。

是什么：在组件里声明一个"虚拟字段"，它的值由别的数据自动算出来。
为什么：相比在模板里写 {{ a + b + c }}，computed 更易复用、有「缓存」（依赖不变就不重新算，性能好）。
什么时候用：
- 一个值是由多个 data 推导出来（全名、总价、过滤后的列表）
- 模板里 {{ }} 内的表达式变复杂时，提取成 computed
- 多个地方需要用同一个派生值

vs methods 的区别：methods 每次访问都会重新执行；computed 只在依赖变化时才重算。`,
                    code: `<template>
  <div>
    <input v-model="firstName">
    <input v-model="lastName">

    <!-- 直接当成数据用，不用加括号 -->
    <p>姓名：{{ fullName }}</p>

    <!-- 完整版可以 v-model（带 setter） -->
    <input v-model="combined">
  </div>
</template>

<script>
export default {
  data() {
    return { firstName: '三', lastName: '张' };
  },
  computed: {
    // ① 简写：只声明 getter（最常见）
    fullName() {
      return this.lastName + this.firstName;
    },

    // ② 完整：get + set（可被 v-model 使用）
    combined: {
      get() {
        return this.lastName + ' ' + this.firstName;
      },
      set(v) {
        // v 是用户在 input 输入的新值
        const arr = v.split(' ');
        this.lastName = arr[0];
        this.firstName = arr[1];
      }
    }
  }
};
</script>`,
                    tips: ['computed 有"缓存"——依赖不变时反复访问只执行一次', '依赖必须是响应式数据（在 data / props 里声明的）', '不要在 computed 里做异步、修改其他 data（应该用 watch）']
                },
                {
                    id: 'v2-watch', t: 'watch 监听器',
                    desc: `「监视一个数据，当它变化时执行一段代码」，常用于异步操作（如调接口）和复杂副作用。

是什么：在 watch 里写「字段名: 回调函数」，字段变化时自动调用回调。
为什么：computed 是"算出新值"，watch 是"做点事"（发请求、改其他变量、跳转路由……）。
什么时候用：
- 输入搜索词 → 防抖后调搜索接口
- 路由参数变化 → 重新加载数据
- 表单某字段变 → 联动改另一个字段
- 监听对象的深层属性变化

vs computed 的区别：computed 返回值；watch 不返回值，只"执行副作用"。`,
                    code: `<template>
  <input v-model="keyword" placeholder="输入搜索">
</template>

<script>
export default {
  data() {
    return {
      keyword: '',
      user: { name: '', age: 0 }
    };
  },
  watch: {
    // ① 最简单：监听基础类型
    keyword(newVal, oldVal) {
      console.log('搜索词变了', oldVal, '→', newVal);
      // 这里可以调接口：this.fetchSearch(newVal);
    },

    // ② 深度监听整个对象（默认只监听引用变化）
    user: {
      handler(v) {
        console.log('user 任何属性变了', v);
      },
      deep: true,         // 监听对象内部任何字段变化
      immediate: true     // 组件创建时立即执行一次（不用等变化）
    },

    // ③ 监听对象的某个具体字段（字符串路径）
    'user.name'(v) {
      console.log('只关心 name 变化', v);
    }
  }
};
</script>`,
                    tips: ['deep: true 会有性能消耗，能精确监听某字段就用字符串路径', 'immediate: true 让 watch 在创建时立即执行（常用于初始化加载）', '搜索框监听记得加「防抖」（lodash.debounce），否则每打一个字都发请求']
                }
            ]
        },
        // ---------- 生命周期 ----------
        {
            cat: '生命周期',
            items: [
                {
                    id: 'v2-lifecycle', t: '生命周期钩子（什么时候执行什么）',
                    desc: `组件从「出生 → 挂到页面 → 数据更新 → 销毁」的整个过程中，Vue 在各个时机给你预留了「钩子函数」，你可以在合适的时机做对应的事。

最常用的 3 个：
- created：实例创建好，data/methods 已可用，但 DOM 还没渲染。适合做「初始化、调接口」。
- mounted：DOM 已挂到页面，能拿到 $refs / DOM 元素。适合「操作 DOM、初始化第三方插件（如 ECharts）」。
- beforeDestroy：组件即将销毁，做「清理工作」（清定时器、解绑 window 事件，避免内存泄漏）。

记忆窍门：8 个钩子 = 4 对「before + 完成」，按顺序是 创建 → 挂载 → 更新 → 销毁。`,
                    code: `<script>
export default {
  // ① 创建阶段
  beforeCreate() {
    // 实例刚刚创建，data 还没初始化（this.xxx 是 undefined）
  },
  created() {
    // ✅ data/methods 已可用，DOM 还没渲染
    // 常用：调接口、初始化数据
    this.fetchData();
  },

  // ② 挂载阶段
  beforeMount() {
    // 模板已编译，但还没挂到页面
  },
  mounted() {
    // ✅ DOM 已挂到页面，可访问 this.$refs / this.$el
    // 常用：操作 DOM、初始化 ECharts / 第三方库
    this.chart = echarts.init(this.$refs.chart);
  },

  // ③ 更新阶段（data 变化触发）
  beforeUpdate() {
    // 数据变了，DOM 即将重新渲染
  },
  updated() {
    // DOM 已重新渲染
    // ⚠️ 别在这里改 data，否则会死循环
  },

  // ④ 销毁阶段
  beforeDestroy() {
    // ✅ 组件即将销毁，清理副作用
    clearInterval(this.timer);
    window.removeEventListener('resize', this.onResize);
  },
  destroyed() {
    // 实例已销毁
  },

  // ⑤ keep-alive 缓存组件特有
  activated()   { /* 被 keep-alive 激活时 */ },
  deactivated() { /* 被 keep-alive 缓存时 */ },

  // ⑥ 错误捕获
  errorCaptured(err, vm, info) {
    // 捕获子孙组件抛出的错误
    return false; // 阻止错误继续向上
  }
};
</script>`,
                    tips: ['90% 的场景只需要 created + mounted + beforeDestroy 这三个', '调接口推荐放 created（更早，节省渲染时间）', '操作 DOM 一定要在 mounted（之前 DOM 还没渲染）', '定时器、事件监听记得在 beforeDestroy 清理，否则内存泄漏']
                }
            ]
        },
        // ---------- 组件 ----------
        {
            cat: '组件',
            items: [
                {
                    id: 'v2-component-basic', t: '什么是组件 / 怎么注册',
                    desc: `「组件」= 可复用的页面片段，比如导航栏、卡片、表单。
组件化让代码结构清晰、可维护、可复用——一个项目通常由几十个组件拼装而成。

注册方式有两种：
1) 全局注册：用 Vue.component()，全项目任何地方都能直接用
2) 局部注册：在父组件的 components 字段里声明，只在该父组件里能用（推荐！）

什么时候用：页面里有一块逻辑/UI 是独立的、可能被复用的、或者太大需要拆分的 → 抽成组件。`,
                    code: `<!-- ============ 子组件 MyButton.vue ============ -->
<template>
  <button class="my-btn" @click="$emit('click')">
    <slot>点击</slot>
  </button>
</template>

<script>
export default {
  name: 'MyButton'   // 组件名（调试工具里显示用）
};
</script>


<!-- ============ 父组件 ============ -->
<template>
  <div>
    <!-- 用 PascalCase 或 kebab-case 都行 -->
    <MyButton @click="onClick">保存</MyButton>
    <my-button @click="onClick">删除</my-button>
  </div>
</template>

<script>
// ① 局部注册（推荐：按需引入、可被打包工具 tree-shake）
import MyButton from './MyButton.vue';

export default {
  components: {
    MyButton             // 等价于 MyButton: MyButton
  },
  methods: {
    onClick() { console.log('点了'); }
  }
};
</script>


<!-- ============ 全局注册（一般写在 main.js） ============ -->
<script>
import Vue from 'vue';
import MyButton from './components/MyButton.vue';

// 全局注册后，任何组件不用再 import 就能用
Vue.component('MyButton', MyButton);
</script>`,
                    tips: ['组件名推荐 PascalCase（MyButton）；模板里 PascalCase 和 kebab-case 都识别', '局部注册比全局注册好——按需引入、不污染全局', '只有真正"通用"的组件（如基础按钮、图标）才需要全局注册']
                },
                {
                    id: 'v2-props', t: 'Props 父传子（向下传数据）',
                    desc: `父组件通过 props 把数据传给子组件，子组件接收后只能「读」不能「改」。

是什么：子组件用 props 字段声明自己接受哪些参数；父组件用 :prop名="值" 传入。
为什么：组件解耦——子组件不关心数据从哪来，只负责显示。
什么时候用：所有「父 → 子」数据传递（标题、列表数据、配置项……）。

⚠️ 单向数据流：子组件不能直接修改 props，否则 Vue 会警告。要改请用 $emit 通知父组件去改。`,
                    code: `<!-- ============ 子组件 Child.vue ============ -->
<template>
  <div>{{ title }} - {{ count }}</div>
</template>

<script>
export default {
  props: {
    // ① 简写：只指定类型
    title: String,

    // ② 完整：类型 + 默认值 + 是否必填
    count: {
      type: Number,
      default: 0,
      required: true
    },

    // ③ 对象/数组的默认值必须是「函数」返回
    items: {
      type: Array,
      default: () => []        // ✅ 函数返回
      // default: []           // ❌ 多个实例会共享同一个数组！
    },

    // ④ 自定义校验
    status: {
      type: String,
      validator: v => ['ok', 'fail'].includes(v)
    }
  }
};
</script>


<!-- ============ 父组件 ============ -->
<template>
  <Child
    :title="page"
    :count="num"
    :items="list"
    status="ok"
  />
</template>`,
                    tips: ['不要在子组件里 this.xxx = ... 修改 props（会报错）', '想"修改"props：要么在子组件 data 里复制一份，要么 $emit 通知父级改', 'Object/Array 类型的默认值「必须」用函数返回（避免多实例共享）']
                },
                {
                    id: 'v2-emit', t: '$emit 子传父（向上发事件）',
                    desc: `子组件触发一个「自定义事件」，父组件用 @事件名="处理函数" 监听，从而实现「子→父」通信。

是什么：this.$emit('事件名', 参数) 在子组件里"喊一声"，父组件能听到。
为什么：保持单向数据流——子组件不直接改父组件的数据，而是"请求"父组件去改。
什么时候用：删除按钮告诉父级"请删除这一项"、表单提交告诉父级"用户点了提交"……

vs props：props 是父→子的「数据」；$emit 是子→父的「通知」。`,
                    code: `<!-- ============ 子组件 Child.vue ============ -->
<template>
  <button @click="onClick">删除</button>
</template>

<script>
export default {
  props: ['id'],
  methods: {
    onClick() {
      // 触发一个名叫 'delete' 的事件，把 id 作为参数传出去
      this.$emit('delete', this.id);
    }
  }
};
</script>


<!-- ============ 父组件 ============ -->
<template>
  <Child :id="1" @delete="handleDelete" />
</template>

<script>
export default {
  methods: {
    // 注意：父组件这里能拿到子组件传的参数
    handleDelete(id) {
      console.log('要删除', id);
      // 真正修改数据在这里完成
      this.list = this.list.filter(it => it.id !== id);
    }
  }
};
</script>`,
                    tips: ['事件名推荐 kebab-case（如 user-login）', '可传多个参数：this.$emit("event", a, b, c)', '需要"双向绑定"的属性可用 .sync 修饰符或 v-model（更优雅）']
                },
                {
                    id: 'v2-slot', t: '插槽 slot（自定义子组件内部内容）',
                    desc: `让「父组件能往子组件里"塞"内容」，子组件用 <slot> 占位，父组件写在标签里的内容就会渲染到那个位置。

是什么：<slot> 是子组件内部的"占位符"；父组件写在 <Child>...这里...</Child> 里的内容会替换它。
为什么：比 props 更灵活——可以传整段 HTML、其他组件，而不只是字符串。
什么时候用：通用容器组件（Card、Dialog、Tab）、布局组件——子组件结构固定、内部内容由调用方决定。

三种插槽：
1) 默认插槽：没有 name，匿名
2) 具名插槽：name="header"，按位置分发
3) 作用域插槽：子组件把内部数据"暴露"给父组件用`,
                    code: `<!-- ============ 子组件 Card.vue ============ -->
<template>
  <div class="card">
    <!-- ① 具名插槽：标记 name -->
    <header>
      <slot name="header">默认标题（父级没传时显示）</slot>
    </header>

    <!-- ② 默认插槽：没 name -->
    <main>
      <slot>默认主体内容</slot>
    </main>

    <!-- ③ 作用域插槽：用 :属性="值" 把子组件数据传给父级 -->
    <footer>
      <slot name="footer" :user="currentUser">
        {{ currentUser.name }}
      </slot>
    </footer>
  </div>
</template>

<script>
export default {
  data() {
    return { currentUser: { name: '张三', age: 20 } };
  }
};
</script>


<!-- ============ 父组件使用 ============ -->
<template>
  <Card>
    <!-- 具名插槽：v-slot:header 简写 #header -->
    <template #header>
      <h3>自定义标题</h3>
    </template>

    <!-- 默认插槽：直接写 -->
    <p>这是主体内容</p>

    <!-- 作用域插槽：用 #footer="解构" 接收子组件传来的数据 -->
    <template #footer="{ user }">
      <span>用户：{{ user.name }}（{{ user.age }}岁）</span>
    </template>
  </Card>
</template>`,
                    tips: ['v-slot 简写 #；默认插槽名是 default', '作用域插槽可让父组件"用"子组件的数据，常用于表格的自定义列', '插槽里写默认内容（父级没传时显示），用户体验更好']
                },
                {
                    id: 'v2-eventbus', t: 'EventBus 跨组件通信（兄弟组件传值）',
                    desc: `两个「平级」组件之间传值的简单方案：建一个空 Vue 实例当"广播站"，一个组件 emit、另一个组件 on。

是什么：用一个共享的 Vue 实例做事件总线（Bus）。
为什么：避免数据通过共同祖先一层层传（props drilling）。
什么时候用：小项目、兄弟组件偶尔通信。

⚠️ 大型项目不推荐——事件来源难追踪、容易遗忘 $off 导致内存泄漏。中大型项目用 Vuex / Pinia。`,
                    code: `// ============ bus.js ============
import Vue from 'vue';
export const bus = new Vue();   // 一个空 Vue 实例就行


// ============ 组件 A（发出事件） ============
import { bus } from './bus';

export default {
  methods: {
    notifyOthers() {
      // 广播一个事件，所有订阅方都会收到
      bus.$emit('refresh', { id: 1, msg: '快刷新！' });
    }
  }
};


// ============ 组件 B（接收事件） ============
import { bus } from './bus';

export default {
  mounted() {
    // 订阅事件
    bus.$on('refresh', this.handleRefresh);
  },
  beforeDestroy() {
    // ⚠️ 必须取消订阅，否则组件销毁了还在监听 → 内存泄漏
    bus.$off('refresh', this.handleRefresh);
  },
  methods: {
    handleRefresh(payload) {
      console.log('收到广播', payload);
    }
  }
};`,
                    tips: ['⚠️ 一定要在 beforeDestroy 里 $off，否则内存泄漏', '事件名容易冲突，建议用模块前缀（如 user:login）', '复杂项目用 Vuex（Vue 2）或 Pinia（Vue 3）更规范']
                }
            ]
        },
        // ---------- 内置指令 ----------
        {
            cat: '内置指令',
            items: [
                {
                    id: 'v2-directives', t: '内置指令一览表',
                    desc: `Vue 2 自带的所有「v-」指令汇总，按使用频率从高到低。

记忆窍门：
- 表达类（数据→DOM）：v-text / v-html / v-bind
- 行为类（DOM→事件）：v-on / v-model
- 控制类（DOM 渲染）：v-if / v-show / v-for
- 优化类（编译/缓存）：v-once / v-pre / v-cloak / v-slot`,
                    code: `<!-- ===== 数据展示 ===== -->
v-text          <!-- 等价 {{ }}，但替换整个 textContent -->
v-html          <!-- 渲染原始 HTML（⚠️ 注意 XSS） -->

<!-- ===== 控制渲染 ===== -->
v-show          <!-- 切换 display: none / block -->
v-if            <!-- 条件渲染：false 时元素根本不在 DOM 中 -->
v-else-if       <!-- 配合 v-if -->
v-else          <!-- 配合 v-if -->
v-for           <!-- 列表循环：v-for="item in list" -->

<!-- ===== 绑定 / 事件 ===== -->
v-bind / :      <!-- 属性绑定：:src="url" -->
v-on   / @      <!-- 事件监听：@click="fn" -->
v-model         <!-- 表单双向绑定 -->

<!-- ===== 插槽 ===== -->
v-slot / #      <!-- 插槽：#header -->

<!-- ===== 性能 / 编译 ===== -->
v-pre           <!-- 跳过该元素的编译（性能优化） -->
v-cloak         <!-- 配合 [v-cloak]{display:none} 防止 {{ }} 闪烁 -->
v-once          <!-- 只渲染一次，之后数据变化也不更新（性能优化） -->`,
                    tips: ['用得最多：v-if / v-for / v-bind / v-on / v-model', 'v-cloak 防闪烁：在 CSS 里 [v-cloak]{display:none}', 'v-once 用于"内容只渲染一次"，如版权信息']
                }
            ]
        }
    ];

    // ========== Vue 3 文档数据 ==========
    const V3 = [
        // ---------- 入门 ----------
        {
            cat: '入门',
            items: [
                {
                    id: 'v3-vs-v2', t: 'Vue 3 vs Vue 2 主要区别',
                    desc: `Vue 3 不是简单升级，它换了一套"写组件的方式"，但对模板语法影响不大（v-if/v-for/v-model 全保留）。

主要变化：
1) 新的写法：组合式 API（Composition API） + <script setup>，把"data/methods/computed/watch"全部用函数替代
2) 入口变化：new Vue() → createApp()
3) 多个根节点：Vue 3 模板里可以直接写多个并列元素，不用包一层 <div>
4) 响应式底层改用 Proxy（性能更好、支持 Map/Set）
5) Vue 2 中 this.$set 不再需要，直接赋值就响应
6) 改名：beforeDestroy → onBeforeUnmount；destroyed → onUnmounted
7) 新增：Teleport（传送门）、Suspense（异步组件加载）、Fragment（多根节点）

「选项式 API」(Vue 2 风格) 在 Vue 3 中依然可用，但官方推荐「组合式 API」更适合复杂组件。`,
                    code: `// ============ Vue 2 写法 ============
export default {
  data() { return { count: 0 }; },
  computed: { double() { return this.count * 2; } },
  methods: {
    increment() { this.count++; }
  },
  mounted() { console.log('mounted'); }
};


// ============ Vue 3 组合式 API + <script setup> ============
<script setup>
import { ref, computed, onMounted } from 'vue';

const count = ref(0);                           // 替代 data
const double = computed(() => count.value * 2); // 替代 computed
function increment() { count.value++; }         // 替代 methods
onMounted(() => console.log('mounted'));        // 替代生命周期
// 不用 export，顶层变量自动暴露给模板
</script>


// ============ Vue 3 也支持 Vue 2 写法（选项式 API） ============
<script>
export default {
  data() { return { count: 0 }; },
  // ... 跟 Vue 2 完全一样
};
</script>`,
                    tips: ['新项目首选 Vue 3 + <script setup> + TypeScript', '老项目升级要看：Element UI → Element Plus，Vuex → Pinia', 'Vue 2 的写法在 Vue 3 里依然能用，迁移成本不高', 'API 全部支持中文文档：cn.vuejs.org']
                }
            ]
        },
        // ---------- 基础 ----------
        {
            cat: '基础',
            items: [
                {
                    id: 'v3-setup', t: '<script setup> 写法（Vue 3 推荐）',
                    desc: `Vue 3.2+ 推荐的最简写法，所有声明的变量/函数都自动暴露给模板，不用 return。

是什么：在 <script> 标签上加 setup 属性，里面是组合式 API 风格的代码。
为什么：比"组合式 API + setup()" 写法少一半样板代码，是目前最简洁的方式。
什么时候用：新写的 Vue 3 组件都推荐这个写法。

核心规则：
- ref(初始值) 包基础类型（数字、字符串、布尔）；用 .value 读写（模板里自动解包）
- reactive(对象) 包对象；直接 obj.xxx 访问
- 顶层声明的变量、函数、import 的组件自动可在模板使用`,
                    code: `<template>
  <div>
    <!-- 模板里直接用 ref 变量，会自动 .value -->
    <p>{{ message }}</p>
    <button @click="increment">点击 {{ count }} 次</button>

    <!-- 子组件 import 后直接用，不需要 components 注册 -->
    <ChildComp />
  </div>
</template>

<script setup>
// 1) 引入需要的 API
import { ref, computed, onMounted } from 'vue';
// 2) 引入子组件——直接 import 即可使用
import ChildComp from './ChildComp.vue';

// 3) 顶层声明 = 模板可用
const message = ref('Hello Vue 3');   // 基础类型用 ref
const count = ref(0);

// computed 也是函数式
const double = computed(() => count.value * 2);

// 方法直接写函数
function increment() {
  count.value++;                      // 注意 JS 中要 .value
}

// 生命周期是函数
onMounted(() => {
  console.log('组件挂载完毕');
});
</script>`,
                    tips: ['JS 中读写 ref 必须用 .value；模板里自动解包', '不用写 export default、不用 return、不用 components 注册', '子组件 import 后直接使用——Vue 3 编译器会自动处理']
                },
                {
                    id: 'v3-ref-reactive', t: 'ref vs reactive（响应式两兄弟）',
                    desc: `Vue 3 用这两个 API 创建响应式状态（变量），但适用场景不同。

ref(value)：
- 适合「基础类型」(Number、String、Boolean) 或想要整体替换的对象
- JS 中通过 .value 访问；模板里自动 .value
- 可以整体替换：count.value = 100

reactive(object)：
- 适合「对象」(Object、Array、Map、Set)
- 直接 obj.xxx 访问，不用 .value
- 不能整体替换（会断响应），只能改属性

新手建议：统一用 ref。理由：写法一致、JS 里都用 .value，少踩坑。`,
                    code: `import { ref, reactive, toRefs, readonly } from 'vue';

// ============ ref：基础类型 ============
const count = ref(0);
console.log(count.value);    // JS 中：用 .value 访问
count.value++;               // 修改
// 模板里：{{ count }} 自动解包

// ref 也能包对象（但内部还是用 reactive 实现）
const user = ref({ name: '张三' });
user.value.name = '李四';
user.value = { name: '王五' };   // ✅ 可以整体替换


// ============ reactive：对象 ============
const state = reactive({
  user: { name: '张三', age: 20 },
  list: []
});

state.user.age = 21;          // ✅ 直接改属性
state.list.push('新数据');     // ✅ 数组方法也响应

// ⚠️ 不能整体替换
// state = { user: {...} };    // ❌ 报错（const）
// Object.assign(state, {...}) // ✅ 可以这样合并


// ============ toRefs：解构时保持响应性 ============
const { user, list } = state;          // ❌ 解构后 user/list 不是响应式
const { user: u, list: l } = toRefs(state);  // ✅ 用 toRefs 后是 ref


// ============ readonly：只读响应式 ============
const ro = readonly(state);
// ro.user.age = 99;           // ⚠️ 会警告，不会真的改`,
                    tips: ['新手统一用 ref 最省心', 'reactive 不能整体替换，否则会"断响应"', '解构 reactive 对象用 toRefs，否则失去响应性', '判断变量是否 ref 用 isRef()；ref 解包用 unref()']
                },
                {
                    id: 'v3-computed-watch', t: 'computed / watch / watchEffect',
                    desc: `Vue 3 组合式 API 的派生数据 + 监听三剑客。

computed(() => 表达式)：
- 跟 Vue 2 computed 一样，有缓存
- 返回的是 ref，访问要 .value

watch(数据, 回调)：
- 显式声明要监听哪个数据
- 回调能拿到 newValue 和 oldValue

watchEffect(回调)：
- 不用声明依赖，自动追踪用到的响应式数据
- 立即执行一次
- 拿不到 oldValue

什么时候用谁？
- 派生数据 → computed
- 数据变化做副作用，需要 oldValue → watch
- 副作用 + 想自动追踪依赖 → watchEffect`,
                    code: `import { ref, computed, watch, watchEffect } from 'vue';

const x = ref(1);
const y = ref(2);

// ============ computed：派生数据，有缓存 ============
const sum = computed(() => x.value + y.value);
console.log(sum.value);    // 3（访问要 .value）

// computed 完整版（get + set）
const total = computed({
  get: () => x.value + y.value,
  set: (v) => {
    x.value = v / 2;
    y.value = v / 2;
  }
});


// ============ watch：显式监听 ============
// ① 监听单个 ref
watch(x, (newVal, oldVal) => {
  console.log('x 变了', oldVal, '→', newVal);
});

// ② 监听多个，回调参数变成数组
watch([x, y], ([nx, ny], [ox, oy]) => {
  console.log('x 或 y 变了');
});

// ③ 监听对象的某个属性：用 () => xxx 包一层
const user = ref({ name: '' });
watch(() => user.value.name, (val) => {
  console.log('name 变了', val);
});

// ④ 深度监听 + 立即执行
watch(user, (val) => {}, {
  deep: true,           // 监听对象内部变化
  immediate: true       // 立即执行一次
});


// ============ watchEffect：自动追踪依赖 ============
watchEffect(() => {
  // 用到的 x.value、y.value 会被自动追踪
  console.log('x + y =', x.value + y.value);
});
// 立即执行一次；之后只要 x 或 y 变就重新执行
// ⚠️ 拿不到 oldValue`,
                    tips: ['computed 是 ref，模板里自动解包；JS 里要 .value', 'watch 监听 reactive 对象的属性要用 () => obj.xxx 包一层', 'watchEffect 适合"日志、副作用"；watch 适合"需要新旧对比的逻辑"']
                }
            ]
        },
        // ---------- 生命周期 ----------
        {
            cat: '生命周期',
            items: [
                {
                    id: 'v3-lifecycle', t: '生命周期钩子（onXxx 函数式）',
                    desc: `Vue 3 组合式 API 把生命周期改成「函数」，名字加 on 前缀，必须在 setup 顶层同步调用。

变化对照表（Vue 2 → Vue 3）：
- beforeCreate / created → setup() 直接写（这就是入口）
- beforeMount  → onBeforeMount
- mounted      → onMounted          ⭐ 最常用
- beforeUpdate → onBeforeUpdate
- updated      → onUpdated
- beforeDestroy → onBeforeUnmount   ⚠️ 改名！
- destroyed    → onUnmounted        ⚠️ 改名！

其他场景：
- onActivated / onDeactivated：keep-alive 缓存的组件
- onErrorCaptured：捕获子孙错误`,
                    code: `<script setup>
import {
  onBeforeMount, onMounted,
  onBeforeUpdate, onUpdated,
  onBeforeUnmount, onUnmounted,
  onActivated, onDeactivated,
  onErrorCaptured
} from 'vue';

// 在 <script setup> 顶层（或 setup() 函数内）直接调用
onMounted(() => {
  // ✅ DOM 已挂载，最常用
  // 例：调接口、初始化 ECharts
  console.log('mounted');
});

onUnmounted(() => {
  // ✅ 清理副作用：定时器、事件监听
  clearInterval(timer);
});

// ⚠️ 不能放在 if / 异步回调里！
// if (xxx) onMounted(...);   // ❌ 错误
// setTimeout(() => onMounted(...));  // ❌ 错误

// ⚠️ 多次调用 = 多次注册（会按顺序都执行）
onMounted(() => console.log('A'));
onMounted(() => console.log('B'));
// 输出：A B（不是覆盖，是按注册顺序执行）
</script>`,
                    tips: ['onXxx 必须在 setup 顶层同步调用，不能放在 if / 异步函数里', '可以多次注册同一个钩子（按顺序执行），方便拆分逻辑', 'Vue 2 的 beforeDestroy / destroyed 改名为 onBeforeUnmount / onUnmounted']
                }
            ]
        },
        // ---------- 组件通信 ----------
        {
            cat: '组件通信',
            items: [
                {
                    id: 'v3-props-emit', t: 'defineProps / defineEmits（编译宏）',
                    desc: `在 <script setup> 中声明 props 和 emit 的方式。

defineProps：声明组件接收哪些参数（功能等价于 Vue 2 的 props 字段）
defineEmits：声明组件会触发哪些事件（功能等价于 Vue 2 的 emit）

特点：
1) 是「编译宏」（compiler macro），不用 import，编译器自动处理
2) 支持运行时声明（对象语法）和类型声明（TS 泛型）
3) defineProps 返回的 props 对象不可直接解构（会失去响应性，要用 toRefs）`,
                    code: `<!-- ============ 子组件 ============ -->
<template>
  <div>
    <h3>{{ title }} - {{ count }}</h3>
    <button @click="onClick">删除</button>
  </div>
</template>

<script setup>
// ① 运行时声明（推荐 JS 用户）
const props = defineProps({
  title: String,
  count: { type: Number, default: 0, required: true }
});

// ② TypeScript 类型声明（推荐 TS 用户）
// const props = defineProps<{
//   title: string;
//   count?: number;
// }>();

// ③ TS + 默认值
// const props = withDefaults(
//   defineProps<{ title: string; count?: number }>(),
//   { count: 0 }
// );

// ④ defineEmits：声明会触发的事件
const emit = defineEmits(['delete', 'update']);

function onClick() {
  // 触发事件 + 传参
  emit('delete', props.count);
}

// ⚠️ 不能直接解构 props（失去响应性）
// const { title } = props;       // ❌
// const { title } = toRefs(props);   // ✅ 用 toRefs

// ⚠️ 子组件不能修改 props
// props.title = 'new';         // ❌ 会报错
</script>


<!-- ============ 父组件 ============ -->
<template>
  <Child
    title="标题"
    :count="num"
    @delete="handleDelete"
  />
</template>

<script setup>
function handleDelete(id) {
  console.log('删除', id);
}
</script>`,
                    tips: ['defineProps / defineEmits 不用 import，是编译时处理的宏', '想保留响应性的解构用 toRefs(props)', 'TS 项目优先用 withDefaults + 泛型语法（类型安全）']
                },
                {
                    id: 'v3-vmodel', t: 'v-model（父子双向绑定）',
                    desc: `让父子组件之间的某个值「双向同步」——子组件改了，父组件也变。

Vue 3 v-model 默认约定：
- prop 名：modelValue
- 事件名：update:modelValue

可以定义多个 v-model：
- <Comp v-model:title="..." v-model:count="..." />
- 对应 prop "title" + 事件 "update:title"

什么时候用：自定义输入框、Toggle 开关、自定义 Select……所有"父级想绑值的"组件。`,
                    code: `<!-- ============ 子组件 MyInput.vue ============ -->
<template>
  <input
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  >
</template>

<script setup>
defineProps(['modelValue']);
defineEmits(['update:modelValue']);
</script>


<!-- ============ 父组件 ============ -->
<template>
  <!-- 跟原生 input 一样用 v-model -->
  <MyInput v-model="text" />
  <p>你输入的：{{ text }}</p>
</template>

<script setup>
import { ref } from 'vue';
import MyInput from './MyInput.vue';

const text = ref('');
</script>


<!-- ============ 多个 v-model（高级用法） ============ -->
<!-- 父组件 -->
<UserForm
  v-model:name="form.name"
  v-model:age="form.age"
/>

<!-- 子组件 UserForm.vue -->
<template>
  <input :value="name" @input="$emit('update:name', $event.target.value)">
  <input :value="age"  @input="$emit('update:age',  +$event.target.value)">
</template>

<script setup>
defineProps(['name', 'age']);
defineEmits(['update:name', 'update:age']);
</script>`,
                    tips: ['Vue 3 默认 prop 是 modelValue（Vue 2 是 value）', '多个 v-model 用 v-model:别名 区分', '别忘了在 defineEmits 里声明事件，否则 IDE 没提示']
                },
                {
                    id: 'v3-provide-inject', t: 'provide / inject 跨层级注入',
                    desc: `祖先组件「埋一个值」，任意深度的后代「挖出来用」，避免 props 一层一层往下传。

是什么：provide(key, value) 在祖先注入；inject(key, default) 在后代取出。
为什么：解决 props drilling——比如 App → Layout → Header → Avatar 要传 userInfo，没必要每层都写 props。
什么时候用：
- 主题/语言/用户信息等"全局"数据
- 组件库内部父子约定（如 Form 和 FormItem）
- 想做轻量版"状态管理"时

⚠️ provide 的值不会自动响应，要响应性的话注入 ref / reactive 对象。`,
                    code: `<!-- ============ 祖先组件 ============ -->
<script setup>
import { provide, ref } from 'vue';

const theme = ref('dark');

// ① 注入响应式 ref（后代修改会同步）
provide('theme', theme);

// ② 注入修改方法（保护性更好，只暴露 setter）
provide('setTheme', (v) => {
  theme.value = v;
});

// ③ 用 Symbol 作 key 避免命名冲突（库开发推荐）
import { themeKey } from './keys';
provide(themeKey, theme);
</script>


<!-- ============ 后代组件（任意深度） ============ -->
<template>
  <div>
    <p>当前主题：{{ theme }}</p>
    <button @click="setTheme('light')">切换</button>
  </div>
</template>

<script setup>
import { inject } from 'vue';

// ① 取值；第二个参数是"祖先没提供时"的默认值
const theme = inject('theme', 'light');

// ② 取方法
const setTheme = inject('setTheme');

// ③ 标记为只读，防止后代意外修改（推荐）
import { readonly } from 'vue';
const theme = readonly(inject('theme'));
</script>`,
                    tips: ['注入响应式 ref / reactive，后代才能享受响应性', '推荐"祖先提供 setter 方法"，比"后代直接改 ref"更可控', '大项目用 Pinia 替代 provide/inject（更专业的状态管理）']
                }
            ]
        },
        // ---------- 其他 ----------
        {
            cat: '其他',
            items: [
                {
                    id: 'v3-template-ref', t: 'template ref（拿到 DOM / 子组件实例）',
                    desc: `在模板里给元素加 ref="名字"，在 JS 里声明 const 名字 = ref(null)，就能拿到对应的 DOM 元素或子组件实例。

什么时候用：
- 让 input 自动聚焦
- 调用 video.play()、canvas.getContext()
- 调用子组件暴露的方法（如 form.validate()）

注意：必须在 onMounted 之后才能访问，否则是 null。`,
                    code: `<template>
  <input ref="inputEl" placeholder="点按钮自动聚焦">
  <ChildComp ref="childEl" />
  <button @click="focusInput">聚焦输入框</button>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ChildComp from './ChildComp.vue';

// ⚠️ ref 变量名必须与模板中的 ref="xxx" 同名
const inputEl = ref(null);
const childEl = ref(null);

onMounted(() => {
  // ✅ DOM 挂载后才能拿到
  inputEl.value.focus();

  // 调用子组件暴露的方法
  childEl.value.someMethod();
});

function focusInput() {
  inputEl.value.focus();
}

// ============ v-for 中的 ref ============
// <li v-for="(item, i) in list" :ref="setItemRef">
// const itemRefs = ref([]);
// function setItemRef(el) { if (el) itemRefs.value.push(el); }
</script>


<!-- ============ 子组件想暴露方法 ============ -->
<script setup>
function someMethod() {
  console.log('子组件方法被调用');
}

// 默认 <script setup> 是封闭的，需要用 defineExpose 显式暴露
defineExpose({ someMethod });
</script>`,
                    tips: ['ref 变量名必须与 ref="xxx" 同名', '必须在 onMounted 之后访问（之前是 null）', '<script setup> 中子组件的方法/数据要用 defineExpose 才能被父组件访问']
                },
                {
                    id: 'v3-teleport', t: 'Teleport 传送门（把 DOM 渲染到任意位置）',
                    desc: `把一段模板「传送」到 DOM 的任意位置（通常是 <body>），但组件的父子关系、数据流不变。

是什么：用 <Teleport to="目标选择器"> 包裹要"传送"的内容。
为什么：解决 Modal/Dialog/Tooltip 这类组件的 z-index 层级问题——它们应该挂在 body 下，而不是嵌在某个 overflow:hidden 的容器里。
什么时候用：弹窗、抽屉、消息提示、Tooltip、右键菜单……`,
                    code: `<template>
  <div class="some-container" style="overflow:hidden">
    <button @click="open = true">打开对话框</button>

    <!--
      Teleport：把 .modal-overlay 这段 DOM 实际渲染到 body 下
      但它依然是当前组件的子节点（事件、数据正常）
    -->
    <Teleport to="body">
      <div v-if="open" class="modal-overlay">
        <div class="modal">
          <h3>这是对话框</h3>
          <p>即使父容器 overflow: hidden 我也不会被裁掉</p>
          <button @click="open = false">关闭</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const open = ref(false);
</script>

<style>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>`,
                    tips: ['to 接 CSS 选择器（#id、.class、body 都行）', '父子关系、props/emit、provide/inject 全部不变——只是 DOM 位置变了', '可加 disabled 属性临时禁用传送（条件控制）']
                },
                {
                    id: 'v3-suspense', t: '<Suspense> 异步组件加载',
                    desc: `给异步加载的组件提供「加载中」占位 UI，等加载完了再显示真实内容。

是什么：内置组件 <Suspense>，配合 defineAsyncComponent 或 async setup() 使用。
为什么：异步组件需要时间下载/执行，用户看到的是空白——Suspense 让我们能优雅地显示 loading。
什么时候用：路由懒加载组件、大型组件按需加载、setup 中有 await 的组件。

⚠️ 仍标记为「实验性」API，但已经很稳定，生产可用。`,
                    code: `<template>
  <Suspense>
    <!-- ① default 插槽：异步组件加载完后显示的内容 -->
    <template #default>
      <AsyncComponent />
    </template>

    <!-- ② fallback 插槽：异步加载期间的占位 UI -->
    <template #fallback>
      <div class="loading">加载中...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';

// 异步组件：浏览器实际请求 Heavy.vue 的 JS 文件
const AsyncComponent = defineAsyncComponent(
  () => import('./Heavy.vue')
);
</script>


<!-- ============ async setup() 也能配合 Suspense ============ -->
<!-- 子组件 UserDetail.vue -->
<script setup>
const user = await fetch('/api/user').then(r => r.json());
// setup 是 async 的，组件会"等" Promise resolve 后才渲染
</script>


<!-- 父组件 -->
<Suspense>
  <UserDetail />
  <template #fallback>加载用户信息中...</template>
</Suspense>`,
                    tips: ['async setup() + Suspense 是非常优雅的"异步数据获取"方案', 'fallback 要简洁——不要在 fallback 里也写复杂组件', '可配合 ErrorBoundary（自己实现）处理加载失败']
                }
            ]
        }
    ];

    function escapeHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ========== 渲染 ==========
    function init() {
        const sidebar = document.getElementById('vd-sidebar');
        if (!sidebar) return;
        const main = document.getElementById('vd-main');
        const verSel = document.getElementById('vd-ver');
        const search = document.getElementById('vd-search');

        let DATA = V2;
        let currentId = null;

        function renderSidebar(kw = '') {
            const lower = kw.toLowerCase().trim();
            sidebar.innerHTML = DATA.map(group => {
                const items = group.items.filter(it =>
                    !lower || it.t.toLowerCase().includes(lower) ||
                    it.id.includes(lower) || (it.desc || '').toLowerCase().includes(lower)
                );
                if (!items.length) return '';
                return `<div class="vp-group">
                    <div class="vp-group-title">${escapeHtml(group.cat)}</div>
                    ${items.map(it => `<div class="vp-item${currentId === it.id ? ' active' : ''}" data-id="${it.id}">${escapeHtml(it.t)}</div>`).join('')}
                </div>`;
            }).join('');
            sidebar.querySelectorAll('.vp-item').forEach(el => {
                el.addEventListener('click', () => {
                    for (const g of DATA) {
                        const it = g.items.find(x => x.id === el.dataset.id);
                        if (it) { loadItem(it); return; }
                    }
                });
            });
        }

        function loadItem(it) {
            currentId = it.id;
            const tips = (it.tips && it.tips.length)
                ? `<div class="vd-tips"><div class="vd-tips-title">💡 要点</div><ul>${it.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`
                : '';
            main.innerHTML = `
                <h2 class="vd-h2">${escapeHtml(it.t)}</h2>
                <div class="vd-desc">${escapeHtml(it.desc)}</div>
                <h3 class="vd-h3">代码示例</h3>
                <pre class="vd-code"><code>${escapeHtml(it.code)}</code></pre>
                ${tips}
            `;
            // 滚动回顶部，避免长内容切换后停在中间
            main.scrollTop = 0;
            sidebar.querySelectorAll('.vp-item').forEach(el => el.classList.toggle('active', el.dataset.id === it.id));
        }

        function switchVer() {
            DATA = verSel.value === '3' ? V3 : V2;
            currentId = null;
            renderSidebar(search.value);
            // 默认加载第一个
            if (DATA[0] && DATA[0].items[0]) loadItem(DATA[0].items[0]);
        }

        verSel.addEventListener('change', switchVer);
        search.addEventListener('input', () => renderSidebar(search.value));
        switchVer();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
