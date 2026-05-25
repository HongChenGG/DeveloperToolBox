// Element UI 在线 Playground：完整组件目录 + iframe 实时预览
(function () {
    'use strict';

    // ===== 完整组件目录（按 Element UI 官网分类）=====
    const CATALOG = [
        {
            cat: 'Basic 基础',
            items: [
                { id: 'button', t: 'Button 按钮', d: '常用的操作按钮',
                  code: `<div>\n  <el-button>默认按钮</el-button>\n  <el-button type="primary">主要按钮</el-button>\n  <el-button type="success">成功按钮</el-button>\n  <el-button type="info">信息按钮</el-button>\n  <el-button type="warning">警告按钮</el-button>\n  <el-button type="danger">危险按钮</el-button>\n  <el-button plain>朴素按钮</el-button>\n  <el-button round>圆角按钮</el-button>\n  <el-button circle icon="el-icon-search"></el-button>\n  <el-button :loading="true" type="primary">加载中</el-button>\n</div>`,
                  props: 'size/type/plain/round/circle/loading/disabled/icon/autofocus/native-type', events: 'click', slots: 'default' },
                { id: 'link', t: 'Link 文字链接', d: '文字超链接',
                  code: `<div>\n  <el-link>默认链接</el-link>\n  <el-link type="primary">主要</el-link>\n  <el-link type="success">成功</el-link>\n  <el-link type="warning">警告</el-link>\n  <el-link type="danger">危险</el-link>\n  <el-link type="info">信息</el-link>\n  <el-link underline href="https://element.eleme.cn" target="_blank">带下划线</el-link>\n  <el-link disabled>禁用状态</el-link>\n</div>`,
                  props: 'type/underline/disabled/href/icon', events: 'click' },
                { id: 'layout', t: 'Layout 布局', d: '24 栅格快速布局',
                  code: `<div>\n  <el-row :gutter="20">\n    <el-col :span="6"><div style="background:#d3dce6;padding:20px;text-align:center">col-6</div></el-col>\n    <el-col :span="6"><div style="background:#99a9bf;padding:20px;text-align:center">col-6</div></el-col>\n    <el-col :span="6"><div style="background:#d3dce6;padding:20px;text-align:center">col-6</div></el-col>\n    <el-col :span="6"><div style="background:#99a9bf;padding:20px;text-align:center">col-6</div></el-col>\n  </el-row>\n</div>`,
                  props: 'gutter/type/justify/align/tag (Row); span/offset/push/pull/xs/sm/md/lg/xl (Col)' },
                { id: 'container', t: 'Container 布局容器', d: 'el-container 主框架布局',
                  code: `<div>\n  <el-container style="height:300px;border:1px solid #eee">\n    <el-aside width="200px" style="background:#545c64;color:#fff;padding:20px">侧边栏</el-aside>\n    <el-container>\n      <el-header style="background:#b3c0d1">头部</el-header>\n      <el-main>主内容</el-main>\n    </el-container>\n  </el-container>\n</div>`,
                  props: 'direction (Container); height/width (Aside/Header/Footer)' },
                { id: 'icon', t: 'Icon 图标', d: 'Element 内置图标',
                  code: `<div>\n  <i class="el-icon-edit"></i>\n  <i class="el-icon-share"></i>\n  <i class="el-icon-delete"></i>\n  <el-button type="primary" icon="el-icon-search">搜索</el-button>\n  <el-button icon="el-icon-edit" circle></el-button>\n</div>`,
                  props: 'class="el-icon-xxx"（参见官网 icon 列表）' },
            ]
        },
        {
            cat: 'Form 表单',
            items: [
                { id: 'input', t: 'Input 输入框', d: '基础输入控件',
                  code: `<div>\n  <el-input v-model="text" placeholder="请输入"></el-input>\n  <br><br>\n  <el-input v-model="text" prefix-icon="el-icon-search" placeholder="带图标"></el-input>\n  <br><br>\n  <el-input type="textarea" :rows="3" v-model="textarea" placeholder="多行文本"></el-input>\n  <br><br>\n  <el-input v-model="text" show-password placeholder="密码"></el-input>\n  <br><br>\n  <el-input v-model="text" maxlength="20" show-word-limit placeholder="带字数限制"></el-input>\n</div>`,
                  dataExtra: `text: '', textarea: ''`,
                  props: 'type/v-model/maxlength/show-word-limit/placeholder/clearable/show-password/disabled/size/prefix-icon/suffix-icon/rows/autosize',
                  events: 'blur/focus/change/input/clear', slots: 'prefix/suffix/prepend/append' },
                { id: 'select', t: 'Select 选择器', d: '下拉选择',
                  code: `<div>\n  <el-select v-model="val" placeholder="请选择">\n    <el-option v-for="o in opts" :key="o.value" :label="o.label" :value="o.value"></el-option>\n  </el-select>\n  <p>选中：{{ val }}</p>\n</div>`,
                  dataExtra: `val: '', opts: [{value:'a',label:'选项A'},{value:'b',label:'选项B'},{value:'c',label:'选项C'}]`,
                  props: 'multiple/disabled/value-key/size/clearable/collapse-tags/multiple-limit/placeholder/filterable/allow-create/remote/loading/no-data-text', events: 'change/visible-change/remove-tag/clear/blur/focus' },
                { id: 'cascader', t: 'Cascader 级联选择', d: '多层级数据选择',
                  code: `<div>\n  <el-cascader v-model="val" :options="opts" :props="{ checkStrictly: true }" clearable></el-cascader>\n</div>`,
                  dataExtra: `val: [], opts: [{value:'zj',label:'浙江',children:[{value:'hz',label:'杭州'}]},{value:'js',label:'江苏',children:[{value:'nj',label:'南京'}]}]`,
                  props: 'options/props/separator/show-all-levels/collapse-tags/clearable/filterable', events: 'change/expand-change/blur/focus/visible-change' },
                { id: 'radio', t: 'Radio 单选框', d: '在一组备选项中进行单选',
                  code: `<div>\n  <el-radio v-model="r" label="1">选项A</el-radio>\n  <el-radio v-model="r" label="2">选项B</el-radio>\n  <br><br>\n  <el-radio-group v-model="r2">\n    <el-radio-button label="上海"></el-radio-button>\n    <el-radio-button label="北京"></el-radio-button>\n    <el-radio-button label="广州"></el-radio-button>\n  </el-radio-group>\n</div>`,
                  dataExtra: `r: '1', r2: '上海'`,
                  props: 'label/disabled/border/size/name', events: 'change' },
                { id: 'checkbox', t: 'Checkbox 多选框', d: '一组可选项多项选择',
                  code: `<div>\n  <el-checkbox v-model="c1">单个</el-checkbox>\n  <br><br>\n  <el-checkbox-group v-model="cs">\n    <el-checkbox label="苹果"></el-checkbox>\n    <el-checkbox label="香蕉"></el-checkbox>\n    <el-checkbox label="橙子"></el-checkbox>\n  </el-checkbox-group>\n  <p>已选：{{ cs.join(', ') }}</p>\n</div>`,
                  dataExtra: `c1: false, cs: []`,
                  props: 'label/indeterminate/disabled/border/size', events: 'change' },
                { id: 'input-number', t: 'InputNumber 数字输入', d: '数字输入控件',
                  code: `<div>\n  <el-input-number v-model="num" :min="0" :max="100" :step="1"></el-input-number>\n  <p>值：{{ num }}</p>\n</div>`,
                  dataExtra: `num: 5`,
                  props: 'min/max/step/step-strictly/precision/size/disabled/controls/controls-position', events: 'change/blur/focus' },
                { id: 'switch', t: 'Switch 开关', d: '表示两种状态切换',
                  code: `<div>\n  <el-switch v-model="sw"></el-switch>\n  <el-switch v-model="sw2" active-text="开启" inactive-text="关闭" active-color="#13ce66" inactive-color="#ff4949"></el-switch>\n</div>`,
                  dataExtra: `sw: true, sw2: false`,
                  props: 'disabled/loading/width/active-color/inactive-color/active-text/inactive-text/active-value/inactive-value', events: 'change' },
                { id: 'slider', t: 'Slider 滑块', d: '通过拖动滑块在固定区间选择数值',
                  code: `<div>\n  <el-slider v-model="val" :step="10" show-stops></el-slider>\n  <p>{{ val }}</p>\n</div>`,
                  dataExtra: `val: 30`,
                  props: 'min/max/step/show-input/show-stops/show-tooltip/format-tooltip/range/vertical/height', events: 'change/input' },
                { id: 'date-picker', t: 'DatePicker 日期选择', d: '日期选择器',
                  code: `<div>\n  <el-date-picker v-model="d1" type="date" placeholder="选择日期"></el-date-picker>\n  <el-date-picker v-model="d2" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束"></el-date-picker>\n  <el-date-picker v-model="d3" type="datetime"></el-date-picker>\n</div>`,
                  dataExtra: `d1: '', d2: [], d3: ''`,
                  props: 'type (date/daterange/datetime/datetimerange/month/year/week)/format/value-format/clearable/disabled/picker-options/range-separator', events: 'change/blur/focus' },
                { id: 'time-picker', t: 'TimePicker 时间选择', d: '时间选择器',
                  code: `<div>\n  <el-time-picker v-model="t" placeholder="任意时间"></el-time-picker>\n  <el-time-select v-model="t2" :picker-options="{start:'08:30',step:'00:30',end:'18:30'}"></el-time-select>\n</div>`,
                  dataExtra: `t: '', t2: ''`,
                  props: 'is-range/arrow-control/format/value-format/picker-options', events: 'change/blur/focus' },
                { id: 'rate', t: 'Rate 评分', d: '评分组件',
                  code: `<div>\n  <el-rate v-model="r"></el-rate>\n  <el-rate v-model="r2" show-score></el-rate>\n  <el-rate v-model="r3" :colors="['#99A9BF','#F7BA2A','#FF9900']" show-text></el-rate>\n</div>`,
                  dataExtra: `r: 3, r2: 3.5, r3: 4`,
                  props: 'max/disabled/allow-half/low-threshold/high-threshold/colors/icon-classes/show-text/show-score/text-color', events: 'change' },
                { id: 'color-picker', t: 'ColorPicker 取色器', d: '取色控件',
                  code: `<div>\n  <el-color-picker v-model="c1"></el-color-picker>\n  <el-color-picker v-model="c2" show-alpha></el-color-picker>\n  <p>{{ c1 }} / {{ c2 }}</p>\n</div>`,
                  dataExtra: `c1: '#409EFF', c2: 'rgba(64,158,255,0.5)'`,
                  props: 'show-alpha/color-format/disabled/size/predefine', events: 'change/active-change' },
                { id: 'transfer', t: 'Transfer 穿梭框', d: '穿梭选择数据',
                  code: `<div>\n  <el-transfer v-model="v" :data="data" :titles="['可选','已选']"></el-transfer>\n</div>`,
                  dataExtra: `v: [], data: Array.from({length:8}, (_,i)=>({key:i,label:'选项 '+i,disabled:i===2}))`,
                  props: 'data/filterable/filter-placeholder/target-order/titles/button-texts/format/props', events: 'change/left-check-change/right-check-change' },
                { id: 'upload', t: 'Upload 上传', d: '文件上传组件',
                  code: `<div>\n  <el-upload action="#" :auto-upload="false" :on-change="(f)=>{tip='已选: '+f.name}" :show-file-list="true">\n    <el-button type="primary">点击上传</el-button>\n    <div slot="tip" style="color:#888;font-size:12px">{{ tip }}</div>\n  </el-upload>\n</div>`,
                  dataExtra: `tip: '本地预览：不会真正上传'`,
                  props: 'action/headers/multiple/data/name/with-credentials/show-file-list/drag/accept/auto-upload/file-list/list-type/limit/before-upload/on-preview/on-remove/on-success/on-error/on-progress/on-change/before-remove/on-exceed' },
                { id: 'form', t: 'Form 表单', d: '完整表单 + 校验',
                  code: `<div>\n  <el-form ref="f" :model="form" :rules="rules" label-width="80px">\n    <el-form-item label="姓名" prop="name">\n      <el-input v-model="form.name"></el-input>\n    </el-form-item>\n    <el-form-item label="邮箱" prop="email">\n      <el-input v-model="form.email"></el-input>\n    </el-form-item>\n    <el-form-item>\n      <el-button type="primary" @click="submit">提交</el-button>\n      <el-button @click="reset">重置</el-button>\n    </el-form-item>\n  </el-form>\n</div>`,
                  dataExtra: `form:{name:'',email:''}, rules:{ name:[{required:true,message:'请输入姓名',trigger:'blur'}], email:[{type:'email',message:'邮箱格式不正确',trigger:'blur'}] }`,
                  methodsExtra: `submit(){ this.$refs.f.validate(v=>{ this.$message[v?'success':'error'](v?'通过':'校验失败'); }) }, reset(){ this.$refs.f.resetFields(); }`,
                  props: 'model/rules/inline/label-position/label-width/label-suffix/hide-required-asterisk/show-message/inline-message/status-icon/validate-on-rule-change/size/disabled', events: 'validate', slots: 'default' },
            ]
        },
        {
            cat: 'Data 数据展示',
            items: [
                { id: 'table', t: 'Table 表格', d: '数据展示常用',
                  code: `<div>\n  <el-table :data="rows" border style="width:100%">\n    <el-table-column type="index" width="50"></el-table-column>\n    <el-table-column prop="name" label="姓名" width="120"></el-table-column>\n    <el-table-column prop="age" label="年龄" width="80" sortable></el-table-column>\n    <el-table-column prop="city" label="城市"></el-table-column>\n    <el-table-column label="操作" width="120">\n      <template slot-scope="s">\n        <el-button size="mini" @click="$message.info('编辑 '+s.row.name)">编辑</el-button>\n      </template>\n    </el-table-column>\n  </el-table>\n</div>`,
                  dataExtra: `rows:[{name:'张三',age:18,city:'北京'},{name:'李四',age:22,city:'上海'},{name:'王五',age:25,city:'广州'}]`,
                  props: 'data/height/max-height/stripe/border/size/fit/show-header/highlight-current-row/row-class-name/row-style/cell-class-name/empty-text/default-sort/sum-text/show-summary/summary-method/span-method', events: 'select/select-all/selection-change/cell-mouse-enter/row-click/row-dblclick/sort-change/filter-change/header-click' },
                { id: 'tag', t: 'Tag 标签', d: '标记和选择',
                  code: `<div>\n  <el-tag>标签一</el-tag>\n  <el-tag type="success">成功</el-tag>\n  <el-tag type="info">信息</el-tag>\n  <el-tag type="warning">警告</el-tag>\n  <el-tag type="danger">危险</el-tag>\n  <el-tag closable @close="$message('关闭')">可关闭</el-tag>\n  <el-tag effect="dark">深色</el-tag>\n  <el-tag effect="plain">朴素</el-tag>\n</div>`,
                  props: 'type/closable/disable-transitions/hit/color/size/effect', events: 'click/close' },
                { id: 'progress', t: 'Progress 进度条', d: '进度展示',
                  code: `<div>\n  <el-progress :percentage="50"></el-progress>\n  <el-progress :percentage="100" status="success"></el-progress>\n  <el-progress :percentage="80" :format="(p)=>p+'%'"></el-progress>\n  <el-progress type="circle" :percentage="75"></el-progress>\n  <el-progress type="dashboard" :percentage="60" status="warning"></el-progress>\n</div>`,
                  props: 'percentage/type/stroke-width/text-inside/status/color/width/show-text/stroke-linecap/format' },
                { id: 'tree', t: 'Tree 树形控件', d: '层级数据展示',
                  code: `<div>\n  <el-tree :data="data" show-checkbox node-key="id" default-expand-all></el-tree>\n</div>`,
                  dataExtra: `data:[{id:1,label:'根',children:[{id:2,label:'子1'},{id:3,label:'子2',children:[{id:4,label:'孙子'}]}]}]`,
                  props: 'data/empty-text/node-key/props/render-after-expand/load/render-content/highlight-current/default-expand-all/expand-on-click-node/auto-expand-parent/default-expanded-keys/show-checkbox/check-strictly/default-checked-keys/current-node-key/filter-node-method/accordion/indent/icon-class/lazy/draggable/allow-drag/allow-drop' },
                { id: 'pagination', t: 'Pagination 分页', d: '分页器',
                  code: `<div>\n  <el-pagination layout="total, sizes, prev, pager, next, jumper" :total="400" :page-size="10" :page-sizes="[10,20,50,100]" @current-change="(p)=>cur=p"></el-pagination>\n  <p>当前页：{{ cur }}</p>\n</div>`,
                  dataExtra: `cur: 1`,
                  props: 'small/background/page-size/total/page-count/current-page/layout/page-sizes/popper-class/prev-text/next-text/disabled/hide-on-single-page', events: 'size-change/current-change/prev-click/next-click' },
                { id: 'badge', t: 'Badge 标记', d: '徽章数字提示',
                  code: `<div>\n  <el-badge :value="12">\n    <el-button>消息</el-button>\n  </el-badge>\n  <el-badge :value="200" :max="99" type="warning">\n    <el-button>评论</el-button>\n  </el-badge>\n  <el-badge is-dot>\n    <el-button>提醒</el-button>\n  </el-badge>\n</div>`,
                  props: 'value/max/is-dot/hidden/type' },
                { id: 'avatar', t: 'Avatar 头像', d: '头像展示',
                  code: `<div>\n  <el-avatar icon="el-icon-user-solid"></el-avatar>\n  <el-avatar src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"></el-avatar>\n  <el-avatar shape="square">user</el-avatar>\n</div>`,
                  props: 'icon/size/shape/src/srcset/alt/fit' },
            ]
        },
        {
            cat: 'Notice 提示',
            items: [
                { id: 'alert', t: 'Alert 警告', d: '页面静态展示重要信息',
                  code: `<div>\n  <el-alert title="成功" type="success" show-icon></el-alert>\n  <el-alert title="消息" type="info"></el-alert>\n  <el-alert title="警告" type="warning" description="附加描述信息" show-icon></el-alert>\n  <el-alert title="错误" type="error" closable></el-alert>\n</div>`,
                  props: 'title/type/description/closable/center/close-text/show-icon/effect', events: 'close' },
                { id: 'message', t: 'Message 消息', d: '$message 全局调用',
                  code: `<div>\n  <el-button @click="$message('普通消息')">默认</el-button>\n  <el-button type="success" @click="$message.success('成功')">成功</el-button>\n  <el-button type="warning" @click="$message.warning('警告')">警告</el-button>\n  <el-button type="danger" @click="$message.error('错误')">错误</el-button>\n  <el-button type="info" @click="$message.info('信息')">信息</el-button>\n</div>`,
                  props: '$message(opts) - message/type/iconClass/dangerouslyUseHTMLString/customClass/onClose/showClose/center/duration' },
                { id: 'msgbox', t: 'MessageBox 弹框', d: '$confirm / $alert / $prompt',
                  code: `<div>\n  <el-button @click="confirm">弹出确认框</el-button>\n  <el-button @click="prompt">弹出输入框</el-button>\n</div>`,
                  methodsExtra: `confirm(){ this.$confirm('确认删除？','提示',{type:'warning'}).then(()=>this.$message.success('已删除')).catch(()=>this.$message.info('已取消')); }, prompt(){ this.$prompt('请输入邮箱','提示',{inputPattern:/^.+@.+$/,inputErrorMessage:'格式错误'}).then(({value})=>this.$message.success('邮箱:'+value)).catch(()=>{}); }`,
                  props: '$confirm/$alert/$prompt - title/message/type/showCancelButton/showConfirmButton/cancelButtonText/confirmButtonText/closeOnClickModal/inputPattern/inputValidator/inputErrorMessage' },
                { id: 'notify', t: 'Notification 通知', d: '$notify 悬浮提示',
                  code: `<div>\n  <el-button @click="notify('success')">成功</el-button>\n  <el-button @click="notify('warning')">警告</el-button>\n  <el-button @click="notify('info')">信息</el-button>\n  <el-button @click="notify('error')">错误</el-button>\n</div>`,
                  methodsExtra: `notify(type){ this.$notify[type]({ title:'标题', message:'这是一条'+type+'消息', position:'top-right' }); }`,
                  props: '$notify - title/message/type/iconClass/customClass/duration/position/showClose/onClose/onClick/offset' },
            ]
        },
        {
            cat: 'Navigation 导航',
            items: [
                { id: 'menu', t: 'NavMenu 导航菜单', d: '为页面提供导航功能',
                  code: `<div>\n  <el-menu mode="horizontal" :default-active="active" @select="(i)=>active=i" background-color="#545c64" text-color="#fff" active-text-color="#ffd04b">\n    <el-menu-item index="1">首页</el-menu-item>\n    <el-submenu index="2">\n      <template slot="title">我的工作</template>\n      <el-menu-item index="2-1">选项一</el-menu-item>\n      <el-menu-item index="2-2">选项二</el-menu-item>\n    </el-submenu>\n    <el-menu-item index="3">订单管理</el-menu-item>\n  </el-menu>\n  <p>当前：{{ active }}</p>\n</div>`,
                  dataExtra: `active: '1'`,
                  props: 'mode/collapse/background-color/text-color/active-text-color/default-active/default-openeds/unique-opened/menu-trigger/router/collapse-transition', events: 'select/open/close' },
                { id: 'tabs', t: 'Tabs 标签页', d: '分隔同等级视图',
                  code: `<div>\n  <el-tabs v-model="a" type="border-card">\n    <el-tab-pane label="用户管理" name="1">用户管理内容</el-tab-pane>\n    <el-tab-pane label="配置管理" name="2">配置管理内容</el-tab-pane>\n    <el-tab-pane label="角色管理" name="3">角色管理内容</el-tab-pane>\n  </el-tabs>\n</div>`,
                  dataExtra: `a: '1'`,
                  props: 'type/closable/addable/editable/tab-position/stretch/before-leave', events: 'tab-click/tab-remove/tab-add/edit' },
                { id: 'breadcrumb', t: 'Breadcrumb 面包屑', d: '显示当前位置层级',
                  code: `<div>\n  <el-breadcrumb separator="/">\n    <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>\n    <el-breadcrumb-item>活动管理</el-breadcrumb-item>\n    <el-breadcrumb-item>活动列表</el-breadcrumb-item>\n    <el-breadcrumb-item>活动详情</el-breadcrumb-item>\n  </el-breadcrumb>\n</div>`,
                  props: 'separator/separator-class (Breadcrumb); to/replace (BreadcrumbItem)' },
                { id: 'dropdown', t: 'Dropdown 下拉菜单', d: '将动作或菜单折叠',
                  code: `<div>\n  <el-dropdown @command="(c)=>$message('点击: '+c)">\n    <span class="el-dropdown-link">\n      下拉菜单<i class="el-icon-arrow-down el-icon--right"></i>\n    </span>\n    <el-dropdown-menu slot="dropdown">\n      <el-dropdown-item command="1">黄金糕</el-dropdown-item>\n      <el-dropdown-item command="2">狮子头</el-dropdown-item>\n      <el-dropdown-item divided command="3">蚵仔煎</el-dropdown-item>\n    </el-dropdown-menu>\n  </el-dropdown>\n</div>`,
                  props: 'type/size/split-button/placement/trigger/hide-on-click/show-timeout/hide-timeout/tabindex', events: 'click/command/visible-change' },
                { id: 'steps', t: 'Steps 步骤条', d: '引导用户按流程操作',
                  code: `<div>\n  <el-steps :active="2" finish-status="success">\n    <el-step title="步骤一" description="描述"></el-step>\n    <el-step title="步骤二" description="描述"></el-step>\n    <el-step title="步骤三" description="描述"></el-step>\n  </el-steps>\n</div>`,
                  props: 'space/direction/active/process-status/finish-status/align-center/simple' },
            ]
        },
        {
            cat: 'Others 其他',
            items: [
                { id: 'dialog', t: 'Dialog 对话框', d: '模态对话框',
                  code: `<div>\n  <el-button @click="vis=true">打开对话框</el-button>\n  <el-dialog title="提示" :visible.sync="vis" width="30%">\n    <span>这是一段信息</span>\n    <span slot="footer">\n      <el-button @click="vis=false">取消</el-button>\n      <el-button type="primary" @click="vis=false">确定</el-button>\n    </span>\n  </el-dialog>\n</div>`,
                  dataExtra: `vis: false`,
                  props: 'visible/title/width/fullscreen/top/modal/modal-append-to-body/append-to-body/lock-scroll/custom-class/close-on-click-modal/close-on-press-escape/show-close/before-close/center/destroy-on-close', events: 'open/opened/close/closed' },
                { id: 'tooltip', t: 'Tooltip 文字提示', d: '鼠标悬停展示提示',
                  code: `<div>\n  <el-tooltip content="这是提示" placement="top">\n    <el-button>悬停查看</el-button>\n  </el-tooltip>\n  <el-tooltip effect="light" content="浅色" placement="right">\n    <el-button>右侧浅色</el-button>\n  </el-tooltip>\n</div>`,
                  props: 'effect/content/placement/value/disabled/offset/transition/visible-arrow/popper-options/open-delay/manual/popper-class/enterable/hide-after/tabindex' },
                { id: 'popover', t: 'Popover 弹出框', d: '类似 tooltip 但内容更丰富',
                  code: `<div>\n  <el-popover placement="bottom" width="200" trigger="click" content="这是一段内容,内容很长,内容很长">\n    <el-button slot="reference">点击弹出</el-button>\n  </el-popover>\n</div>`,
                  props: 'trigger/title/content/width/placement/disabled/value/offset/transition/visible-arrow/popper-options/popper-class/open-delay/close-delay/tabindex' },
                { id: 'card', t: 'Card 卡片', d: '通用卡片容器',
                  code: `<div>\n  <el-card style="width:300px">\n    <div slot="header" style="display:flex;justify-content:space-between">\n      <span>卡片标题</span>\n      <el-button type="text">操作</el-button>\n    </div>\n    <div>卡片内容卡片内容卡片内容</div>\n  </el-card>\n</div>`,
                  props: 'header/body-style/shadow' },
                { id: 'carousel', t: 'Carousel 走马灯', d: '轮播图',
                  code: `<div>\n  <el-carousel height="200px">\n    <el-carousel-item v-for="i in 4" :key="i">\n      <div style="height:200px;background:'+'rgb('+(i*60)+','+(255-i*40)+',180)'+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:30px">第 {{ i }} 张</div>\n    </el-carousel-item>\n  </el-carousel>\n</div>`,
                  props: 'height/initial-index/trigger/autoplay/interval/indicator-position/arrow/type/loop/direction' },
                { id: 'collapse', t: 'Collapse 折叠面板', d: '折叠/展开内容',
                  code: `<div>\n  <el-collapse v-model="active" accordion>\n    <el-collapse-item title="一致性 Consistency" name="1">详细内容 1</el-collapse-item>\n    <el-collapse-item title="反馈 Feedback" name="2">详细内容 2</el-collapse-item>\n    <el-collapse-item title="效率 Efficiency" name="3">详细内容 3</el-collapse-item>\n  </el-collapse>\n</div>`,
                  dataExtra: `active: '1'`,
                  props: 'accordion/value' },
                { id: 'timeline', t: 'Timeline 时间线', d: '展示时间流信息',
                  code: `<div>\n  <el-timeline>\n    <el-timeline-item timestamp="2024-01-01" type="primary">创建</el-timeline-item>\n    <el-timeline-item timestamp="2024-02-01" type="success">通过审核</el-timeline-item>\n    <el-timeline-item timestamp="2024-03-01" type="warning">活动按期开始</el-timeline-item>\n  </el-timeline>\n</div>`,
                  props: 'timestamp/hide-timestamp/placement/type/color/size/icon' },
                { id: 'divider', t: 'Divider 分隔符', d: '区隔内容',
                  code: `<div>\n  <span>第一部分</span>\n  <el-divider></el-divider>\n  <span>第二部分</span>\n  <el-divider content-position="left">中间文字</el-divider>\n  <span>第三部分</span>\n  <el-divider direction="vertical"></el-divider>\n  <span>同行</span>\n</div>`,
                  props: 'direction/content-position' },
                { id: 'drawer', t: 'Drawer 抽屉', d: '从屏幕边缘滑出',
                  code: `<div>\n  <el-button @click="vis=true">右侧抽屉</el-button>\n  <el-drawer title="标题" :visible.sync="vis" direction="rtl" size="30%">\n    <div style="padding:20px">抽屉内容</div>\n  </el-drawer>\n</div>`,
                  dataExtra: `vis: false`,
                  props: 'append-to-body/before-close/close-on-press-escape/custom-class/destroy-on-close/modal/modal-append-to-body/direction/show-close/size/title/visible/wrapperClosable/withHeader' },
                { id: 'backtop', t: 'Backtop 回到顶部', d: '页面顶部一键回到顶部',
                  code: `<div style="height:600px;overflow:auto;border:1px solid #eee">\n  <div style="height:1500px;padding:20px">向下滚动这块区域</div>\n  <el-backtop target=".scroll-area"></el-backtop>\n</div>`,
                  props: 'target/visibility-height/right/bottom' },
                { id: 'loading', t: 'Loading 加载', d: '加载数据时显示动效',
                  code: `<div>\n  <el-button @click="toggle">{{ loading?'停止':'开始' }}</el-button>\n  <div v-loading="loading" element-loading-text="加载中..." style="height:200px;background:#f5f7fa;margin-top:10px;display:flex;align-items:center;justify-content:center">内容区域</div>\n</div>`,
                  dataExtra: `loading: true`,
                  methodsExtra: `toggle(){ this.loading=!this.loading; }`,
                  props: 'v-loading 指令 - element-loading-text/element-loading-spinner/element-loading-background/element-loading-custom-class' },
            ]
        },
    ];

    // 把示例代码组装成完整 HTML，注入 iframe srcdoc
    function buildHtml(code, dataExtra, methodsExtra) {
        // 注意：相对路径在 srcdoc 不可用，必须用绝对 URL 或 base
        const vueUrl = location.origin + location.pathname.replace(/\/[^\/]*$/, '/') + 'vendor/vue.min.js';
        const elUrl = location.origin + location.pathname.replace(/\/[^\/]*$/, '/') + 'vendor/element-ui/index.js';
        const cssUrl = location.origin + location.pathname.replace(/\/[^\/]*$/, '/') + 'vendor/element-ui/index.css';

        return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link rel="stylesheet" href="${cssUrl}">
<style>body{font-family:-apple-system,'PingFang SC','Helvetica Neue',sans-serif;padding:20px;margin:0}.el-button{margin:4px}</style>
</head><body>
<div id="app">
${code}
</div>
<script src="${vueUrl}"><\/script>
<script src="${elUrl}"><\/script>
<script>
Vue.use(ELEMENT);
new Vue({
  el: '#app',
  data(){ return { ${dataExtra || ''} }; },
  methods: { ${methodsExtra || ''} }
});
<\/script>
</body></html>`;
    }

    function init() {
        const sidebar = document.getElementById('vp-sidebar');
        if (!sidebar) return;
        const editor = document.getElementById('vp-editor');
        const iframe = document.getElementById('vp-preview');
        const docs = document.getElementById('vp-docs');
        const btnRun = document.getElementById('btn-vp-run');
        const search = document.getElementById('vp-search');

        let currentComp = null;

        function renderSidebar(kw = '') {
            const lower = kw.toLowerCase().trim();
            sidebar.innerHTML = CATALOG.map(group => {
                const items = group.items.filter(it =>
                    !lower || it.t.toLowerCase().includes(lower) || it.id.includes(lower) || it.d.toLowerCase().includes(lower)
                );
                if (!items.length) return '';
                return `<div class="vp-group">
                    <div class="vp-group-title">${group.cat}</div>
                    ${items.map(it => `<div class="vp-item${currentComp && currentComp.id === it.id ? ' active' : ''}" data-id="${it.id}">${it.t}</div>`).join('')}
                </div>`;
            }).join('');
            sidebar.querySelectorAll('.vp-item').forEach(el => {
                el.addEventListener('click', () => {
                    const id = el.dataset.id;
                    for (const g of CATALOG) {
                        const it = g.items.find(x => x.id === id);
                        if (it) { loadComp(it); return; }
                    }
                });
            });
        }

        function loadComp(comp) {
            currentComp = comp;
            editor.value = comp.code;
            // 文档面板：优先用 VP_DOCS 渲染结构化文档表格
            const D = (window.VP_DOCS && window.VP_DOCS[comp.id]) || null;
            docs.innerHTML = `
                <div class="vp-doc-title">${comp.t}</div>
                <div class="vp-doc-desc">${comp.d}</div>
                ${D ? buildDocTables(D) : renderFallback(comp)}
            `;
            // 高亮 sidebar
            sidebar.querySelectorAll('.vp-item').forEach(el => el.classList.toggle('active', el.dataset.id === comp.id));
            run();
        }

        // 渲染结构化文档：Attributes / Events / Slots / Methods
        function buildDocTables(D) {
            const sections = [];
            if (D.attrs && D.attrs.length) {
                sections.push(`<div class="vp-doc-section"><b>Attributes 属性</b>
                    <table class="vp-doc-table">
                        <thead><tr><th>参数</th><th>说明</th><th>类型</th><th>可选值</th><th>默认值</th></tr></thead>
                        <tbody>${D.attrs.map(r => `<tr><td><code>${escape(r[0]||'')}</code></td><td>${escape(r[1]||'')}</td><td>${escape(r[2]||'')}</td><td>${escape(r[3]||'')}</td><td>${escape(r[4]||'')}</td></tr>`).join('')}</tbody>
                    </table></div>`);
            }
            if (D.evts && D.evts.length) {
                sections.push(`<div class="vp-doc-section"><b>Events 事件</b>
                    <table class="vp-doc-table">
                        <thead><tr><th>事件名</th><th>说明</th><th>回调参数</th></tr></thead>
                        <tbody>${D.evts.map(r => `<tr><td><code>${escape(r[0]||'')}</code></td><td>${escape(r[1]||'')}</td><td>${escape(r[2]||'')}</td></tr>`).join('')}</tbody>
                    </table></div>`);
            }
            if (D.slts && D.slts.length) {
                sections.push(`<div class="vp-doc-section"><b>Slots 插槽</b>
                    <table class="vp-doc-table">
                        <thead><tr><th>名称</th><th>说明</th></tr></thead>
                        <tbody>${D.slts.map(r => `<tr><td><code>${escape(r[0]||'')}</code></td><td>${escape(r[1]||'')}</td></tr>`).join('')}</tbody>
                    </table></div>`);
            }
            if (D.methods && D.methods.length) {
                sections.push(`<div class="vp-doc-section"><b>Methods 方法</b>
                    <table class="vp-doc-table">
                        <thead><tr><th>方法名</th><th>说明</th><th>参数</th></tr></thead>
                        <tbody>${D.methods.map(r => `<tr><td><code>${escape(r[0]||'')}</code></td><td>${escape(r[1]||'')}</td><td>${escape(r[2]||'')}</td></tr>`).join('')}</tbody>
                    </table></div>`);
            }
            return sections.join('');
        }

        // 无 VP_DOCS 数据时的简易渲染（兼容旧字段）
        function renderFallback(comp) {
            return `
                ${comp.props ? `<div class="vp-doc-section"><b>Props / 属性</b><pre>${escape(comp.props)}</pre></div>` : ''}
                ${comp.events ? `<div class="vp-doc-section"><b>Events / 事件</b><pre>${escape(comp.events)}</pre></div>` : ''}
                ${comp.slots ? `<div class="vp-doc-section"><b>Slots / 插槽</b><pre>${escape(comp.slots)}</pre></div>` : ''}
            `;
        }

        function run() {
            if (!currentComp) return;
            const html = buildHtml(editor.value, currentComp.dataExtra, currentComp.methodsExtra);
            iframe.srcdoc = html;
        }

        function escape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

        btnRun.addEventListener('click', run);
        editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
            // Tab 转换为空格
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = editor.selectionStart, ed = editor.selectionEnd;
                editor.value = editor.value.substring(0, s) + '  ' + editor.value.substring(ed);
                editor.selectionStart = editor.selectionEnd = s + 2;
            }
        });
        search.addEventListener('input', () => renderSidebar(search.value));

        renderSidebar();
        // 默认加载第一个
        loadComp(CATALOG[0].items[0]);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
