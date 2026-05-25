// Element UI 2.x 文档：组件用法 / 属性 / 事件 / 插槽 / 示例
// 纯离线、本地静态数据
(function () {
    'use strict';

    // ========== 文档数据 ==========
    const DOCS = [
        // ---------- Basic ----------
        {
            cat: 'Basic 基础',
            items: [
                {
                    id: 'button', t: 'Button 按钮',
                    desc: '常用按钮，支持多种类型与尺寸。',
                    code: `<el-button>默认</el-button>
<el-button type="primary">主要</el-button>
<el-button type="success">成功</el-button>
<el-button type="info">信息</el-button>
<el-button type="warning">警告</el-button>
<el-button type="danger">危险</el-button>

<!-- 朴素 / 圆角 / 圆形 / 加载 / 禁用 -->
<el-button type="primary" plain>朴素</el-button>
<el-button type="primary" round>圆角</el-button>
<el-button type="primary" icon="el-icon-search" circle></el-button>
<el-button type="primary" :loading="true">加载中</el-button>
<el-button type="primary" disabled>禁用</el-button>

<!-- 尺寸 -->
<el-button size="medium">中等</el-button>
<el-button size="small">小</el-button>
<el-button size="mini">迷你</el-button>`,
                    attrs: [
                        ['size', '尺寸', 'medium / small / mini', '—'],
                        ['type', '类型', 'primary / success / warning / danger / info / text', '—'],
                        ['plain', '是否朴素按钮', 'Boolean', 'false'],
                        ['round', '是否圆角按钮', 'Boolean', 'false'],
                        ['circle', '是否圆形按钮', 'Boolean', 'false'],
                        ['loading', '是否加载中', 'Boolean', 'false'],
                        ['disabled', '是否禁用', 'Boolean', 'false'],
                        ['icon', '图标类名', 'String', '—'],
                        ['autofocus', '是否默认聚焦', 'Boolean', 'false'],
                        ['native-type', '原生 type', 'button / submit / reset', 'button']
                    ],
                    evts: [['click', '点击时触发', '(event: Event)']],
                    tips: ['用 el-button-group 包裹形成按钮组', '使用 icon 属性内置图标，必须配合 element-icons.css']
                },
                {
                    id: 'icon', t: 'Icon 图标',
                    desc: '直接使用类名展示图标。',
                    code: `<i class="el-icon-edit"></i>
<i class="el-icon-share"></i>
<i class="el-icon-delete"></i>
<el-button icon="el-icon-search">搜索</el-button>

<!-- 自定义大小颜色 -->
<i class="el-icon-loading" style="font-size:24px;color:#409EFF"></i>`,
                    tips: ['Element UI 自带 600+ 图标', '可通过 font-size 调整大小', '配合 :class 实现旋转动画']
                },
                {
                    id: 'layout', t: 'Layout 布局（el-row / el-col）',
                    desc: '24 栅格系统，响应式布局。',
                    code: `<el-row :gutter="20">
  <el-col :span="6"><div class="grid">col-6</div></el-col>
  <el-col :span="6"><div class="grid">col-6</div></el-col>
  <el-col :span="6"><div class="grid">col-6</div></el-col>
  <el-col :span="6"><div class="grid">col-6</div></el-col>
</el-row>

<!-- 响应式 -->
<el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">响应式</el-col>

<!-- 偏移 -->
<el-row>
  <el-col :span="6" :offset="6">偏移 6</el-col>
</el-row>

<!-- 对齐 type=flex -->
<el-row type="flex" justify="space-between" align="middle">
  <el-col :span="6">A</el-col>
  <el-col :span="6">B</el-col>
</el-row>`,
                    attrs: [
                        ['gutter', '栅格间隔', 'Number', '0'],
                        ['type', '布局模式', 'flex（启用 flex）', '—'],
                        ['justify', '水平排列', 'start / end / center / space-around / space-between', 'start'],
                        ['align', '垂直排列', 'top / middle / bottom', 'top'],
                        ['span', '列宽 (1-24)', 'Number', '24'],
                        ['offset', '左侧间隔', 'Number', '0']
                    ],
                    tips: ['el-row 默认基于 24 栅格', 'type="flex" 才支持 justify/align', '响应式断点：xs<768, sm≥768, md≥992, lg≥1200, xl≥1920']
                },
                {
                    id: 'container', t: 'Container 容器',
                    desc: '页面级容器布局：header / aside / main / footer。',
                    code: `<el-container style="height:500px">
  <el-header style="background:#545c64;color:#fff">Header</el-header>
  <el-container>
    <el-aside width="200px" style="background:#ddd">Aside</el-aside>
    <el-main>主内容区</el-main>
  </el-container>
  <el-footer style="background:#eee">Footer</el-footer>
</el-container>`,
                    tips: ['子组件嵌套规则：el-header / el-aside 不能在 el-container 直接同级，需要看父级方向', '默认 flex-direction：含 el-header/el-footer 时为列方向，否则行方向']
                }
            ]
        },
        // ---------- Form ----------
        {
            cat: 'Form 表单',
            items: [
                {
                    id: 'input', t: 'Input 输入框',
                    desc: '常用文本输入，支持前后图标 / 复合型 / 多行。',
                    code: `<el-input v-model="text" placeholder="请输入"></el-input>

<!-- 带图标 -->
<el-input prefix-icon="el-icon-search" v-model="text"></el-input>
<el-input suffix-icon="el-icon-edit" v-model="text"></el-input>

<!-- 密码 + 显示开关 -->
<el-input type="password" v-model="pwd" show-password></el-input>

<!-- 多行 textarea -->
<el-input type="textarea" :rows="4" v-model="content"></el-input>

<!-- 复合型 -->
<el-input v-model="url" placeholder="请输入网址">
  <template slot="prepend">https://</template>
  <template slot="append">.com</template>
</el-input>

<!-- 字数限制 -->
<el-input v-model="text" maxlength="20" show-word-limit></el-input>`,
                    attrs: [
                        ['type', '类型', 'text / textarea / 原生 input type', 'text'],
                        ['v-model / value', '绑定值', 'String / Number', '—'],
                        ['maxlength', '最大长度', 'Number', '—'],
                        ['minlength', '最小长度', 'Number', '—'],
                        ['show-word-limit', '显示字数统计', 'Boolean', 'false'],
                        ['placeholder', '占位符', 'String', '—'],
                        ['clearable', '是否可清空', 'Boolean', 'false'],
                        ['show-password', '密码切换显示', 'Boolean', 'false'],
                        ['disabled', '禁用', 'Boolean', 'false'],
                        ['size', '尺寸', 'medium / small / mini', '—'],
                        ['prefix-icon', '前置图标', 'String', '—'],
                        ['suffix-icon', '后置图标', 'String', '—'],
                        ['rows', 'textarea 行数', 'Number', '2'],
                        ['autosize', 'textarea 自适应', 'Boolean / { minRows, maxRows }', 'false'],
                        ['readonly', '只读', 'Boolean', 'false']
                    ],
                    evts: [
                        ['blur', '失焦时触发', '(event)'],
                        ['focus', '聚焦时触发', '(event)'],
                        ['change', 'value 改变后触发', '(value)'],
                        ['input', '输入时触发', '(value)'],
                        ['clear', '点击清空按钮', '—']
                    ],
                    slts: [
                        ['prefix', '头部内容（仅 type=text）'],
                        ['suffix', '尾部内容（仅 type=text）'],
                        ['prepend', '前置元素'],
                        ['append', '后置元素']
                    ],
                    tips: ['始终使用 v-model 双向绑定', 'clearable 显示清空按钮', 'show-password 仅 type=password']
                },
                {
                    id: 'select', t: 'Select 选择器',
                    desc: '下拉选择，支持单选 / 多选 / 搜索 / 远程搜索。',
                    code: `<!-- 基础 -->
<el-select v-model="value" placeholder="请选择">
  <el-option label="选项1" value="1"></el-option>
  <el-option label="选项2" value="2"></el-option>
</el-select>

<!-- 多选 + 可搜索 -->
<el-select v-model="value" multiple filterable placeholder="请选择">
  <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"></el-option>
</el-select>

<!-- 分组 -->
<el-select v-model="value">
  <el-option-group label="热门" key="hot">
    <el-option label="苹果" value="apple"></el-option>
  </el-option-group>
  <el-option-group label="冷门" key="cold">
    <el-option label="榴莲" value="durian"></el-option>
  </el-option-group>
</el-select>

<!-- 远程搜索 -->
<el-select v-model="value" filterable remote
           :remote-method="remoteSearch"
           :loading="loading">
  <el-option v-for="item in list" :key="item.value" :label="item.label" :value="item.value"></el-option>
</el-select>`,
                    attrs: [
                        ['v-model', '绑定值', '——', '—'],
                        ['multiple', '多选', 'Boolean', 'false'],
                        ['disabled', '禁用', 'Boolean', 'false'],
                        ['clearable', '可清空', 'Boolean', 'false'],
                        ['collapse-tags', '多选时合并标签', 'Boolean', 'false'],
                        ['multiple-limit', '最多选数量 (0=无限制)', 'Number', '0'],
                        ['placeholder', '占位符', 'String', '请选择'],
                        ['filterable', '可搜索', 'Boolean', 'false'],
                        ['allow-create', '允许创建条目', 'Boolean', 'false'],
                        ['remote', '远程搜索', 'Boolean', 'false'],
                        ['remote-method', '远程搜索方法', 'Function', '—'],
                        ['loading', '加载中', 'Boolean', 'false']
                    ],
                    evts: [['change', '值变化', '(value)'], ['visible-change', '下拉显隐', '(visible)'], ['blur', '失焦', '(event)'], ['focus', '聚焦', '(event)'], ['clear', '清空', '—']],
                    tips: ['allow-create 须配合 filterable', '远程搜索需 filterable + remote + remote-method', 'multiple 多选时绑定值为数组']
                },
                {
                    id: 'cascader', t: 'Cascader 级联选择',
                    desc: '多层级选择，常用于省市区。',
                    code: `<el-cascader v-model="value" :options="options" :props="{ checkStrictly: true }"></el-cascader>

<!-- options 结构 -->
data() {
  return {
    value: [],
    options: [
      { value: 'js', label: '前端', children: [
        { value: 'vue', label: 'Vue' },
        { value: 'react', label: 'React' }
      ]}
    ]
  };
}`,
                    attrs: [
                        ['v-model', '绑定值', 'Array', '—'],
                        ['options', '选项数据源', 'Array', '—'],
                        ['props', '配置项', 'Object（expandTrigger, multiple, checkStrictly, emitPath, lazy, lazyLoad, value, label, children, disabled, leaf）', '—'],
                        ['size', '尺寸', '——', '—'],
                        ['filterable', '可搜索', 'Boolean', 'false'],
                        ['clearable', '可清空', 'Boolean', 'false'],
                        ['separator', '分隔符', 'String', ' / ']
                    ],
                    tips: ['props.checkStrictly=true 表示父子节点不关联', 'props.lazy=true 启用动态加载', 'props.emitPath=false 仅返回叶子节点值']
                },
                {
                    id: 'datepicker', t: 'DatePicker 日期选择',
                    desc: '选择日期 / 时间 / 范围。',
                    code: `<el-date-picker v-model="date" type="date" placeholder="选择日期"></el-date-picker>

<!-- 日期 + 时间 -->
<el-date-picker v-model="datetime" type="datetime" placeholder="选择日期时间"></el-date-picker>

<!-- 日期范围 -->
<el-date-picker v-model="range" type="daterange" range-separator="至"
                start-placeholder="开始" end-placeholder="结束"></el-date-picker>

<!-- 月 / 年 / 周 -->
<el-date-picker v-model="m" type="month"></el-date-picker>
<el-date-picker v-model="y" type="year"></el-date-picker>
<el-date-picker v-model="w" type="week" format="第 ww 周"></el-date-picker>

<!-- 格式化 -->
<el-date-picker v-model="date" type="date"
                format="yyyy 年 MM 月 dd 日"
                value-format="yyyy-MM-dd"></el-date-picker>`,
                    attrs: [
                        ['v-model', '绑定值', 'Date / String / Array', '—'],
                        ['type', '类型', 'year / month / date / dates / week / datetime / datetimerange / daterange / monthrange', 'date'],
                        ['format', '显示格式', 'String', 'yyyy-MM-dd'],
                        ['value-format', '绑定值格式', 'String / "timestamp"', '—'],
                        ['placeholder', '占位符', 'String', '—'],
                        ['range-separator', '范围分隔符', 'String', '-'],
                        ['default-value', '默认显示日期', 'Date', '—'],
                        ['picker-options', '快捷选项', 'Object', '—'],
                        ['clearable', '可清空', 'Boolean', 'true']
                    ],
                    tips: ['value-format 推荐设置为 yyyy-MM-dd 字符串便于后端传递', 'picker-options 可定义 disabledDate / shortcuts']
                },
                {
                    id: 'switch', t: 'Switch 开关',
                    desc: '两态切换。',
                    code: `<el-switch v-model="open"></el-switch>

<!-- 自定义颜色和文字 -->
<el-switch v-model="open"
           active-color="#13ce66"
           inactive-color="#ff4949"
           active-text="启用"
           inactive-text="禁用">
</el-switch>

<!-- 自定义 value -->
<el-switch v-model="status" :active-value="'on'" :inactive-value="'off'"></el-switch>`,
                    attrs: [
                        ['v-model', '绑定值', 'Boolean / String / Number', 'false'],
                        ['active-value', '打开时的值', '——', 'true'],
                        ['inactive-value', '关闭时的值', '——', 'false'],
                        ['active-color', '打开背景色', 'String', '#409EFF'],
                        ['inactive-color', '关闭背景色', 'String', '#C0CCDA'],
                        ['active-text', '打开文字', 'String', '—'],
                        ['inactive-text', '关闭文字', 'String', '—'],
                        ['disabled', '禁用', 'Boolean', 'false'],
                        ['width', '宽度（px）', 'Number', '40']
                    ]
                },
                {
                    id: 'checkbox', t: 'Checkbox 多选框',
                    desc: '单个或多个复选。',
                    code: `<!-- 单个 -->
<el-checkbox v-model="checked">备选项</el-checkbox>

<!-- 多个 + group -->
<el-checkbox-group v-model="checkList">
  <el-checkbox label="苹果"></el-checkbox>
  <el-checkbox label="香蕉"></el-checkbox>
  <el-checkbox label="橘子"></el-checkbox>
</el-checkbox-group>

<!-- 按钮样式 -->
<el-checkbox-group v-model="checkList">
  <el-checkbox-button label="A"></el-checkbox-button>
  <el-checkbox-button label="B"></el-checkbox-button>
</el-checkbox-group>

<!-- 全选 / 半选 -->
<el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleAll">全选</el-checkbox>`,
                    tips: ['多个复选必须用 el-checkbox-group 包裹', 'label 既是显示文本也是值（除非另设 true-label / false-label）', 'indeterminate 用于全选三态']
                },
                {
                    id: 'radio', t: 'Radio 单选',
                    desc: '只能选择一个。',
                    code: `<el-radio v-model="r" label="1">选项1</el-radio>
<el-radio v-model="r" label="2">选项2</el-radio>

<el-radio-group v-model="r">
  <el-radio :label="1">男</el-radio>
  <el-radio :label="2">女</el-radio>
</el-radio-group>

<!-- 按钮样式 -->
<el-radio-group v-model="r">
  <el-radio-button label="北京"></el-radio-button>
  <el-radio-button label="上海"></el-radio-button>
</el-radio-group>`
                },
                {
                    id: 'form', t: 'Form 表单（含校验）',
                    desc: '表单容器，集成校验、对齐、标签宽度。',
                    code: `<el-form :model="form" :rules="rules" ref="form" label-width="100px" status-icon>
  <el-form-item label="用户名" prop="username">
    <el-input v-model="form.username"></el-input>
  </el-form-item>
  <el-form-item label="邮箱" prop="email">
    <el-input v-model="form.email"></el-input>
  </el-form-item>
  <el-form-item label="性别" prop="gender">
    <el-radio-group v-model="form.gender">
      <el-radio label="male">男</el-radio>
      <el-radio label="female">女</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item>
    <el-button type="primary" @click="submit">提交</el-button>
    <el-button @click="reset">重置</el-button>
  </el-form-item>
</el-form>

<script>
export default {
  data() {
    return {
      form: { username: '', email: '', gender: '' },
      rules: {
        username: [
          { required: true, message: '必填', trigger: 'blur' },
          { min: 3, max: 12, message: '长度 3-12', trigger: 'blur' }
        ],
        email: [
          { type: 'email', message: '邮箱格式不对', trigger: 'blur' }
        ]
      }
    };
  },
  methods: {
    submit() {
      this.$refs.form.validate(valid => {
        if (valid) this.$message.success('提交成功');
      });
    },
    reset() {
      this.$refs.form.resetFields();
    }
  }
};
</script>`,
                    attrs: [
                        ['model', '表单数据对象', 'Object', '—'],
                        ['rules', '校验规则', 'Object', '—'],
                        ['inline', '行内表单', 'Boolean', 'false'],
                        ['label-position', '标签位置', 'right / left / top', 'right'],
                        ['label-width', '标签宽度', 'String', '—'],
                        ['label-suffix', '标签后缀', 'String', '—'],
                        ['show-message', '显示错误信息', 'Boolean', 'true'],
                        ['inline-message', '错误信息内联', 'Boolean', 'false'],
                        ['status-icon', '校验状态图标', 'Boolean', 'false'],
                        ['validate-on-rule-change', '规则变化时校验', 'Boolean', 'true'],
                        ['size', '默认尺寸', 'medium / small / mini', '—'],
                        ['disabled', '全局禁用', 'Boolean', 'false']
                    ],
                    evts: [['validate', '校验单项后触发', '(prop, isValid, errMsg)']],
                    tips: ['this.$refs.form.validate(cb) 触发整体校验', 'resetFields() 重置 + 清错', 'clearValidate() 仅清错', 'prop 是字段路径，必须与 rules / model 同名']
                }
            ]
        },
        // ---------- Data ----------
        {
            cat: 'Data 数据展示',
            items: [
                {
                    id: 'table', t: 'Table 表格',
                    desc: '数据表格，支持排序、筛选、固定列、合并、自定义模板。',
                    code: `<el-table :data="tableData" border stripe height="400" @selection-change="onSelect">
  <el-table-column type="selection" width="55"></el-table-column>
  <el-table-column type="index" label="#" width="60"></el-table-column>
  <el-table-column prop="name" label="姓名" width="120" sortable></el-table-column>
  <el-table-column prop="age" label="年龄" width="80" sortable></el-table-column>
  <el-table-column label="状态" width="120">
    <template slot-scope="scope">
      <el-tag :type="scope.row.active ? 'success' : 'info'">
        {{ scope.row.active ? '在线' : '离线' }}
      </el-tag>
    </template>
  </el-table-column>
  <el-table-column label="操作" fixed="right" width="160">
    <template slot-scope="{ row, $index }">
      <el-button size="mini" @click="edit(row)">编辑</el-button>
      <el-button size="mini" type="danger" @click="del($index)">删除</el-button>
    </template>
  </el-table-column>
</el-table>`,
                    attrs: [
                        ['data', '数据数组', 'Array', '—'],
                        ['border', '纵向边框', 'Boolean', 'false'],
                        ['stripe', '斑马纹', 'Boolean', 'false'],
                        ['height', '固定高度', 'String / Number', '—'],
                        ['max-height', '最大高度', 'String / Number', '—'],
                        ['size', '尺寸', 'medium / small / mini', '—'],
                        ['fit', '列宽自撑', 'Boolean', 'true'],
                        ['show-header', '显示表头', 'Boolean', 'true'],
                        ['highlight-current-row', '高亮当前行', 'Boolean', 'false'],
                        ['row-key', '行 key', 'Function / String', '—'],
                        ['default-sort', '默认排序', '{ prop, order }', '—'],
                        ['empty-text', '空数据文案', 'String', '暂无数据']
                    ],
                    evts: [
                        ['select', '勾选某行', '(selection, row)'],
                        ['selection-change', '勾选变化', '(selection)'],
                        ['sort-change', '排序变化', '({ column, prop, order })'],
                        ['row-click', '行点击', '(row, column, event)'],
                        ['cell-click', '单元格点击', '(row, column, cell, event)']
                    ],
                    slts: [['empty', '空数据时显示内容'], ['append', '表格末尾追加内容']],
                    tips: ['type="selection" 启用复选框列', 'fixed="left" / "right" 固定列', 'slot-scope="{ row, $index }" 解构访问行数据', 'sortable 默认前端排序，sortable="custom" 触发 sort-change 事件']
                },
                {
                    id: 'pagination', t: 'Pagination 分页',
                    desc: '常用分页控件。',
                    code: `<el-pagination
  @size-change="handleSize"
  @current-change="handlePage"
  :current-page.sync="page"
  :page-sizes="[10, 20, 50, 100]"
  :page-size.sync="pageSize"
  layout="total, sizes, prev, pager, next, jumper"
  :total="total">
</el-pagination>`,
                    attrs: [
                        ['layout', '布局', 'sizes / prev / pager / next / jumper / total / ->', 'prev, pager, next, jumper, ->, total'],
                        ['total', '总条数', 'Number', '—'],
                        ['current-page', '当前页 (.sync)', 'Number', '1'],
                        ['page-size', '每页大小 (.sync)', 'Number', '10'],
                        ['page-sizes', '可选页大小', 'Array', '[10,20,30,40,50,100]'],
                        ['small', '小型分页', 'Boolean', 'false'],
                        ['background', '按钮背景色', 'Boolean', 'false']
                    ],
                    evts: [['current-change', '页码变化', '(page)'], ['size-change', '页大小变化', '(size)']],
                    tips: ['layout 字符串顺序即显示顺序', '"->" 表示后续元素靠右', '推荐使用 .sync 修饰符同步两个分页变量']
                },
                {
                    id: 'tag', t: 'Tag 标签',
                    desc: '用于标记状态。',
                    code: `<el-tag>默认</el-tag>
<el-tag type="success">成功</el-tag>
<el-tag type="info">信息</el-tag>
<el-tag type="warning">警告</el-tag>
<el-tag type="danger">危险</el-tag>

<!-- 可关闭 -->
<el-tag closable @close="handleClose">可删除</el-tag>

<!-- 不同尺寸 -->
<el-tag size="medium">中</el-tag>
<el-tag size="small">小</el-tag>
<el-tag size="mini">迷你</el-tag>

<!-- 主题 -->
<el-tag effect="dark" type="success">深色</el-tag>
<el-tag effect="plain" type="warning">朴素</el-tag>`,
                    attrs: [
                        ['type', '类型', 'success / info / warning / danger', '—'],
                        ['size', '尺寸', 'medium / small / mini', '—'],
                        ['hit', '有边框', 'Boolean', 'false'],
                        ['color', '背景色', 'String', '—'],
                        ['effect', '主题', 'dark / light / plain', 'light'],
                        ['closable', '可关闭', 'Boolean', 'false'],
                        ['disable-transitions', '禁用过渡动画', 'Boolean', 'false']
                    ]
                },
                {
                    id: 'tree', t: 'Tree 树形控件',
                    desc: '展示层级数据。',
                    code: `<el-tree :data="data" :props="defaultProps"
         show-checkbox node-key="id"
         default-expand-all
         @check="onCheck">
</el-tree>

<script>
data() {
  return {
    data: [
      { id: 1, label: '一级 1', children: [
        { id: 11, label: '二级 1-1' }
      ]}
    ],
    defaultProps: { children: 'children', label: 'label' }
  };
}
</script>`,
                    attrs: [
                        ['data', '展示数据', 'Array', '—'],
                        ['props', '配置选项', 'Object { label, children, disabled, isLeaf }', '—'],
                        ['node-key', '唯一 key', 'String', '—'],
                        ['show-checkbox', '显示复选框', 'Boolean', 'false'],
                        ['check-strictly', '父子不关联', 'Boolean', 'false'],
                        ['default-expand-all', '默认展开', 'Boolean', 'false'],
                        ['lazy', '懒加载', 'Boolean', 'false'],
                        ['load', '懒加载函数', 'Function(node, resolve)', '—'],
                        ['accordion', '手风琴', 'Boolean', 'false'],
                        ['draggable', '可拖拽', 'Boolean', 'false']
                    ],
                    evts: [
                        ['node-click', '节点点击', '(data, node, vue)'],
                        ['check', '复选框变化', '(data, { checkedKeys, checkedNodes, halfCheckedKeys, halfCheckedNodes })'],
                        ['current-change', '当前节点变化', '(data, node)']
                    ],
                    tips: ['通过 getCheckedKeys() / setCheckedKeys() 操作勾选', '懒加载需 lazy + load 函数']
                }
            ]
        },
        // ---------- Notice ----------
        {
            cat: 'Notice 反馈',
            items: [
                {
                    id: 'message', t: 'Message 全局消息',
                    desc: '顶部提示，3 秒后自动消失。',
                    code: `// 在 methods 或任意位置调用
this.$message('普通消息');
this.$message.success('成功！');
this.$message.warning('警告！');
this.$message.error('失败！');
this.$message.info('提示');

// 完整配置
this.$message({
  message: '这是一条带配置的消息',
  type: 'success',
  duration: 5000,
  showClose: true,
  center: true,
  dangerouslyUseHTMLString: true
});`,
                    tips: ['message / success / warning / error / info', 'duration=0 永不关闭', 'showClose 显示关闭按钮', '可直接调用返回值的 .close() 方法关闭']
                },
                {
                    id: 'notification', t: 'Notification 通知',
                    desc: '右上角通知，比 Message 更醒目。',
                    code: `this.$notify({
  title: '提醒',
  message: '这是一条通知消息',
  type: 'success',
  duration: 4500,
  position: 'top-right',
  showClose: true
});

this.$notify.success({ title: 'OK', message: '操作成功' });
this.$notify.warning({ title: 'Warning', message: '请注意' });
this.$notify.error({ title: 'Error', message: '出错了' });`,
                    tips: ['position: top-left / top-right / bottom-left / bottom-right', '可使用 dangerouslyUseHTMLString 渲染 HTML']
                },
                {
                    id: 'msgbox', t: 'MessageBox 弹框',
                    desc: 'alert / confirm / prompt 三种形态。',
                    code: `// alert
this.$alert('这是一段内容', '标题', {
  confirmButtonText: '确定',
  callback: action => { console.log(action); }
});

// confirm
this.$confirm('确定删除？', '提示', {
  confirmButtonText: '确定',
  cancelButtonText: '取消',
  type: 'warning'
}).then(() => {
  this.$message.success('已删除');
}).catch(() => {
  this.$message.info('已取消');
});

// prompt
this.$prompt('请输入邮箱', '提示', {
  inputPattern: /^[\\w-]+(\\.[\\w-]+)*@[\\w-]+(\\.[\\w-]+)+$/,
  inputErrorMessage: '邮箱格式不对'
}).then(({ value }) => {
  this.$message.success('邮箱: ' + value);
});`,
                    tips: ['返回 Promise，then 表示确认，catch 表示取消', 'prompt 通过 ({ value }) 获取输入', 'showCancelButton 控制取消按钮']
                },
                {
                    id: 'dialog', t: 'Dialog 对话框',
                    desc: '模态对话框。',
                    code: `<el-button @click="visible = true">打开</el-button>

<el-dialog title="标题" :visible.sync="visible"
           width="500px"
           :close-on-click-modal="false"
           :before-close="onClose">
  <span>这是对话框内容</span>
  <span slot="footer">
    <el-button @click="visible = false">取消</el-button>
    <el-button type="primary" @click="onConfirm">确定</el-button>
  </span>
</el-dialog>`,
                    attrs: [
                        ['visible', '显示 (.sync)', 'Boolean', 'false'],
                        ['title', '标题', 'String', '—'],
                        ['width', '宽度', 'String', '50%'],
                        ['fullscreen', '全屏', 'Boolean', 'false'],
                        ['top', '距顶部', 'String', '15vh'],
                        ['modal', '遮罩层', 'Boolean', 'true'],
                        ['lock-scroll', '锁定 body 滚动', 'Boolean', 'true'],
                        ['close-on-click-modal', '点遮罩关闭', 'Boolean', 'true'],
                        ['close-on-press-escape', 'Esc 关闭', 'Boolean', 'true'],
                        ['show-close', '显示关闭按钮', 'Boolean', 'true'],
                        ['before-close', '关闭前钩子', 'Function(done)', '—'],
                        ['center', '居中布局', 'Boolean', 'false'],
                        ['destroy-on-close', '关闭时销毁子元素', 'Boolean', 'false']
                    ],
                    slts: [['—', '主内容'], ['title', '自定义标题'], ['footer', '底部按钮区']]
                },
                {
                    id: 'loading', t: 'Loading 加载',
                    desc: '指令 / 服务两种用法。',
                    code: `<!-- 指令方式 -->
<el-table v-loading="loading"
          element-loading-text="加载中..."
          element-loading-spinner="el-icon-loading"
          element-loading-background="rgba(0,0,0,0.7)"
          :data="data">
</el-table>

<!-- 服务方式 -->
<script>
const loading = this.$loading({
  lock: true,
  text: '加载中...',
  spinner: 'el-icon-loading',
  background: 'rgba(0,0,0,0.7)'
});
setTimeout(() => loading.close(), 2000);
</script>`,
                    tips: ['v-loading 默认相对父容器，需父容器 position: relative', 'this.$loading() 返回实例，调 .close()']
                }
            ]
        },
        // ---------- Navigation ----------
        {
            cat: 'Navigation 导航',
            items: [
                {
                    id: 'menu', t: 'Menu 导航菜单',
                    desc: '常用顶部 / 侧栏导航。',
                    code: `<el-menu :default-active="active" mode="horizontal" @select="onSelect" background-color="#545c64" text-color="#fff" active-text-color="#ffd04b">
  <el-menu-item index="1">首页</el-menu-item>
  <el-submenu index="2">
    <template slot="title">产品</template>
    <el-menu-item index="2-1">产品 A</el-menu-item>
    <el-menu-item index="2-2">产品 B</el-menu-item>
  </el-submenu>
  <el-menu-item index="3">关于</el-menu-item>
</el-menu>

<!-- 侧栏垂直 -->
<el-menu mode="vertical" :collapse="isCollapse">
  <el-menu-item index="1">
    <i class="el-icon-menu"></i>
    <span slot="title">菜单</span>
  </el-menu-item>
</el-menu>`,
                    attrs: [
                        ['mode', '模式', 'horizontal / vertical', 'vertical'],
                        ['default-active', '默认激活的 index', 'String', '—'],
                        ['default-openeds', '默认展开 submenu', 'Array', '—'],
                        ['unique-opened', '仅展开一个', 'Boolean', 'false'],
                        ['collapse', '折叠（垂直模式）', 'Boolean', 'false'],
                        ['background-color', '背景色', 'String', '#ffffff'],
                        ['text-color', '文字色', 'String', '#303133'],
                        ['active-text-color', '激活文字色', 'String', '#409EFF'],
                        ['router', '启用路由模式', 'Boolean', 'false']
                    ],
                    evts: [['select', '选中', '(index, indexPath)']]
                },
                {
                    id: 'tabs', t: 'Tabs 标签页',
                    desc: '切换面板。',
                    code: `<el-tabs v-model="active" type="card" closable @tab-remove="removeTab">
  <el-tab-pane label="用户" name="user">用户管理</el-tab-pane>
  <el-tab-pane label="角色" name="role">角色管理</el-tab-pane>
  <el-tab-pane label="权限" name="auth" disabled>权限</el-tab-pane>
</el-tabs>`,
                    attrs: [
                        ['v-model', '激活 name', 'String', '—'],
                        ['type', '样式', 'card / border-card', '—'],
                        ['closable', '可关闭', 'Boolean', 'false'],
                        ['addable', '可新增', 'Boolean', 'false'],
                        ['editable', '可新增 + 关闭', 'Boolean', 'false'],
                        ['tab-position', '位置', 'top / right / bottom / left', 'top']
                    ],
                    evts: [['tab-click', '点击', '(pane, event)'], ['tab-remove', '删除', '(name)'], ['tab-add', '新增', '—']]
                },
                {
                    id: 'breadcrumb', t: 'Breadcrumb 面包屑',
                    code: `<el-breadcrumb separator="/">
  <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
  <el-breadcrumb-item>列表</el-breadcrumb-item>
  <el-breadcrumb-item>详情</el-breadcrumb-item>
</el-breadcrumb>`
                },
                {
                    id: 'steps', t: 'Steps 步骤条',
                    code: `<el-steps :active="step" finish-status="success" simple>
  <el-step title="步骤 1"></el-step>
  <el-step title="步骤 2"></el-step>
  <el-step title="步骤 3"></el-step>
</el-steps>`,
                    attrs: [
                        ['active', '当前步骤', 'Number', '0'],
                        ['direction', '方向', 'horizontal / vertical', 'horizontal'],
                        ['process-status', '进行中状态', 'wait / process / finish / error / success', 'process'],
                        ['finish-status', '完成状态', '同上', 'finish'],
                        ['simple', '简洁风格', 'Boolean', 'false']
                    ]
                },
                {
                    id: 'dropdown', t: 'Dropdown 下拉菜单',
                    code: `<el-dropdown @command="handle" trigger="click">
  <span>更多 <i class="el-icon-arrow-down"></i></span>
  <el-dropdown-menu slot="dropdown">
    <el-dropdown-item command="edit">编辑</el-dropdown-item>
    <el-dropdown-item command="del" divided>删除</el-dropdown-item>
  </el-dropdown-menu>
</el-dropdown>`,
                    attrs: [
                        ['type', '类型', 'primary / success / warning / danger / info', '—'],
                        ['size', '尺寸', '——', '—'],
                        ['trigger', '触发', 'hover / click', 'hover'],
                        ['split-button', '左右分割按钮', 'Boolean', 'false'],
                        ['placement', '位置', 'top / top-start / top-end / bottom / bottom-start / bottom-end', 'bottom-end']
                    ],
                    evts: [['command', '点击 item', '(command)'], ['visible-change', '显隐变化', '(visible)']]
                }
            ]
        },
        // ---------- Others ----------
        {
            cat: 'Others 其他',
            items: [
                {
                    id: 'upload', t: 'Upload 上传',
                    code: `<el-upload
  action="/api/upload"
  :data="extraData"
  :headers="{ Authorization: token }"
  list-type="picture-card"
  :limit="3"
  :on-preview="handlePreview"
  :on-success="handleSuccess"
  :on-error="handleError"
  :before-upload="beforeUpload"
  :file-list="fileList"
  multiple
  drag
  accept="image/*">
  <i class="el-icon-plus"></i>
  <div slot="tip">支持 jpg / png，单个文件 ≤ 2MB</div>
</el-upload>`,
                    attrs: [
                        ['action', '上传地址', 'String', '—'],
                        ['headers', '请求头', 'Object', '—'],
                        ['multiple', '多选', 'Boolean', 'false'],
                        ['data', '额外参数', 'Object', '—'],
                        ['name', '上传字段名', 'String', 'file'],
                        ['with-credentials', '跨域携带 cookie', 'Boolean', 'false'],
                        ['show-file-list', '显示文件列表', 'Boolean', 'true'],
                        ['drag', '拖拽上传', 'Boolean', 'false'],
                        ['accept', '接受类型', 'String', '—'],
                        ['limit', '最多上传数', 'Number', '—'],
                        ['list-type', '列表类型', 'text / picture / picture-card', 'text'],
                        ['auto-upload', '自动上传', 'Boolean', 'true'],
                        ['file-list', '默认列表', 'Array', '—'],
                        ['http-request', '自定义上传方法', 'Function', '—'],
                        ['before-upload', '上传前钩子', 'Function(file)', '—'],
                        ['on-success', '成功钩子', 'Function(res, file, list)', '—'],
                        ['on-error', '失败钩子', 'Function(err, file, list)', '—'],
                        ['on-exceed', '超限钩子', 'Function(files, list)', '—']
                    ],
                    tips: ['before-upload 返回 false 取消上传', 'http-request 完全自定义上传逻辑（XHR / axios）']
                },
                {
                    id: 'progress', t: 'Progress 进度条',
                    code: `<el-progress :percentage="50"></el-progress>
<el-progress :percentage="100" status="success"></el-progress>
<el-progress :percentage="50" :stroke-width="20" status="warning"></el-progress>
<el-progress type="circle" :percentage="70"></el-progress>
<el-progress type="dashboard" :percentage="40"></el-progress>`
                },
                {
                    id: 'badge', t: 'Badge 徽章',
                    code: `<el-badge :value="12" class="item">
  <el-button size="small">评论</el-button>
</el-badge>

<el-badge :value="200" :max="99" class="item">
  <el-button size="small">消息</el-button>
</el-badge>

<el-badge is-dot class="item">
  <i class="el-icon-bell"></i>
</el-badge>`
                },
                {
                    id: 'tooltip', t: 'Tooltip 文字提示',
                    code: `<el-tooltip content="提示文字" placement="top">
  <el-button>顶部提示</el-button>
</el-tooltip>

<el-tooltip effect="light" placement="right">
  <div slot="content">支持 <br/> 多行 <br/> 文本</div>
  <el-button>多行</el-button>
</el-tooltip>`,
                    attrs: [
                        ['effect', '主题', 'dark / light', 'dark'],
                        ['content', '内容', 'String', '—'],
                        ['placement', '位置', 'top/top-start/top-end/right/.../left-end', 'bottom'],
                        ['disabled', '禁用', 'Boolean', 'false'],
                        ['offset', '偏移', 'Number', '0'],
                        ['transition', '过渡', 'String', 'el-fade-in-linear'],
                        ['enterable', '鼠标可进入', 'Boolean', 'true'],
                        ['hide-after', '延迟隐藏 ms', 'Number', '0'],
                        ['visible-arrow', '显示箭头', 'Boolean', 'true']
                    ]
                },
                {
                    id: 'popover', t: 'Popover 弹出框',
                    code: `<el-popover placement="top" width="200" trigger="click">
  <p>这是一段内容</p>
  <el-button slot="reference">点击触发</el-button>
</el-popover>`,
                    attrs: [
                        ['trigger', '触发', 'click / focus / hover / manual', 'click'],
                        ['title', '标题', 'String', '—'],
                        ['content', '内容', 'String', '—'],
                        ['width', '宽度', 'String / Number', '150'],
                        ['placement', '位置', '——', 'bottom'],
                        ['disabled', '禁用', 'Boolean', 'false'],
                        ['popper-class', '自定义类名', 'String', '—']
                    ]
                },
                {
                    id: 'card', t: 'Card 卡片',
                    code: `<el-card shadow="hover">
  <div slot="header">
    <span>卡片标题</span>
    <el-button style="float:right" size="mini">操作</el-button>
  </div>
  <div>这里是卡片内容</div>
</el-card>`
                }
            ]
        }
    ];

    // ========== 渲染 ==========
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function buildTable(title, headers, rows) {
        if (!rows || !rows.length) return '';
        const thead = headers.map(h => `<th>${h}</th>`).join('');
        const tbody = rows.map(r => `<tr>${r.map(c => `<td>${typeof c === 'string' ? c.replace(/`([^`]+)`/g, '<code>$1</code>') : escapeHtml(String(c))}</td>`).join('')}</tr>`).join('');
        return `<h3 class="eui-h3">${title}</h3>
            <table class="vp-doc-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
    }

    function init() {
        const sidebar = document.getElementById('eui-sidebar');
        if (!sidebar) return;
        const main = document.getElementById('eui-main');
        const searchEl = document.getElementById('eui-search');

        let currentId = DOCS[0].items[0].id;

        function renderSidebar(filter) {
            const f = (filter || '').trim().toLowerCase();
            const html = DOCS.map(group => {
                const items = group.items.filter(it => !f || it.t.toLowerCase().includes(f) || it.id.includes(f));
                if (!items.length) return '';
                return `<div class="vp-group">
                    <div class="vp-group-title">${group.cat}</div>
                    ${items.map(it => `<div class="vp-item${currentId === it.id ? ' active' : ''}" data-id="${it.id}">${it.t}</div>`).join('')}
                </div>`;
            }).join('');
            sidebar.innerHTML = html || '<div style="color:var(--text-secondary);padding:10px;font-size:12px">无匹配</div>';
            sidebar.querySelectorAll('.vp-item').forEach(el => {
                el.addEventListener('click', () => {
                    currentId = el.getAttribute('data-id');
                    renderSidebar(searchEl.value);
                    loadItem();
                });
            });
        }

        function findItem(id) {
            for (const g of DOCS) {
                const it = g.items.find(x => x.id === id);
                if (it) return it;
            }
            return null;
        }

        function loadItem() {
            const it = findItem(currentId);
            if (!it) { main.innerHTML = ''; return; }

            const tipsHtml = it.tips && it.tips.length
                ? `<div class="eui-tips"><div class="eui-tips-title">💡 提示</div><ul>${it.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`
                : '';

            main.innerHTML = `
                <h2 class="eui-h2">${escapeHtml(it.t)}</h2>
                ${it.desc ? `<p class="eui-desc">${escapeHtml(it.desc)}</p>` : ''}
                <h3 class="eui-h3">用法示例</h3>
                <pre class="eui-code"><code>${escapeHtml(it.code)}</code></pre>
                ${buildTable('Attributes 属性', ['属性', '说明', '类型', '默认值'], it.attrs)}
                ${buildTable('Events 事件', ['事件名', '说明', '回调参数'], it.evts)}
                ${buildTable('Slots 插槽', ['名称', '说明'], it.slts)}
                ${buildTable('Methods 方法', ['方法', '说明', '参数'], it.methods)}
                ${tipsHtml}
            `;
            main.scrollTop = 0;
        }

        // 搜索
        if (searchEl) {
            searchEl.addEventListener('input', () => renderSidebar(searchEl.value));
        }

        renderSidebar('');
        loadItem();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
