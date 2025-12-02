document.addEventListener('DOMContentLoaded', () => {
    // 状态变量
    let currentInput = '';
    
    // DOM 元素获取
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.tool-page');
    const pageTitle = document.getElementById('page-title');
    
    const jsonInput = document.getElementById('json-input');
    const jsonOutput = document.getElementById('json-output');
    const jsonPlaceholder = document.getElementById('json-placeholder');
    const inputStats = document.getElementById('input-stats');
    const errorMsg = document.getElementById('error-msg');
    
    const btnFormat = document.getElementById('btn-format');
    const btnMinify = document.getElementById('btn-minify');
    const btnCopy = document.getElementById('btn-copy');
    const btnClear = document.getElementById('btn-clear');

    // ---------------------------------------------------------
    // 导航逻辑
    // ---------------------------------------------------------
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有激活状态
            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            
            // 激活当前项
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetPage = document.getElementById(`page-${targetId}`);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // 更新标题
            const text = item.querySelector('span').textContent;
            pageTitle.textContent = text + '工具';
        });
    });

    // ---------------------------------------------------------
    // SQL 字段清洗逻辑
    // ---------------------------------------------------------
    const cleanerInput = document.getElementById('cleaner-input');
    const cleanerOutput = document.getElementById('cleaner-output');
    const cleanerPlaceholder = document.getElementById('cleaner-placeholder');
    const columnSelector = document.getElementById('column-selector');
    const columnList = document.getElementById('column-list');
    
    // 表名替换相关元素
    const enableRenameTable = document.getElementById('enable-rename-table');
    const renameTableArea = document.getElementById('rename-table-area');
    const currentTableNameSpan = document.getElementById('current-table-name');
    const newTableNameInput = document.getElementById('new-table-name');

    const btnCleanerParse = document.getElementById('btn-cleaner-parse');
    const btnCleanerGenerate = document.getElementById('btn-cleaner-generate');
    const btnCleanerCopy = document.getElementById('btn-cleaner-copy');
    const btnCleanerClear = document.getElementById('btn-cleaner-clear');

    let parsedColumns = [];
    let parsedTableName = '';

    // ---------------------------------------------------------
    // 二维码/条形码工具逻辑
    // ---------------------------------------------------------
    const qrInput = document.getElementById('qr-input');
    const qrType = document.getElementById('qr-type');
    const qrSize = document.getElementById('qr-size');
    const qrColorDark = document.getElementById('qr-color-dark');
    const qrColorLight = document.getElementById('qr-color-light');
    const btnQrGenerate = document.getElementById('btn-qr-generate');
    const btnQrDownload = document.getElementById('btn-qr-download');
    const btnQrClear = document.getElementById('btn-qr-clear');
    
    const qrPreviewArea = document.getElementById('qr-preview-area');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const barcodeImg = document.getElementById('barcode-img');

    let currentQrObject = null;

    if (btnQrGenerate) {
        btnQrGenerate.addEventListener('click', () => {
            const content = qrInput.value; // 不 trim，允许空格
            if (!content) {
                showToast('请输入内容', 'warning');
                return;
            }

            const type = qrType.value;
            const size = parseInt(qrSize.value) || 200;
            const colorDark = qrColorDark.value;
            const colorLight = qrColorLight.value;

            // 重置显示
            qrPlaceholder.style.display = 'none';
            qrcodeContainer.innerHTML = '';
            qrcodeContainer.style.display = 'none';
            barcodeImg.style.display = 'none';

            if (type === 'qrcode') {
                if (typeof QRCode === 'undefined') {
                    showToast('QRCode 库未加载，请检查 lib/qrcode.min.js', 'error');
                    return;
                }
                qrcodeContainer.style.display = 'block';
                try {
                    currentQrObject = new QRCode(qrcodeContainer, {
                        text: content,
                        width: size,
                        height: size,
                        colorDark : colorDark,
                        colorLight : colorLight,
                        correctLevel : QRCode.CorrectLevel.H
                    });
                    showToast('二维码生成成功', 'success');
                } catch (e) {
                    showToast('生成失败: ' + e.message, 'error');
                }
            } else {
                if (typeof JsBarcode === 'undefined') {
                    showToast('JsBarcode 库未加载，请检查 lib/JsBarcode.all.min.js', 'error');
                    return;
                }
                barcodeImg.style.display = 'block';
                try {
                    JsBarcode(barcodeImg, content, {
                        format: "CODE128", // 默认使用 CODE128，兼容性好
                        width: 2,
                        height: size > 100 ? 100 : size, // 条形码高度不宜过高
                        displayValue: true,
                        lineColor: colorDark,
                        background: colorLight
                    });
                    showToast('条形码生成成功', 'success');
                } catch (e) {
                    showToast('生成失败: 内容可能不符合条形码规范', 'error');
                }
            }
        });
    }

    if (btnQrDownload) {
        btnQrDownload.addEventListener('click', () => {
            let imgUrl = null;
            
            if (qrType.value === 'qrcode') {
                // QRCode.js 生成的是 canvas 或 img
                const img = qrcodeContainer.querySelector('img');
                const canvas = qrcodeContainer.querySelector('canvas');
                
                if (img && img.src) {
                    imgUrl = img.src;
                } else if (canvas) {
                    imgUrl = canvas.toDataURL("image/png");
                }
            } else {
                // JsBarcode 生成的是 img (我们用的是 img 标签)
                if (barcodeImg.src) {
                    imgUrl = barcodeImg.src;
                }
            }

            if (imgUrl) {
                const link = document.createElement('a');
                link.download = `code_${Date.now()}.png`;
                link.href = imgUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast('下载已开始', 'success');
            } else {
                showToast('请先生成图片', 'warning');
            }
        });
    }

    if (btnQrClear) {
        btnQrClear.addEventListener('click', () => {
            qrInput.value = '';
            qrcodeContainer.innerHTML = '';
            qrcodeContainer.style.display = 'none';
            barcodeImg.style.display = 'none';
            barcodeImg.src = '';
            qrPlaceholder.style.display = 'block';
            // 清空解析结果
            const qrDecodeResult = document.getElementById('qr-decode-result');
            const qrDecodeText = document.getElementById('qr-decode-text');
            if (qrDecodeResult) qrDecodeResult.style.display = 'none';
            if (qrDecodeText) qrDecodeText.textContent = '';
            showToast('已清空', 'info');
        });
    }

    // 二维码解析功能
    const qrDecodeInput = document.getElementById('qr-decode-input');
    const qrDecodeResult = document.getElementById('qr-decode-result');
    const qrDecodeText = document.getElementById('qr-decode-text');

    if (qrDecodeInput) {
        qrDecodeInput.addEventListener('change', () => {
            const file = qrDecodeInput.files[0];
            if (!file) return;

            // 检查jsQR库是否加载
            if (typeof jsQR === 'undefined') {
                showToast('二维码解析库未加载，请下载完整的jsQR.js库', 'error');
                console.error('请从 https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js 下载完整库');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // 创建 canvas 进行图像处理
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        // 获取图像数据
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // 调用jsQR解析
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });

                        if (code && code.data) {
                            // 解析成功
                            qrDecodeText.textContent = code.data;
                            qrDecodeResult.style.display = 'block';
                            // 同时填充到输入框
                            qrInput.value = code.data;
                            showToast('二维码解析成功', 'success');
                        } else {
                            // 未找到二维码
                            showToast('未能识别二维码，请确保图片清晰且包含二维码', 'warning');
                        }
                    } catch (error) {
                        console.error('解析错误:', error);
                        showToast('解析失败: ' + error.message, 'error');
                    }
                };
                img.onerror = () => {
                    showToast('图片加载失败', 'error');
                };
                img.src = e.target.result;
            };
            reader.onerror = () => {
                showToast('文件读取失败', 'error');
            };
            reader.readAsDataURL(file);

            // 重置 input 允许重复选择
            qrDecodeInput.value = '';
        });
    }

    // 监听表名替换开关
    if (enableRenameTable) {
        enableRenameTable.addEventListener('change', () => {
            renameTableArea.style.display = enableRenameTable.checked ? 'block' : 'none';
        });
    }

    if (btnCleanerParse) {
        btnCleanerParse.addEventListener('click', () => {
            const content = cleanerInput.value.trim();
            if (!content) {
                showToast('请先输入 SQL 语句', 'warning');
                return;
            }

            // 提取第一条 SQL 进行解析
            // 假设格式：INSERT INTO `table` (`col1`, `col2`) VALUES ...
            const lines = content.split('\n');
            let firstSql = '';
            for (const line of lines) {
                if (line.trim().toUpperCase().startsWith('INSERT INTO')) {
                    firstSql = line.trim();
                    break;
                }
            }

            if (!firstSql) {
                showToast('未找到有效的 INSERT INTO 语句', 'warning');
                return;
            }

            // 解析表名和列名
            // 正则：INSERT INTO `?(\S+)`?\s*\((.+)\)\s*VALUES
            const match = firstSql.match(/INSERT\s+INTO\s+(.+?)\s*\((.+?)\)\s*VALUES/i);
            if (!match) {
                showToast('无法识别 SQL 结构，请确保包含表名和列名定义', 'error');
                return;
            }

            parsedTableName = match[1];
            const columnsStr = match[2];
            
            // 更新 UI 显示
            if (currentTableNameSpan) {
                currentTableNameSpan.textContent = parsedTableName;
            }
            
            // 分割列名，处理反引号
            parsedColumns = columnsStr.split(',').map(c => c.trim());
            
            // 渲染选择区
            renderColumnSelector();
            columnSelector.style.display = 'block';
            showToast('列名识别成功，请勾选要删除的字段', 'success');
        });
    }

    function renderColumnSelector() {
        columnList.innerHTML = '';
        parsedColumns.forEach((col, index) => {
            // col 可能带有反引号，显示时去掉比较好看，但保留原始值用于匹配？其实主要用 index
            const cleanName = col.replace(/`/g, '');
            
            const label = document.createElement('label');
            label.style.cssText = `
                display: flex; 
                align-items: center; 
                cursor: pointer; 
                background: rgba(0,0,0,0.2); 
                padding: 5px 10px; 
                border-radius: 4px;
                border: 1px solid var(--border-color);
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = index; // 存储索引
            checkbox.style.marginRight = '8px';
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(cleanName));
            
            // 点击切换样式
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    label.style.background = 'rgba(243, 139, 168, 0.2)'; // 红色背景
                    label.style.borderColor = 'var(--danger-color)';
                } else {
                    label.style.background = 'rgba(0,0,0,0.2)';
                    label.style.borderColor = 'var(--border-color)';
                }
            });

            columnList.appendChild(label);
        });
    }

    if (btnCleanerGenerate) {
        btnCleanerGenerate.addEventListener('click', () => {
            if (parsedColumns.length === 0) {
                showToast('请先识别列名', 'warning');
                return;
            }

            // 获取要删除的列索引
            const checkboxes = columnList.querySelectorAll('input[type="checkbox"]');
            const indicesToRemove = new Set();
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    indicesToRemove.add(parseInt(cb.value));
                }
            });

            // 获取新表名（如果启用了替换）
            let targetTableName = parsedTableName;
            if (enableRenameTable && enableRenameTable.checked) {
                const newName = newTableNameInput.value.trim();
                if (newName) {
                    targetTableName = newName;
                }
            }

            // 开始处理
            const content = cleanerInput.value.trim();
            const lines = content.split('\n'); // 简单按行分割，假设一行一条SQL
            const results = [];

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                if (!trimmedLine.toUpperCase().startsWith('INSERT INTO')) {
                    results.push(trimmedLine); // 不是 INSERT 语句，保持原样
                    continue;
                }

                try {
                    results.push(processInsertSql(trimmedLine, indicesToRemove, targetTableName));
                } catch (e) {
                    results.push(`/* Error processing: ${e.message} */\n${trimmedLine}`);
                }
            }

            // 显示结果
            cleanerPlaceholder.style.display = 'none';
            cleanerOutput.style.display = 'block';
            cleanerOutput.textContent = results.join('\n');
            showToast('生成成功', 'success');
        });
    }

    function processInsertSql(sql, indicesToRemove, targetTableName) {
        // 1. 分离头部 (INSERT ... VALUES) 和 值部分
        const valuesIndex = sql.toUpperCase().indexOf('VALUES');
        if (valuesIndex === -1) return sql;

        // const headerPart = sql.substring(0, valuesIndex + 6); // 废弃，我们需要重组头部
        const valuesPart = sql.substring(valuesIndex + 6).trim();

        // 2. 处理新的列名列表
        const newColumns = parsedColumns.filter((_, index) => !indicesToRemove.has(index));
        
        // 使用传入的 targetTableName (可能是新表名)
        const newHeader = `INSERT INTO ${targetTableName} (${newColumns.join(', ')}) VALUES`;

        // 3. 解析值部分
        // 格式可能是: (val1, val2), (val3, val4); 或者就一组
        // 简化处理：假设只有一组值，且以 ( 开头，以 ); 或 ) 结尾
        // 如果有多组值 VALUES (...), (...) 比较复杂，这里先假设用户提供的是单行单条插入
        
        // 去掉末尾的分号
        let cleanValuesPart = valuesPart;
        let hasSemicolon = false;
        if (cleanValuesPart.endsWith(';')) {
            hasSemicolon = true;
            cleanValuesPart = cleanValuesPart.slice(0, -1);
        }

        // 去掉首尾括号
        cleanValuesPart = cleanValuesPart.trim();
        if (cleanValuesPart.startsWith('(') && cleanValuesPart.endsWith(')')) {
            cleanValuesPart = cleanValuesPart.slice(1, -1);
        }

        // 4. 分割值
        const values = splitSqlValues(cleanValuesPart);
        
        if (values.length !== parsedColumns.length) {
            throw new Error(`列数(${parsedColumns.length})与值数(${values.length})不匹配`);
        }

        // 5. 过滤值
        const newValues = values.filter((_, index) => !indicesToRemove.has(index));

        // 6. 组装
        return `${newHeader} (${newValues.join(', ')})${hasSemicolon ? ';' : ''}`;
    }

    /**
     * 智能分割 SQL VALUES，处理引号内的逗号
     */
    function splitSqlValues(str) {
        const result = [];
        let current = '';
        let inQuote = false;
        let quoteChar = '';
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            
            if ((char === "'" || char === '"') && (i === 0 || str[i-1] !== '\\')) {
                if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuote = false;
                }
            }
            
            if (char === ',' && !inQuote) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    if (btnCleanerCopy) {
        btnCleanerCopy.addEventListener('click', () => {
            const content = cleanerOutput.innerText;
            if (!content || cleanerOutput.style.display === 'none') {
                showToast('没有可复制的内容', 'warning');
                return;
            }
            copyToClipboard(content);
        });
    }

    if (btnCleanerClear) {
        btnCleanerClear.addEventListener('click', () => {
            cleanerInput.value = '';
            cleanerOutput.textContent = '';
            cleanerOutput.style.display = 'none';
            cleanerPlaceholder.style.display = 'flex';
            columnSelector.style.display = 'none';
            parsedColumns = [];
            showToast('已清空', 'info');
        });
    }

    // ---------------------------------------------------------
    // 二维码/条形码工具逻辑
    // ---------------------------------------------------------
    
    // 输入监听
    if (jsonInput) {
        jsonInput.addEventListener('input', (e) => {
            currentInput = e.target.value;
            inputStats.textContent = `${currentInput.length} chars`;
            // 清除错误提示
            if (errorMsg.textContent) {
                errorMsg.textContent = '';
            }
        });
    }

    // 格式化按钮
    if (btnFormat) {
        btnFormat.addEventListener('click', () => {
            if (!validateInput()) return;
            
            try {
                const obj = JSON.parse(currentInput);
                const formatted = JSON.stringify(obj, null, 4);
                updateOutput(formatted, true);
                showToast('格式化成功', 'success');
            } catch (e) {
                handleError(e);
            }
        });
    }

    // 压缩按钮
    if (btnMinify) {
        btnMinify.addEventListener('click', () => {
            if (!validateInput()) return;
            
            try {
                const obj = JSON.parse(currentInput);
                const minified = JSON.stringify(obj);
                updateOutput(minified, true); // 压缩也高亮一下吧，虽然在一行
                showToast('压缩成功', 'success');
            } catch (e) {
                handleError(e);
            }
        });
    }

    // 复制按钮
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const content = jsonOutput.innerText; // 获取纯文本
            if (!content || jsonOutput.style.display === 'none') {
                showToast('没有可复制的内容', 'warning');
                return;
            }
            
            copyToClipboard(content);
        });
    }

    // 清空按钮
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            jsonInput.value = '';
            currentInput = '';
            inputStats.textContent = '0 chars';
            errorMsg.textContent = '';
            jsonOutput.innerHTML = '';
            jsonOutput.style.display = 'none';
            jsonPlaceholder.style.display = 'flex';
            // 清空字段表单
            const jsonFieldsForm = document.getElementById('json-fields-form');
            if (jsonFieldsForm) jsonFieldsForm.style.display = 'none';
            showToast('已清空', 'info');
        });
    }

    // JSON字段识别和填充功能
    const btnParseFields = document.getElementById('btn-parse-fields');
    const jsonFieldsForm = document.getElementById('json-fields-form');
    const jsonFieldsContainer = document.getElementById('json-fields-container');
    const btnAddJsonItem = document.getElementById('btn-add-json-item');
    const btnCloseFieldsForm = document.getElementById('btn-close-fields-form');
    
    let parsedJsonTemplate = null; // 存储解析后的JSON模板
    let collectedJsonItems = []; // 存储收集的JSON对象

    // 识别字段按钮
    if (btnParseFields) {
        btnParseFields.addEventListener('click', () => {
            const input = jsonInput.value.trim();
            if (!input) {
                showToast('请先输入JSON内容', 'warning');
                return;
            }

            try {
                let parsedData = JSON.parse(input);
                let templateObj = null;
                
                // 检查数据类型
                if (Array.isArray(parsedData)) {
                    // 如果是数组，取第一个元素作为模板
                    if (parsedData.length === 0) {
                        showToast('数组为空，无法识别字段', 'warning');
                        return;
                    }
                    templateObj = parsedData[0];
                    // 保存已有的数组数据
                    collectedJsonItems = [...parsedData];
                } else if (typeof parsedData === 'object' && parsedData !== null) {
                    // 如果是对象，直接使用
                    templateObj = parsedData;
                    collectedJsonItems = []; // 重置收集列表
                } else {
                    showToast('请输入对象或对象数组类型的JSON', 'warning');
                    return;
                }

                // 检查模板对象是否为有效对象
                if (typeof templateObj !== 'object' || templateObj === null || Array.isArray(templateObj)) {
                    showToast('无法识别有效的对象结构', 'warning');
                    return;
                }

                // 保存模板
                parsedJsonTemplate = templateObj;
                
                // 生成表单
                renderJsonFieldsForm(templateObj);
                jsonFieldsForm.style.display = 'block';
                
                if (Array.isArray(parsedData)) {
                    showToast(`字段识别成功！已加载 ${parsedData.length} 个现有对象`, 'success');
                } else {
                    showToast('字段识别成功，请填写字段值', 'success');
                }
            } catch (e) {
                showToast('JSON格式错误: ' + e.message, 'error');
            }
        });
    }

    // 关闭表单按钮
    if (btnCloseFieldsForm) {
        btnCloseFieldsForm.addEventListener('click', () => {
            jsonFieldsForm.style.display = 'none';
        });
    }

    // 添加到结果按钮
    if (btnAddJsonItem) {
        btnAddJsonItem.addEventListener('click', () => {
            if (!parsedJsonTemplate) {
                showToast('请先识别字段', 'warning');
                return;
            }

            // 收集表单数据
            const newItem = collectFormData();
            collectedJsonItems.push(newItem);

            // 显示结果
            const resultArray = collectedJsonItems;
            const formatted = JSON.stringify(resultArray, null, 4);
            updateOutput(formatted, true);
            
            // 清空表单
            clearJsonFieldsForm();
            
            showToast(`已添加第 ${collectedJsonItems.length} 个对象`, 'success');
        });
    }

    /**
     * 渲染JSON字段表单
     */
    function renderJsonFieldsForm(obj) {
        jsonFieldsContainer.innerHTML = '';
        
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fieldType = typeof value;
            
            // 创建字段容器
            const fieldDiv = document.createElement('div');
            fieldDiv.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
            
            // 字段标签
            const label = document.createElement('label');
            label.textContent = key;
            label.style.cssText = 'color: var(--text-primary); font-size: 13px; font-weight: bold;';
            
            // 输入框
            let input;
            if (fieldType === 'boolean') {
                // 布尔类型使用下拉框
                input = document.createElement('select');
                input.innerHTML = '<option value="true">true</option><option value="false">false</option>';
                input.value = value.toString();
            } else if (fieldType === 'number') {
                // 数字类型
                input = document.createElement('input');
                input.type = 'number';
                input.value = value;
                input.step = 'any';
            } else if (fieldType === 'object' && value === null) {
                // null类型
                input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'null 或输入值';
                input.value = '';
            } else {
                // 字符串类型
                input = document.createElement('input');
                input.type = 'text';
                input.value = value || '';
            }
            
            input.dataset.fieldName = key;
            input.dataset.fieldType = fieldType;
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                background: var(--bg-dark);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                outline: none;
                font-size: 13px;
            `;
            
            fieldDiv.appendChild(label);
            fieldDiv.appendChild(input);
            jsonFieldsContainer.appendChild(fieldDiv);
        });
    }

    /**
     * 收集表单数据
     */
    function collectFormData() {
        const result = {};
        const inputs = jsonFieldsContainer.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            const fieldName = input.dataset.fieldName;
            const fieldType = input.dataset.fieldType;
            let value = input.value;
            
            // 类型转换
            if (fieldType === 'number') {
                value = value === '' ? 0 : parseFloat(value);
            } else if (fieldType === 'boolean') {
                value = value === 'true';
            } else if (fieldType === 'object' && (value === '' || value === 'null')) {
                value = null;
            }
            
            result[fieldName] = value;
        });
        
        return result;
    }

    /**
     * 清空表单
     */
    function clearJsonFieldsForm() {
        const inputs = jsonFieldsContainer.querySelectorAll('input, select');
        inputs.forEach(input => {
            const fieldType = input.dataset.fieldType;
            if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else if (fieldType === 'number') {
                input.value = '0';
            } else {
                input.value = '';
            }
        });
    }

    // ---------------------------------------------------------
    // SQL 工具逻辑
    // ---------------------------------------------------------
    const sqlInput = document.getElementById('sql-input');
    const sqlOutput = document.getElementById('sql-output');
    const sqlPlaceholder = document.getElementById('sql-placeholder');
    const btnSqlConvert = document.getElementById('btn-sql-convert');
    const btnSqlCopy = document.getElementById('btn-sql-copy');
    const btnSqlClear = document.getElementById('btn-sql-clear');

    if (btnSqlConvert) {
        btnSqlConvert.addEventListener('click', () => {
            const content = sqlInput.value.trim();
            if (!content) {
                showToast('请输入 MyBatis 日志', 'warning');
                return;
            }

            try {
                const sql = parseMyBatisLog(content);
                if (sql) {
                    // 显示结果
                    sqlPlaceholder.style.display = 'none';
                    sqlOutput.style.display = 'block';
                    sqlOutput.textContent = sql; // 暂时只显示文本，不搞复杂高亮
                    showToast('拼接成功', 'success');
                } else {
                    showToast('未能解析出有效的 SQL 或参数', 'warning');
                }
            } catch (e) {
                console.error(e);
                showToast('解析出错: ' + e.message, 'error');
            }
        });
    }

    if (btnSqlCopy) {
        btnSqlCopy.addEventListener('click', () => {
            const content = sqlOutput.innerText;
            if (!content || sqlOutput.style.display === 'none') {
                showToast('没有可复制的内容', 'warning');
                return;
            }
            copyToClipboard(content);
        });
    }

    if (btnSqlClear) {
        btnSqlClear.addEventListener('click', () => {
            sqlInput.value = '';
            sqlOutput.textContent = '';
            sqlOutput.style.display = 'none';
            sqlPlaceholder.style.display = 'flex';
            showToast('已清空', 'info');
        });
    }

    function parseMyBatisLog(logText) {
        const lines = logText.split('\n');
        const results = [];
        let currentSql = null;

        // 匹配 Preparing 行
        const preparingRegex = /==>\s+Preparing:\s+(.+)/;
        // 匹配 Parameters 行
        const parametersRegex = /==>\s+Parameters:\s+(.*)/;

        for (const line of lines) {
            // 1. 检查 Preparing
            const prepMatch = line.match(preparingRegex);
            if (prepMatch) {
                // 如果之前有未处理的 SQL (即没有对应的 Parameters)，先保存它
                if (currentSql) {
                    if (currentSql.includes('?')) {
                        results.push(`/* Warning: Missing Parameters for this SQL */\n${ensureSemicolon(currentSql)}`);
                    } else {
                        results.push(ensureSemicolon(currentSql));
                    }
                }
                currentSql = prepMatch[1].trim();
                continue;
            }

            // 2. 检查 Parameters
            const paramMatch = line.match(parametersRegex);
            if (paramMatch) {
                if (currentSql) {
                    const paramsStr = paramMatch[1].trim();
                    try {
                        const params = parseParams(paramsStr);
                        let finalSql = currentSql;
                        
                        // 依次替换 ?
                        for (const param of params) {
                            finalSql = finalSql.replace('?', param);
                        }
                        
                        results.push(ensureSemicolon(finalSql));
                    } catch (e) {
                        results.push(`/* Error parsing parameters: ${e.message} */\n${ensureSemicolon(currentSql)}`);
                    }
                    currentSql = null; // 处理完毕，重置
                }
                continue;
            }
        }

        // 处理最后一条可能遗留的 SQL
        if (currentSql) {
            if (currentSql.includes('?')) {
                results.push(`/* Warning: Missing Parameters (at end) */\n${ensureSemicolon(currentSql)}`);
            } else {
                results.push(ensureSemicolon(currentSql));
            }
        }

        return results.join('\n\n');
    }

    function ensureSemicolon(sql) {
        return sql.trim().endsWith(';') ? sql : sql + ';';
    }

    function parseParams(paramsStr) {
        // 简单的逗号分割策略：需要处理 null 和 (Type)
        // 更加健壮的策略是：按 ", " 分割，然后检查每一项是否是一个合法的参数结尾
        // 合法参数结尾："(Type)" 或者 "null"
        
        const rawSegments = paramsStr.split(/,\s*/); // 先按逗号+空格分割
        const params = [];
        let currentParamBuffer = [];

        for (let i = 0; i < rawSegments.length; i++) {
            const segment = rawSegments[i];
            currentParamBuffer.push(segment);

            // 检查当前 buffer 拼起来是否像一个完整参数
            // 完整参数特征：
            // 1. 等于 "null"
            // 2. 匹配 /.+\(\w+\)$/  (即以 (Type) 结尾)
            
            const joined = currentParamBuffer.join(', ');
            
            if (joined === 'null') {
                params.push('null');
                currentParamBuffer = [];
            } else if (/.+\(\w+\)$/.test(joined)) {
                // 提取值和类型
                const match = joined.match(/(.+)\((\w+)\)$/);
                if (match) {
                    const value = match[1];
                    const type = match[2];
                    params.push(formatParamValue(value, type));
                } else {
                    // 应该不会走到这，正则已经保证了
                    params.push(joined); 
                }
                currentParamBuffer = [];
            }
            // 如果都不是，说明可能是被逗号切断的字符串的一部分，继续循环添加下一个片段
        }

        return params;
    }

    function formatParamValue(value, type) {
        // 根据类型决定是否加引号
        const numericTypes = ['Integer', 'Long', 'Double', 'Float', 'Short', 'Byte', 'Boolean'];
        
        if (numericTypes.includes(type)) {
            return value;
        } else {
            // String, Timestamp, Date, Time 等需要加引号
            return `'${value}'`;
        }
    }

    // ---------------------------------------------------------
    // 补票号码分解工具逻辑
    // ---------------------------------------------------------
    const nffFileInput = document.getElementById('nff-file-input');
    const nffFileName = document.getElementById('nff-file-name');
    const nffRows = document.getElementById('nff-rows');
    const nffCols = document.getElementById('nff-cols');
    const nffTemplateNum = document.getElementById('nff-template-num');
    const btnNffGenerate = document.getElementById('btn-nff-generate');
    const nffMessage = document.getElementById('nff-message');

    let nffOriginalSortedJNumbersCache = null;
    let nffOriginalFileNameBaseCache = "output";

    if (nffFileInput) {
        nffFileInput.addEventListener('change', () => {
            const file = nffFileInput.files[0];
            if (file) {
                nffFileName.textContent = file.name;
                nffFileName.style.color = 'var(--text-primary)';
                
                // 启用按钮
                btnNffGenerate.disabled = false;
                
                // 重置模板套数
                nffTemplateNum.value = 1;
                
                // 缓存清理
                nffOriginalSortedJNumbersCache = null;
                const lastDotIndex = file.name.lastIndexOf('.');
                nffOriginalFileNameBaseCache = lastDotIndex === -1 ? file.name : file.name.substring(0, lastDotIndex);
                
                updateNffTemplateMax();
                displayNffMessage(''); // 清空消息
            } else {
                nffFileName.textContent = '未选择文件';
                nffFileName.style.color = 'var(--text-secondary)';
                
                // 禁用按钮
                btnNffGenerate.disabled = true;
            }
        });
    }

    if (nffRows) nffRows.addEventListener('input', updateNffTemplateMax);
    if (nffCols) nffCols.addEventListener('input', updateNffTemplateMax);

    function updateNffTemplateMax() {
        const rows = parseInt(nffRows.value, 10) || 1;
        const cols = parseInt(nffCols.value, 10) || 1;
        const maxTemplates = rows * cols;
        nffTemplateNum.max = maxTemplates;
        if (parseInt(nffTemplateNum.value, 10) > maxTemplates) {
            nffTemplateNum.value = maxTemplates;
        }
    }

    function displayNffMessage(message, type = "success") {
        if (!message) {
            nffMessage.style.display = 'none';
            return;
        }
        nffMessage.style.display = 'block';
        nffMessage.textContent = message;
        
        if (type === 'error') {
            nffMessage.style.background = 'var(--danger-color)'; // 背景改淡一点比较好，这里简单处理
            nffMessage.style.backgroundColor = 'rgba(245, 108, 108, 0.1)';
            nffMessage.style.color = 'var(--danger-color)';
            nffMessage.style.border = '1px solid var(--danger-color)';
        } else {
            nffMessage.style.backgroundColor = 'rgba(103, 194, 58, 0.1)';
            nffMessage.style.color = 'var(--success-color)';
            nffMessage.style.border = '1px solid var(--success-color)';
        }
    }

    if (btnNffGenerate) {
        btnNffGenerate.addEventListener('click', async () => {
            const rowsPerSheet = parseInt(nffRows.value, 10);
            const colsPerSheet = parseInt(nffCols.value, 10);
            const templateNumber = parseInt(nffTemplateNum.value, 10);

            if (!rowsPerSheet || rowsPerSheet < 1 || !colsPerSheet || colsPerSheet < 1) {
                 showToast('错误：行列数必须是大于0的整数。', 'error');
                 return;
            }
            if (isNaN(templateNumber) || templateNumber < 1) {
                showToast('错误：请输入一个有效的模板套数 (必须大于等于1)。', 'error');
                return;
            }

            displayNffMessage('正在读取和排序号码...', 'success');
            
            // 开始处理
            try {
                const dataResult = await getNffSortedJNumbers();
                if (!dataResult) return;
                
                const { sortedJNumbers: originalSortedJNumbers, fileNameBase } = dataResult;
                
                const shiftAmount = templateNumber - 1;
                const formatIdentifier = templateNumber;
                const itemsPerSheet = rowsPerSheet * colsPerSheet;
                const calculatedNumSheets = (originalSortedJNumbers.length > 0) 
                    ? Math.ceil(originalSortedJNumbers.length / itemsPerSheet) 
                    : 0;

                displayNffMessage('正在生成矩阵...', 'success');
                let sheetsData = populateSheetsData([...originalSortedJNumbers], calculatedNumSheets, rowsPerSheet, colsPerSheet);
                if (shiftAmount > 0) {
                    sheetsData = applyIntraSheetCircularShift(sheetsData, rowsPerSheet, colsPerSheet, shiftAmount);
                }
                
                const outputContent = formatSheetsToString(sheetsData, calculatedNumSheets, rowsPerSheet, colsPerSheet, fileNameBase, formatIdentifier, true);
                const downloadFileName = `${fileNameBase}_${formatIdentifier}_1_${calculatedNumSheets}.nff`;
                
                let message = `模板 ${templateNumber}`;
                if (shiftAmount > 0) {
                    message += ` (位移 ${shiftAmount} 位)`;
                }
                message += ' 文件已生成!';
                
                if (originalSortedJNumbers.length === 0) {
                    displayNffMessage('文件中没有有效的号码数据，已生成空文件头。', 'success');
                } else {
                    displayNffMessage(message, 'success');
                }
                showToast('生成成功', 'success');

                downloadFile(outputContent, downloadFileName);
                
                // 自动增加模板套数
                const maxVal = parseInt(nffTemplateNum.max, 10);
                if (templateNumber < maxVal) {
                    nffTemplateNum.value = templateNumber + 1;
                }

            } catch (e) {
                displayNffMessage('处理失败: ' + e.message, 'error');
                console.error(e);
            }
        });
    }

    function getNffSortedJNumbers() {
        if (nffOriginalSortedJNumbersCache) {
            return Promise.resolve({ sortedJNumbers: [...nffOriginalSortedJNumbersCache], fileNameBase: nffOriginalFileNameBaseCache });
        }

        if (nffFileInput.files.length === 0) {
            showToast('请先选择一个文件。', 'warning');
            return Promise.resolve(null);
        }
        const file = nffFileInput.files[0];

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/);
                    let jNumbers = lines.map(line => line.trim().replace(/;$/, ''))
                                        .filter(line => line !== '' && !line.startsWith('#') && !line.startsWith('['));

                    if (jNumbers.length === 0) {
                        resolve({ sortedJNumbers: [], fileNameBase: nffOriginalFileNameBaseCache });
                        return;
                    }

                    jNumbers.sort((a, b) => {
                        const tryParseA = a.match(/([A-Za-z]+)(\d+)/);
                        const tryParseB = b.match(/([A-Za-z]+)(\d+)/);

                        if (tryParseA && tryParseB) {
                            const [, aLetter, aNumStr] = tryParseA;
                            const [, bLetter, bNumStr] = tryParseB;
                            const aNum = parseInt(aNumStr, 10);
                            const bNum = parseInt(bNumStr, 10);

                            if (aLetter.toUpperCase() < bLetter.toUpperCase()) return -1;
                            if (aLetter.toUpperCase() > bLetter.toUpperCase()) return 1;
                            return aNum - bNum;
                        }
                        return a.localeCompare(b);
                    });
                    nffOriginalSortedJNumbersCache = [...jNumbers];
                    resolve({ sortedJNumbers: jNumbers, fileNameBase: nffOriginalFileNameBaseCache });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = function() {
                reject(new Error('FileReader error'));
            };
            reader.readAsText(file);
        });
    }

    function populateSheetsData(jNumListToFill, numTargetSheets, rowsPerSheet, colsPerSheet) {
        let sheets = Array.from({ length: numTargetSheets }, () => 
            Array.from({ length: rowsPerSheet }, () => 
                Array(colsPerSheet).fill("----------")
            )
        );
        let currentJNumberIndex = 0;
        const totalJNumbersInList = jNumListToFill.length;

        for (let colGroup = 0; colGroup < colsPerSheet; colGroup++) {
            for (let row = 0; row < rowsPerSheet; row++) {
                for (let sheetIdx = 0; sheetIdx < numTargetSheets; sheetIdx++) {
                    if (currentJNumberIndex < totalJNumbersInList) {
                        const actualCol = colsPerSheet - 1 - colGroup;
                        sheets[sheetIdx][row][actualCol] = jNumListToFill[currentJNumberIndex];
                        currentJNumberIndex++;
                    }
                }
            }
        }
        return sheets;
    }
    
    function applyIntraSheetCircularShift(sheets, rowsPerSheet, colsPerSheet, shiftAmount) {
        if (shiftAmount === 0) return sheets;

        const newSheets = [];
        const itemsPerSheet = rowsPerSheet * colsPerSheet;
        const effectiveShift = shiftAmount % itemsPerSheet;
        
        if (effectiveShift === 0) return JSON.parse(JSON.stringify(sheets));

        for (const sheet of sheets) {
            const linearizedData = [];
            for (let col = colsPerSheet - 1; col >= 0; col--) {
                for (let row = 0; row < rowsPerSheet; row++) {
                    linearizedData.push(sheet[row][col]);
                }
            }
            
            let shiftedData = linearizedData;
            if (linearizedData.length > 1) {
                shiftedData = linearizedData.slice(effectiveShift).concat(linearizedData.slice(0, effectiveShift));
            }

            const newSheet = Array.from({ length: rowsPerSheet }, () => Array(colsPerSheet).fill("----------"));
            let index = 0;
            for (let col = colsPerSheet - 1; col >= 0; col--) {
                for (let row = 0; row < rowsPerSheet; row++) {
                    if (index < shiftedData.length) {
                        newSheet[row][col] = shiftedData[index];
                        index++;
                    }
                }
            }
            newSheets.push(newSheet);
        }
        return newSheets;
    }

    function formatSheetsToString(sheetsData, numSheetsInOutput, rowsPerSheet, colsPerSheet, jobNameBase, formatIdentifier, addNFFMHeaders = false) {
        let outputContent = "";
        const jobIdentifier = `${jobNameBase}_${formatIdentifier} 1..${numSheetsInOutput}`;

        if (addNFFMHeaders) {
            outputContent += "# NFFM test numbers\n";
            outputContent += "# empty numbers will be represented by N/A\n";
        }
        
        if (numSheetsInOutput === 0) {
             const emptyJobIdentifier = `${jobNameBase}_${formatIdentifier} 1..0`;
             outputContent += `[JOB],${emptyJobIdentifier}\n`;
             outputContent += `[ROWS],${rowsPerSheet}\n`;
             outputContent += `[COLS],${colsPerSheet}\n`;
             outputContent += `[SHAFT],BOTH\n`;
             return outputContent;
        }

        outputContent += `[JOB],${jobIdentifier}\n`;
        outputContent += `[ROWS],${rowsPerSheet}\n`;
        outputContent += `[COLS],${colsPerSheet}\n`;
        outputContent += `[SHAFT],BOTH\n\n`;

        for (let i = 0; i < numSheetsInOutput; i++) {
            outputContent += `[SHEETNO],${i + 1}\n`;
            if (sheetsData[i]) {
                sheetsData[i].forEach(row => {
                    outputContent += row.join(',') + "\n";
                });
            }
            if (i < numSheetsInOutput - 1) {
                outputContent += "\n";
            }
        }
        return outputContent;
    }

    function downloadFile(content, fileName) {
        const a = document.createElement('a');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    // ---------------------------------------------------------
    // 编码/加密转换工具逻辑
    // ---------------------------------------------------------
    
    // Tab 切换逻辑
    const codecTabs = document.querySelectorAll('#codec-tabs .tab-item');
    const codecContents = document.querySelectorAll('.codec-tab-content');

    codecTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有 active 状态
            codecTabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.fontWeight = 'normal';
                t.style.color = 'var(--text-secondary)';
            });
            codecContents.forEach(c => c.style.display = 'none');

            // 激活当前 Tab
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--accent-color)';
            tab.style.fontWeight = 'bold';
            tab.style.color = 'var(--text-primary)';

            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(`tab-${targetId}`);
            if (targetContent) {
                targetContent.style.display = 'flex'; // 使用 flex 布局
            }
        });
    });

    // 1. 图片 / Base64
    const codecImgInput = document.getElementById('codec-img-input');
    const codecImgBase64 = document.getElementById('codec-img-base64');
    const btnCodecBase64ToImg = document.getElementById('btn-codec-base64-to-img');
    const btnCodecImgClear = document.getElementById('btn-codec-img-clear');
    const codecImgPreview = document.getElementById('codec-img-preview');
    const codecImgPlaceholder = document.getElementById('codec-img-placeholder');

    if (codecImgInput) {
        codecImgInput.addEventListener('change', () => {
            const file = codecImgInput.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                codecImgBase64.value = base64;
                showPreviewImage(base64);
                showToast('图片转 Base64 成功', 'success');
            };
            reader.onerror = () => showToast('读取文件失败', 'error');
            reader.readAsDataURL(file);
            
            // 重置 input 允许重复选择
            codecImgInput.value = ''; 
        });
    }

    if (btnCodecBase64ToImg) {
        btnCodecBase64ToImg.addEventListener('click', () => {
            const base64 = codecImgBase64.value.trim();
            if (!base64) {
                showToast('请先输入 Base64 字符串', 'warning');
                return;
            }
            showPreviewImage(base64);
        });
    }

    if (btnCodecImgClear) {
        btnCodecImgClear.addEventListener('click', () => {
            codecImgBase64.value = '';
            codecImgPreview.src = '';
            codecImgPreview.style.display = 'none';
            codecImgPlaceholder.style.display = 'block';
            showToast('已清空', 'info');
        });
    }

    function showPreviewImage(src) {
        codecImgPreview.src = src;
        codecImgPreview.style.display = 'block';
        codecImgPlaceholder.style.display = 'none';
    }

    // 2. URL 编码
    const codecUrlInput = document.getElementById('codec-url-input');
    const codecUrlOutput = document.getElementById('codec-url-output');
    const btnCodecUrlEncode = document.getElementById('btn-codec-url-encode');
    const btnCodecUrlDecode = document.getElementById('btn-codec-url-decode');

    if (btnCodecUrlEncode) {
        btnCodecUrlEncode.addEventListener('click', () => {
            try {
                codecUrlOutput.value = encodeURIComponent(codecUrlInput.value);
                showToast('URL 编码成功', 'success');
            } catch (e) {
                showToast('编码失败: ' + e.message, 'error');
            }
        });
    }

    if (btnCodecUrlDecode) {
        btnCodecUrlDecode.addEventListener('click', () => {
            try {
                codecUrlOutput.value = decodeURIComponent(codecUrlInput.value);
                showToast('URL 解码成功', 'success');
            } catch (e) {
                showToast('解码失败: ' + e.message, 'error');
            }
        });
    }

    // 3. Base64 文本
    const codecBase64TextInput = document.getElementById('codec-base64-text-input');
    const codecBase64TextOutput = document.getElementById('codec-base64-text-output');
    const btnCodecBase64Encode = document.getElementById('btn-codec-base64-encode');
    const btnCodecBase64Decode = document.getElementById('btn-codec-base64-decode');

    if (btnCodecBase64Encode) {
        btnCodecBase64Encode.addEventListener('click', () => {
            try {
                // 支持中文 UTF-8
                const str = codecBase64TextInput.value;
                const base64 = btoa(unescape(encodeURIComponent(str)));
                codecBase64TextOutput.value = base64;
                showToast('Base64 加密成功', 'success');
            } catch (e) {
                showToast('加密失败: ' + e.message, 'error');
            }
        });
    }

    if (btnCodecBase64Decode) {
        btnCodecBase64Decode.addEventListener('click', () => {
            try {
                const base64 = codecBase64TextInput.value.trim();
                const str = decodeURIComponent(escape(atob(base64)));
                codecBase64TextOutput.value = str;
                showToast('Base64 解密成功', 'success');
            } catch (e) {
                showToast('解密失败: 格式错误', 'error');
            }
        });
    }

    // 4. UTF-8 Hex
    const codecUtf8Input = document.getElementById('codec-utf8-input');
    const codecUtf8Output = document.getElementById('codec-utf8-output');
    const btnCodecUtf8Encode = document.getElementById('btn-codec-utf8-encode');
    const btnCodecUtf8Decode = document.getElementById('btn-codec-utf8-decode');

    if (btnCodecUtf8Encode) {
        btnCodecUtf8Encode.addEventListener('click', () => {
            try {
                const str = codecUtf8Input.value;
                const encoder = new TextEncoder();
                const data = encoder.encode(str);
                // 转 Hex
                const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
                codecUtf8Output.value = hex.toUpperCase();
                showToast('UTF-8 转 Hex 成功', 'success');
            } catch (e) {
                showToast('转换失败: ' + e.message, 'error');
            }
        });
    }

    if (btnCodecUtf8Decode) {
        btnCodecUtf8Decode.addEventListener('click', () => {
            try {
                let hex = codecUtf8Input.value.trim();
                // 去除空格
                hex = hex.replace(/\s+/g, '');
                if (hex.length % 2 !== 0) {
                    throw new Error('Hex 长度必须是偶数');
                }
                
                const data = new Uint8Array(hex.length / 2);
                for (let i = 0; i < hex.length; i += 2) {
                    data[i / 2] = parseInt(hex.substr(i, 2), 16);
                }
                
                const decoder = new TextDecoder();
                codecUtf8Output.value = decoder.decode(data);
                showToast('Hex 转 UTF-8 成功', 'success');
            } catch (e) {
                showToast('转换失败: ' + e.message, 'error');
            }
        });
    }

    // ---------------------------------------------------------
    // 时间戳转换工具逻辑
    // ---------------------------------------------------------
    const tsInput = document.getElementById('ts-input');
    const timeInput = document.getElementById('time-input');
    const btnTsToTime = document.getElementById('btn-ts-to-time');
    const btnTimeToTs = document.getElementById('btn-time-to-ts');
    const btnTsNow = document.getElementById('btn-ts-now');
    const btnTsClear = document.getElementById('btn-ts-clear');
    
    const currentTimeDisplay = document.getElementById('current-time');
    const currentTimestampDisplay = document.getElementById('current-timestamp');
    
    const tsResultContainer = document.getElementById('ts-result-container');
    const timeResultContainer = document.getElementById('time-result-container');
    const tsPlaceholder = document.getElementById('ts-placeholder');

    // 更新当前时间显示
    function updateCurrentTime() {
        const now = new Date();
        const beijingTime = formatBeijingTime(now);
        const timestamp = Math.floor(now.getTime() / 1000);
        
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = beijingTime;
        }
        if (currentTimestampDisplay) {
            currentTimestampDisplay.textContent = timestamp;
        }
    }

    // 格式化北京时间
    function formatBeijingTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // 获取星期
    function getWeekday(date) {
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return weekdays[date.getDay()];
    }

    // 初始化时更新一次，然后每秒更新
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 时间戳转时间
    if (btnTsToTime) {
        btnTsToTime.addEventListener('click', () => {
            const input = tsInput.value.trim();
            if (!input) {
                showToast('请输入时间戳', 'warning');
                return;
            }

            const timestamp = parseInt(input);
            if (isNaN(timestamp)) {
                showToast('时间戳格式错误', 'error');
                return;
            }

            // 判断是10位还是13位
            let date;
            let tsType;
            if (input.length === 10) {
                // 10位时间戳（秒）
                date = new Date(timestamp * 1000);
                tsType = '10位（秒级）';
            } else if (input.length === 13) {
                // 13位时间戳（毫秒）
                date = new Date(timestamp);
                tsType = '13位（毫秒级）';
            } else {
                showToast('请输入10位或13位时间戳', 'warning');
                return;
            }

            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                showToast('无效的时间戳', 'error');
                return;
            }

            // 显示结果
            document.getElementById('ts-result-beijing').textContent = formatBeijingTime(date);
            document.getElementById('ts-result-formatted').textContent = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            document.getElementById('ts-year').textContent = date.getFullYear();
            document.getElementById('ts-month').textContent = date.getMonth() + 1 + '月';
            document.getElementById('ts-day').textContent = date.getDate() + '日';
            document.getElementById('ts-weekday').textContent = getWeekday(date);
            document.getElementById('ts-time').textContent = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
            document.getElementById('ts-type').textContent = tsType;

            tsPlaceholder.style.display = 'none';
            timeResultContainer.style.display = 'none';
            tsResultContainer.style.display = 'block';
            
            showToast('转换成功', 'success');
        });
    }

    // 时间转时间戳
    if (btnTimeToTs) {
        btnTimeToTs.addEventListener('click', () => {
            const input = timeInput.value;
            if (!input) {
                showToast('请选择时间', 'warning');
                return;
            }

            // datetime-local 返回的是本地时间
            const date = new Date(input);
            if (isNaN(date.getTime())) {
                showToast('无效的时间', 'error');
                return;
            }

            const timestamp13 = date.getTime();
            const timestamp10 = Math.floor(timestamp13 / 1000);

            document.getElementById('time-result-10').textContent = timestamp10;
            document.getElementById('time-result-13').textContent = timestamp13;

            tsPlaceholder.style.display = 'none';
            tsResultContainer.style.display = 'none';
            timeResultContainer.style.display = 'block';
            
            showToast('转换成功', 'success');
        });
    }

    // 获取当前时间戳
    if (btnTsNow) {
        btnTsNow.addEventListener('click', () => {
            const now = Date.now();
            const timestamp10 = Math.floor(now / 1000);
            
            // 填充到输入框
            tsInput.value = timestamp10;
            
            // 自动转换
            btnTsToTime.click();
        });
    }

    // 清空
    if (btnTsClear) {
        btnTsClear.addEventListener('click', () => {
            tsInput.value = '';
            timeInput.value = '';
            tsResultContainer.style.display = 'none';
            timeResultContainer.style.display = 'none';
            tsPlaceholder.style.display = 'flex';
            showToast('已清空', 'info');
        });
    }

    // ---------------------------------------------------------
    // 请求头工具逻辑
    // ---------------------------------------------------------
    
    // 请求头模板数据
    const headerTemplates = {
        json: 'Content-Type: application/json',
        form: 'Content-Type: application/x-www-form-urlencoded',
        multipart: 'Content-Type: multipart/form-data',
        accept: 'Accept: application/json',
        cache: 'Cache-Control: no-cache, no-store, must-revalidate',
        cors: 'Access-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE\nAccess-Control-Allow-Headers: Content-Type',
        useragent: 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 绑定所有复制按钮
    const copyHeaderButtons = document.querySelectorAll('.btn-copy-header');
    copyHeaderButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.header-card');
            const headerType = card.getAttribute('data-header-type');
            let headerText = '';

            // 根据类型生成请求头
            switch(headerType) {
                case 'jwt':
                    const jwtToken = document.getElementById('jwt-token-input').value.trim();
                    if (!jwtToken) {
                        showToast('请输入JWT Token', 'warning');
                        return;
                    }
                    headerText = `Authorization: Bearer ${jwtToken}`;
                    break;
                
                case 'basic':
                    const username = document.getElementById('basic-username').value.trim();
                    const password = document.getElementById('basic-password').value.trim();
                    if (!username || !password) {
                        showToast('请输入用户名和密码', 'warning');
                        return;
                    }
                    const credentials = btoa(`${username}:${password}`);
                    headerText = `Authorization: Basic ${credentials}`;
                    break;
                
                case 'apikey':
                    const apiKey = document.getElementById('api-key-input').value.trim();
                    if (!apiKey) {
                        showToast('请输入API Key', 'warning');
                        return;
                    }
                    headerText = `X-API-Key: ${apiKey}`;
                    break;
                
                case 'referer':
                    const referer = document.getElementById('referer-input').value.trim();
                    if (!referer) {
                        showToast('请输入Referer URL', 'warning');
                        return;
                    }
                    headerText = `Referer: ${referer}`;
                    break;
                
                case 'cookie':
                    const cookie = document.getElementById('cookie-input').value.trim();
                    if (!cookie) {
                        showToast('请输入Cookie', 'warning');
                        return;
                    }
                    headerText = `Cookie: ${cookie}`;
                    break;
                
                default:
                    // 使用预定义模板
                    headerText = headerTemplates[headerType] || '';
                    break;
            }

            if (headerText) {
                copyToClipboard(headerText);
            } else {
                showToast('无法生成请求头', 'error');
            }
        });
    });

    // 自定义请求头
    const customHeaderName = document.getElementById('custom-header-name');
    const customHeaderValue = document.getElementById('custom-header-value');
    const customHeaderPreview = document.getElementById('custom-header-preview');
    const btnCopyCustomHeader = document.getElementById('btn-copy-custom-header');

    // 实时预览
    function updateCustomHeaderPreview() {
        const name = customHeaderName.value.trim();
        const value = customHeaderValue.value.trim();
        
        if (name && value) {
            customHeaderPreview.textContent = `${name}: ${value}`;
        } else if (name) {
            customHeaderPreview.textContent = `${name}: `;
        } else {
            customHeaderPreview.textContent = '请输入请求头名称和值';
        }
    }

    if (customHeaderName) {
        customHeaderName.addEventListener('input', updateCustomHeaderPreview);
    }
    if (customHeaderValue) {
        customHeaderValue.addEventListener('input', updateCustomHeaderPreview);
    }

    // 复制自定义请求头
    if (btnCopyCustomHeader) {
        btnCopyCustomHeader.addEventListener('click', () => {
            const name = customHeaderName.value.trim();
            const value = customHeaderValue.value.trim();
            
            if (!name || !value) {
                showToast('请输入完整的请求头名称和值', 'warning');
                return;
            }
            
            const headerText = `${name}: ${value}`;
            copyToClipboard(headerText);
        });
    }

    // 清空按钮
    const btnHeaderClear = document.getElementById('btn-header-clear');
    if (btnHeaderClear) {
        btnHeaderClear.addEventListener('click', () => {
            // 清空所有输入框
            document.getElementById('jwt-token-input').value = '';
            document.getElementById('basic-username').value = '';
            document.getElementById('basic-password').value = '';
            document.getElementById('api-key-input').value = '';
            document.getElementById('referer-input').value = '';
            document.getElementById('cookie-input').value = '';
            customHeaderName.value = '';
            customHeaderValue.value = '';
            updateCustomHeaderPreview();
            showToast('已清空', 'info');
        });
    }

    // ---------------------------------------------------------
    // 会议纪要工具逻辑已移至 notes.js
    // ---------------------------------------------------------

    // ---------------------------------------------------------
    // 辅助函数
    // ---------------------------------------------------------

    function validateInput() {
        if (!currentInput.trim()) {
            showToast('请输入 JSON 内容', 'warning');
            return false;
        }
        return true;
    }

    function handleError(e) {
        errorMsg.textContent = e.message;
        showToast('JSON 格式错误', 'error');
        console.error(e);
    }

    function updateOutput(jsonString, highlight = false) {
        errorMsg.textContent = '';
        jsonPlaceholder.style.display = 'none';
        jsonOutput.style.display = 'block';
        
        if (highlight) {
            jsonOutput.innerHTML = syntaxHighlight(jsonString);
        } else {
            jsonOutput.textContent = jsonString;
        }
    }

    /**
     * JSON 语法高亮
     */
    function syntaxHighlight(json) {
        if (!json) return '';
        
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }
});

/**
 * 复制到剪贴板 (全局函数)
 */
function copyToClipboard(text) {
    // 现代 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('已复制到剪贴板', 'success');
    } catch (err) {
        showToast('复制失败', 'error');
    }
    document.body.removeChild(textarea);
}

/**
 * 下载文件 (全局函数)
 */
function downloadFile(content, fileName) {
    const a = document.createElement('a');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

/**
 * 显示 Toast 提示 (全局函数)
 * @param {string} message 
 * @param {string} type 'success' | 'error' | 'warning' | 'info'
 */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // 添加图标 (可选)
    let iconHtml = '';
    switch(type) {
        case 'success': iconHtml = '<span style="margin-right:8px">✅</span>'; break;
        case 'error': iconHtml = '<span style="margin-right:8px">❌</span>'; break;
        case 'warning': iconHtml = '<span style="margin-right:8px">⚠️</span>'; break;
        default: iconHtml = '<span style="margin-right:8px">ℹ️</span>';
    }
    
    toast.innerHTML = `${iconHtml}${message}`;

    container.appendChild(toast);

    // 3秒后自动消失
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        toast.addEventListener('animationend', () => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            if (container.children.length === 0) {
                if (container.parentElement) {
                    container.parentElement.removeChild(container);
                }
            }
        });
    }, 3000);
}

// 全局错误捕获
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global Error:', message, error);
    showToast('发生未知错误: ' + message, 'error');
    return false;
};
