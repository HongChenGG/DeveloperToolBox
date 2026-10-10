const QR_MAX_INPUT_BYTES = 48000;
const QR_MAX_CHUNKS = 40;
const QR_DEFAULT_SIZE = 200;
const QR_MAX_SIZE = 1024;
const QR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const QR_MAX_SOURCE_PIXELS = 64 * 1024 * 1024;
const QR_MAX_DECODE_PIXELS = 4 * 1024 * 1024;
const QR_MAX_DECODE_SIDE = 4096;
const qrTextEncoder = new TextEncoder();

function parseQrSize(value) {
    const normalizedValue = String(value ?? '').trim();
    if (!/^\d+$/.test(normalizedValue)) {
        throw new Error(`二维码尺寸必须是 1-${QR_MAX_SIZE} 的正整数`);
    }

    const size = Number(normalizedValue);
    if (!Number.isSafeInteger(size) || size < 1 || size > QR_MAX_SIZE) {
        throw new Error(`二维码尺寸必须是 1-${QR_MAX_SIZE} 的正整数`);
    }
    return size;
}

function validateQrUploadSize(fileSize) {
    const normalizedSize = Number(fileSize);
    if (!Number.isSafeInteger(normalizedSize) || normalizedSize < 0 || normalizedSize > QR_MAX_UPLOAD_BYTES) {
        throw new Error(`二维码图片文件大小超过上限 ${QR_MAX_UPLOAD_BYTES} 字节`);
    }
    return normalizedSize;
}

function getQrDecodeDimensions(sourceWidth, sourceHeight) {
    const width = Number(sourceWidth);
    const height = Number(sourceHeight);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
        throw new Error('二维码图片尺寸无效');
    }

    const sourcePixels = width * height;
    if (!Number.isSafeInteger(sourcePixels) || sourcePixels > QR_MAX_SOURCE_PIXELS) {
        throw new Error(`二维码图片像素超过上限 ${QR_MAX_SOURCE_PIXELS}`);
    }

    const scale = Math.min(
        1,
        QR_MAX_DECODE_SIDE / width,
        QR_MAX_DECODE_SIDE / height,
        Math.sqrt(QR_MAX_DECODE_PIXELS / sourcePixels)
    );
    let decodeWidth = Math.max(1, Math.floor(width * scale));
    let decodeHeight = Math.max(1, Math.floor(height * scale));

    // 浮点取整后再次收紧，确保解码 Canvas 永远不越过像素上限。
    while (decodeWidth * decodeHeight > QR_MAX_DECODE_PIXELS) {
        if (decodeWidth >= decodeHeight) decodeWidth--;
        else decodeHeight--;
    }

    return {
        height: decodeHeight,
        scale,
        wasScaled: scale < 1,
        width: decodeWidth
    };
}

function getQrByteLength(text) {
    return qrTextEncoder.encode(String(text ?? '')).length;
}

function splitTextByByteLength(text, maxByteLength) {
    if (!Number.isInteger(maxByteLength) || maxByteLength <= 0) {
        throw new Error('二维码分片字节数必须是正整数');
    }

    const chunks = [];
    let currentChunk = '';
    let currentByteLength = 0;

    for (const character of String(text ?? '')) {
        const characterByteLength = getQrByteLength(character);
        if (characterByteLength > maxByteLength) {
            throw new Error('单个字符超过二维码分片上限');
        }
        if (currentChunk && currentByteLength + characterByteLength > maxByteLength) {
            chunks.push(currentChunk);
            currentChunk = '';
            currentByteLength = 0;
        }
        currentChunk += character;
        currentByteLength += characterByteLength;
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

function createQrGroupId() {
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function prepareQrPayloads(content, chunkByteLength, groupId = createQrGroupId()) {
    const normalizedContent = String(content ?? '');
    const totalBytes = getQrByteLength(normalizedContent);
    if (totalBytes > QR_MAX_INPUT_BYTES) {
        throw new Error(`输入 ${totalBytes} 字节，超过上限 ${QR_MAX_INPUT_BYTES} 字节`);
    }

    const chunks = splitTextByByteLength(normalizedContent, chunkByteLength);
    if (chunks.length > QR_MAX_CHUNKS) {
        throw new Error(`分片数量 ${chunks.length}，超过上限 ${QR_MAX_CHUNKS}`);
    }

    return {
        chunks,
        groupId,
        payloads: chunks.map((chunk, index) => `[TBXQR:${groupId}:${index + 1}/${chunks.length}]\n${chunk}`)
    };
}

function selectQrOutputNode(container) {
    return container?.querySelector('canvas:not([hidden])')
        || container?.querySelector('img:not([hidden])')
        || null;
}

function formatShanghaiDateTime(dateValue) {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) throw new Error('无效日期');

    const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });
    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, part.value])
    );

    return {
        ...parts,
        formatted: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
    };
}

function parseShanghaiDateTimeLocal(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) throw new Error('时间格式无效');

    const [, year, month, day, hour, minute, second = '00'] = match;
    const timestamp = Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour) - 8,
        Number(minute),
        Number(second)
    );
    const date = new Date(timestamp);
    const formatted = formatShanghaiDateTime(date);
    if (formatted.year !== year || formatted.month !== month || formatted.day !== day
        || formatted.hour !== hour || formatted.minute !== minute || formatted.second !== second) {
        throw new Error('时间值无效');
    }
    return date;
}

async function fetchJsonWithTimeout(url, {
    timeoutMs = 15000,
    signal,
    fetchImpl = fetch,
    headers
} = {}) {
    const controller = new AbortController();
    const abortFromParent = () => controller.abort();
    signal?.addEventListener('abort', abortFromParent, { once: true });
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        let response;
        try {
            response = await fetchImpl(url, { signal: controller.signal, headers });
        } catch (error) {
            const requestError = new Error(error.message || '网络请求失败');
            requestError.code = controller.signal.aborted
                ? (signal?.aborted ? 'ABORTED' : 'TIMEOUT')
                : 'NETWORK_ERROR';
            throw requestError;
        }

        if (!response.ok) {
            const httpError = new Error(`HTTP ${response.status}`);
            httpError.code = 'HTTP_ERROR';
            httpError.status = response.status;
            throw httpError;
        }

        try {
            return await response.json();
        } catch (error) {
            const jsonError = new Error('响应不是有效 JSON');
            jsonError.code = 'INVALID_JSON';
            throw jsonError;
        }
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortFromParent);
    }
}

// 区分 JSON 字段的真实类型，避免把 null 和数组误判为普通对象。
function getJsonFieldKind(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

// 对对象和数组使用可编辑的格式化 JSON，其他类型保持直观文本。
function formatJsonFieldValue(value) {
    const fieldKind = getJsonFieldKind(value);
    if (fieldKind === 'object' || fieldKind === 'array') {
        return JSON.stringify(value, null, 2);
    }
    if (fieldKind === 'null') return '';
    return String(value);
}

// 按模板字段类型恢复表单值，任何失败都在修改结果数组之前抛出。
function parseJsonFieldValue(rawValue, fieldKind, fieldName = '字段') {
    const textValue = String(rawValue ?? '');

    if (fieldKind === 'object' || fieldKind === 'array') {
        let parsedValue;
        try {
            parsedValue = JSON.parse(textValue);
        } catch (error) {
            throw new Error(`${fieldName} 的 JSON 格式错误：${error.message}`);
        }

        const parsedKind = getJsonFieldKind(parsedValue);
        if (parsedKind !== fieldKind) {
            const expectedKind = fieldKind === 'array' ? '数组' : '对象';
            throw new Error(`${fieldName} 必须是 JSON ${expectedKind}`);
        }
        return parsedValue;
    }

    if (fieldKind === 'number') {
        if (textValue.trim() === '') return 0;
        const numericValue = Number(textValue);
        if (!Number.isFinite(numericValue)) {
            throw new Error(`${fieldName} 必须是有效数字`);
        }
        return numericValue;
    }

    if (fieldKind === 'boolean') return textValue === 'true';
    if (fieldKind === 'null') {
        return textValue.trim() === '' || textValue.trim() === 'null' ? null : textValue;
    }
    return textValue;
}

// 返回当前位置受 SQL 引号或注释保护的结束位置；未受保护时返回原位置。
function getSqlProtectedSegmentEnd(sql, startIndex) {
    const currentCharacter = sql[startIndex];
    const nextCharacter = sql[startIndex + 1];
    const sqlLength = sql.length;

    if (currentCharacter === "'" || currentCharacter === '"' || currentCharacter === '`') {
        let index = startIndex + 1;
        while (index < sqlLength) {
            if (sql[index] === '\\' && index + 1 < sqlLength) {
                index += 2;
                continue;
            }
            if (sql[index] === currentCharacter) {
                if (sql[index + 1] === currentCharacter) {
                    index += 2;
                    continue;
                }
                return index + 1;
            }
            index++;
        }
        return sqlLength;
    }

    if (currentCharacter === '[') {
        let index = startIndex + 1;
        while (index < sqlLength) {
            if (sql[index] === ']') {
                if (sql[index + 1] === ']') {
                    index += 2;
                    continue;
                }
                return index + 1;
            }
            index++;
        }
        return sqlLength;
    }

    if ((currentCharacter === '-' && nextCharacter === '-') || currentCharacter === '#') {
        const lineEndIndex = sql.indexOf('\n', startIndex + 1);
        return lineEndIndex === -1 ? sqlLength : lineEndIndex + 1;
    }

    if (currentCharacter === '/' && nextCharacter === '*') {
        const commentEndIndex = sql.indexOf('*/', startIndex + 2);
        return commentEndIndex === -1 ? sqlLength : commentEndIndex + 2;
    }

    return startIndex;
}

// 跳过空白与注释，供 SQL 结构解析定位下一个有效字符。
function skipSqlWhitespaceAndComments(sql, startIndex) {
    let index = startIndex;
    while (index < sql.length) {
        if (/\s/.test(sql[index])) {
            index++;
            continue;
        }
        const protectedEndIndex = getSqlProtectedSegmentEnd(sql, index);
        const startsComment = (sql[index] === '-' && sql[index + 1] === '-')
            || sql[index] === '#'
            || (sql[index] === '/' && sql[index + 1] === '*');
        if (startsComment && protectedEndIndex > index) {
            index = protectedEndIndex;
            continue;
        }
        break;
    }
    return index;
}

function matchesSqlKeyword(sql, startIndex, keyword) {
    if (sql.slice(startIndex, startIndex + keyword.length).toUpperCase() !== keyword.toUpperCase()) {
        return false;
    }
    const beforeCharacter = startIndex === 0 ? '' : sql[startIndex - 1];
    const afterCharacter = sql[startIndex + keyword.length] || '';
    return !/[A-Za-z0-9_$]/.test(beforeCharacter) && !/[A-Za-z0-9_$]/.test(afterCharacter);
}

// 在 SQL 语法区域查找关键字，忽略字面量、标识符和注释中的同名文本。
function findSqlKeyword(sql, keyword, startIndex = 0) {
    let index = startIndex;
    while (index < sql.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sql, index);
        if (protectedEndIndex > index) {
            index = protectedEndIndex;
            continue;
        }
        if (matchesSqlKeyword(sql, index, keyword)) return index;
        index++;
    }
    return -1;
}

// 查找与指定左括号匹配的右括号，忽略受保护片段内的括号。
function findMatchingSqlParenthesis(sql, openIndex) {
    let depth = 0;
    let index = openIndex;
    while (index < sql.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sql, index);
        if (protectedEndIndex > index) {
            index = protectedEndIndex;
            continue;
        }
        if (sql[index] === '(') depth++;
        if (sql[index] === ')') {
            depth--;
            if (depth === 0) return index;
        }
        index++;
    }
    throw new Error('SQL 括号未闭合');
}

// 按顶层逗号拆分列或值，保留字符串和函数参数内的逗号。
function splitSqlList(sqlFragment) {
    const items = [];
    let itemStartIndex = 0;
    let depth = 0;
    let index = 0;

    while (index < sqlFragment.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sqlFragment, index);
        if (protectedEndIndex > index) {
            index = protectedEndIndex;
            continue;
        }
        if (sqlFragment[index] === '(') depth++;
        if (sqlFragment[index] === ')') depth--;
        if (sqlFragment[index] === ',' && depth === 0) {
            items.push(sqlFragment.slice(itemStartIndex, index).trim());
            itemStartIndex = index + 1;
        }
        index++;
    }

    const finalItem = sqlFragment.slice(itemStartIndex).trim();
    if (finalItem || items.length > 0) items.push(finalItem);
    return items;
}

function normalizeSqlIdentifier(identifier) {
    const identifierPart = String(identifier).trim().split('.').pop().trim();
    if ((identifierPart.startsWith('`') && identifierPart.endsWith('`'))
        || (identifierPart.startsWith('"') && identifierPart.endsWith('"'))
        || (identifierPart.startsWith('[') && identifierPart.endsWith(']'))) {
        return identifierPart.slice(1, -1);
    }
    return identifierPart;
}

function isInsertSqlStatement(statement) {
    const statementStartIndex = skipSqlWhitespaceAndComments(statement, 0);
    return matchesSqlKeyword(statement, statementStartIndex, 'INSERT');
}

// 完整扫描 SQL 文本，只在非保护区域的分号处切分语句。
function splitSqlStatements(sqlText) {
    const statements = [];
    let statementStartIndex = 0;
    let index = 0;

    while (index < sqlText.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sqlText, index);
        if (protectedEndIndex > index) {
            index = protectedEndIndex;
            continue;
        }
        if (sqlText[index] === ';') {
            const statement = sqlText.slice(statementStartIndex, index + 1).trim();
            if (statement) statements.push(statement);
            statementStartIndex = index + 1;
        }
        index++;
    }

    const trailingStatement = sqlText.slice(statementStartIndex).trim();
    if (trailingStatement) statements.push(trailingStatement);
    return statements;
}

// 独立解析一条 INSERT，返回表、列、每组 VALUES 与尾部子句。
function parseInsertStatement(statement) {
    const sourceSql = String(statement);
    const insertStartIndex = skipSqlWhitespaceAndComments(sourceSql, 0);
    if (!matchesSqlKeyword(sourceSql, insertStartIndex, 'INSERT')) {
        throw new Error('不是 INSERT 语句');
    }

    let cursorIndex = skipSqlWhitespaceAndComments(sourceSql, insertStartIndex + 'INSERT'.length);
    if (!matchesSqlKeyword(sourceSql, cursorIndex, 'INTO')) {
        throw new Error('INSERT 缺少 INTO');
    }
    cursorIndex = skipSqlWhitespaceAndComments(sourceSql, cursorIndex + 'INTO'.length);

    const tableStartIndex = cursorIndex;
    while (cursorIndex < sourceSql.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sourceSql, cursorIndex);
        if (protectedEndIndex > cursorIndex) {
            cursorIndex = protectedEndIndex;
            continue;
        }
        if (/\s/.test(sourceSql[cursorIndex]) || sourceSql[cursorIndex] === '(') break;
        cursorIndex++;
    }
    const tableToken = sourceSql.slice(tableStartIndex, cursorIndex).trim();
    if (!tableToken) throw new Error('INSERT 缺少表名');

    cursorIndex = skipSqlWhitespaceAndComments(sourceSql, cursorIndex);
    if (sourceSql[cursorIndex] !== '(') throw new Error('INSERT 缺少字段列表');
    const columnsEndIndex = findMatchingSqlParenthesis(sourceSql, cursorIndex);
    const columns = splitSqlList(sourceSql.slice(cursorIndex + 1, columnsEndIndex)).map(rawColumn => ({
        name: normalizeSqlIdentifier(rawColumn),
        raw: rawColumn
    }));
    if (columns.length === 0 || columns.some(column => !column.name)) {
        throw new Error('INSERT 字段列表为空');
    }

    const valuesKeywordIndex = findSqlKeyword(sourceSql, 'VALUES', columnsEndIndex + 1);
    if (valuesKeywordIndex === -1) throw new Error('INSERT 缺少 VALUES');

    const valueGroups = [];
    let groupStartIndex = skipSqlWhitespaceAndComments(sourceSql, valuesKeywordIndex + 'VALUES'.length);
    let tailStartIndex = groupStartIndex;

    while (sourceSql[groupStartIndex] === '(') {
        const groupEndIndex = findMatchingSqlParenthesis(sourceSql, groupStartIndex);
        valueGroups.push(splitSqlList(sourceSql.slice(groupStartIndex + 1, groupEndIndex)));
        tailStartIndex = groupEndIndex + 1;

        const separatorIndex = skipSqlWhitespaceAndComments(sourceSql, groupEndIndex + 1);
        if (sourceSql[separatorIndex] !== ',') break;
        const nextGroupIndex = skipSqlWhitespaceAndComments(sourceSql, separatorIndex + 1);
        if (sourceSql[nextGroupIndex] !== '(') {
            throw new Error('VALUES 组分隔符后缺少括号');
        }
        groupStartIndex = nextGroupIndex;
    }

    if (valueGroups.length === 0) throw new Error('VALUES 后缺少值组');

    return {
        table: normalizeSqlIdentifier(tableToken),
        tableToken,
        columns,
        valueGroups,
        tail: sourceSql.slice(tailStartIndex).trimStart(),
        leadingText: sourceSql.slice(0, insertStartIndex)
    };
}

// 根据列名而非首条语句中的索引重写单条 INSERT。
function rewriteInsertStatement(statement, columnNamesToRemove = [], targetTableName = '') {
    const parsedStatement = parseInsertStatement(statement);
    const removedColumnNames = new Set(
        Array.from(columnNamesToRemove, columnName => normalizeSqlIdentifier(columnName).toLowerCase())
    );
    const keptColumnIndexes = parsedStatement.columns
        .map((column, columnIndex) => ({ column, columnIndex }))
        .filter(({ column }) => !removedColumnNames.has(column.name.toLowerCase()))
        .map(({ columnIndex }) => columnIndex);

    if (keptColumnIndexes.length === 0) throw new Error('不能删除全部字段');

    const rewrittenGroups = parsedStatement.valueGroups.map(values => {
        if (values.length !== parsedStatement.columns.length) {
            throw new Error(`字段数 ${parsedStatement.columns.length} 与值数 ${values.length} 不一致`);
        }
        return `(${keptColumnIndexes.map(columnIndex => values[columnIndex]).join(', ')})`;
    });
    const rewrittenColumns = keptColumnIndexes.map(columnIndex => parsedStatement.columns[columnIndex].raw);
    const rewrittenTable = String(targetTableName).trim() || parsedStatement.tableToken;
    const tailSeparator = parsedStatement.tail && !parsedStatement.tail.startsWith(';') ? ' ' : '';

    return `${parsedStatement.leadingText}INSERT INTO ${rewrittenTable} (${rewrittenColumns.join(', ')}) VALUES ${rewrittenGroups.join(', ')}${tailSeparator}${parsedStatement.tail}`;
}

// 批量处理时固定标注无法解析的 INSERT，并返回真实成功、失败数量。
function rewriteInsertStatements(sqlText, columnNamesToRemove = [], targetTableName = '') {
    const statements = splitSqlStatements(String(sqlText));
    const outputStatements = [];
    let successCount = 0;
    let failureCount = 0;

    statements.forEach(statement => {
        if (!isInsertSqlStatement(statement)) {
            outputStatements.push(statement);
            return;
        }

        try {
            outputStatements.push(rewriteInsertStatement(statement, columnNamesToRemove, targetTableName));
            successCount++;
        } catch (error) {
            outputStatements.push(`${statement}\n/* toolbox: 未处理 - 无法解析 INSERT 结构 */`);
            failureCount++;
        }
    });

    return {
        sql: outputStatements.join('\n'),
        successCount,
        failureCount
    };
}

// 统计真正的 JDBC 占位符，忽略字面量、标识符和注释中的问号。
function countSqlPlaceholders(sql) {
    let placeholderCount = 0;
    let index = 0;
    while (index < sql.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sql, index);
        if (protectedEndIndex > index) {
            index = protectedEndIndex;
            continue;
        }
        if (sql[index] === '?') placeholderCount++;
        index++;
    }
    return placeholderCount;
}

function isCompleteMyBatisParameter(parameterText) {
    if (parameterText === 'null') return true;
    return /^[\s\S]*\([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\[\])*\)$/.test(parameterText);
}

// 按 MyBatis 类型格式化 SQL 字面量，包限定名只取末级类型判断。
function formatMyBatisParameter(parameterText) {
    if (parameterText === 'null') return 'null';

    const parameterMatch = parameterText.match(/^([\s\S]*)\(([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\[\])*)\)$/);
    if (!parameterMatch) throw new Error(`无法解析参数：${parameterText}`);

    const parameterValue = parameterMatch[1];
    const parameterType = parameterMatch[2];
    if (parameterValue === 'null') return 'null';

    const simpleType = parameterType.split('.').pop().replace(/\[\]$/, '');
    const integerTypes = new Set(['Integer', 'Long', 'Short', 'Byte', 'BigInteger']);
    const decimalTypes = new Set(['Double', 'Float', 'BigDecimal', 'Number']);
    if (integerTypes.has(simpleType)) {
        if (!/^[+-]?(?:0|[1-9]\d*)$/.test(parameterValue)) {
            throw new Error(`${simpleType} 参数不是有效十进制整数：${parameterValue}`);
        }
        return parameterValue;
    }
    if (decimalTypes.has(simpleType)) {
        if (!/^[+-]?(?:(?:0|[1-9]\d*)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(parameterValue)) {
            throw new Error(`${simpleType} 参数不是有效有限数值：${parameterValue}`);
        }
        const numericValue = Number(parameterValue);
        if (!Number.isFinite(numericValue)) {
            throw new Error(`${simpleType} 参数超出有限数值范围：${parameterValue}`);
        }
        return parameterValue;
    }
    if (simpleType === 'Boolean' && /^(?:true|false)$/i.test(parameterValue)) {
        return parameterValue.toLowerCase();
    }

    return `'${parameterValue.replace(/'/g, "''")}'`;
}

// 仅在逗号前已形成完整“值(类型)”时切分，允许值本身含逗号和括号。
function parseMyBatisParameters(parametersText) {
    const normalizedText = String(parametersText).trim();
    if (!normalizedText) return [];

    const parameters = [];
    let parameterStartIndex = 0;
    for (let index = 0; index <= normalizedText.length; index++) {
        const reachedEnd = index === normalizedText.length;
        if (!reachedEnd && normalizedText[index] !== ',') continue;

        const candidate = normalizedText.slice(parameterStartIndex, index).trim();
        if (!isCompleteMyBatisParameter(candidate)) continue;

        parameters.push(formatMyBatisParameter(candidate));
        parameterStartIndex = index + 1;
    }

    const unparsedText = normalizedText.slice(parameterStartIndex).trim();
    if (unparsedText) throw new Error(`无法解析参数：${unparsedText}`);
    return parameters;
}

// 在替换前强制校验数量，避免输出仍含真实占位符却提示成功。
function replaceSqlPlaceholders(sql, parameters) {
    const placeholderCount = countSqlPlaceholders(sql);
    if (placeholderCount !== parameters.length) {
        throw new Error(`SQL 占位符数量 ${placeholderCount} 与参数数量 ${parameters.length} 不一致`);
    }

    let outputSql = '';
    let parameterIndex = 0;
    let index = 0;
    while (index < sql.length) {
        const protectedEndIndex = getSqlProtectedSegmentEnd(sql, index);
        if (protectedEndIndex > index) {
            outputSql += sql.slice(index, protectedEndIndex);
            index = protectedEndIndex;
            continue;
        }
        if (sql[index] === '?') {
            outputSql += parameters[parameterIndex];
            parameterIndex++;
        } else {
            outputSql += sql[index];
        }
        index++;
    }
    return outputSql;
}

function ensureSqlSemicolon(sql) {
    return sql.trim().endsWith(';') ? sql.trim() : `${sql.trim()};`;
}

// 成对解析 Preparing 与 Parameters，任一数量错误都会终止整次转换。
function parseMyBatisLog(logText) {
    const preparingPattern = /==>\s+Preparing:\s+(.+)/;
    const parametersPattern = /==>\s+Parameters:\s*(.*)/;
    const outputStatements = [];
    let pendingSql = null;

    String(logText).split(/\r?\n/).forEach(line => {
        const preparingMatch = line.match(preparingPattern);
        if (preparingMatch) {
            if (pendingSql !== null) {
                const pendingPlaceholderCount = countSqlPlaceholders(pendingSql);
                if (pendingPlaceholderCount > 0) {
                    throw new Error(`SQL 缺少 Parameters，仍有 ${pendingPlaceholderCount} 个占位符`);
                }
                outputStatements.push(ensureSqlSemicolon(pendingSql));
            }
            pendingSql = preparingMatch[1].trim();
            return;
        }

        const parametersMatch = line.match(parametersPattern);
        if (!parametersMatch || pendingSql === null) return;

        const parameters = parseMyBatisParameters(parametersMatch[1]);
        outputStatements.push(ensureSqlSemicolon(replaceSqlPlaceholders(pendingSql, parameters)));
        pendingSql = null;
    });

    if (pendingSql !== null) {
        const pendingPlaceholderCount = countSqlPlaceholders(pendingSql);
        if (pendingPlaceholderCount > 0) {
            throw new Error(`SQL 缺少 Parameters，仍有 ${pendingPlaceholderCount} 个占位符`);
        }
        outputStatements.push(ensureSqlSemicolon(pendingSql));
    }

    return outputStatements.join('\n\n');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QR_DEFAULT_SIZE,
        QR_MAX_CHUNKS,
        QR_MAX_DECODE_PIXELS,
        QR_MAX_DECODE_SIDE,
        QR_MAX_INPUT_BYTES,
        QR_MAX_UPLOAD_BYTES,
        createQrGroupId,
        countSqlPlaceholders,
        fetchJsonWithTimeout,
        formatJsonFieldValue,
        formatShanghaiDateTime,
        getJsonFieldKind,
        getQrByteLength,
        getQrDecodeDimensions,
        parseInsertStatement,
        parseJsonFieldValue,
        parseMyBatisLog,
        parseMyBatisParameters,
        parseQrSize,
        parseShanghaiDateTimeLocal,
        prepareQrPayloads,
        replaceSqlPlaceholders,
        rewriteInsertStatement,
        rewriteInsertStatements,
        selectQrOutputNode,
        splitSqlStatements,
        splitTextByByteLength,
        validateQrUploadSize
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // 状态变量
    let currentInput = '';
    
    // DOM 元素获取
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.tool-page');
    
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
    // 导航逻辑（含上次页面记忆）
    // ---------------------------------------------------------
    const LS_LAST_PAGE = 'toolbox_last_page';

    const activateNavigationItem = (item) => {
        navItems.forEach(nav => {
            nav.classList.remove('active');
            nav.removeAttribute('aria-current');
        });
        pages.forEach(page => page.classList.remove('active'));

        item.classList.add('active');
        item.setAttribute('aria-current', 'page');

        const targetId = item.getAttribute('data-target');
        const targetPage = document.getElementById(`page-${targetId}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        try {
            localStorage.setItem(LS_LAST_PAGE, targetId);
        } catch (error) {
            console.warn('无法保存上次访问页面:', error);
        }
    };

    navItems.forEach(item => {
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        if (item.classList.contains('active')) {
            item.setAttribute('aria-current', 'page');
        }

        item.addEventListener('click', () => activateNavigationItem(item));
        item.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            event.preventDefault();
            activateNavigationItem(item);
        });
    });

    // 启动时恢复上次页面（延后到 offline-detect 之后，避免恢复了一个被禁用的页）
    setTimeout(() => {
        try {
            const last = localStorage.getItem(LS_LAST_PAGE);
            if (!last || last === 'json') return;
            const item = document.querySelector(`.nav-item[data-target="${last}"]`);
            if (!item) return;
            if (item.style.display === 'none') return; // 离线被隐藏的不恢复
            item.click();
        } catch (error) {
            console.warn('无法恢复上次访问页面:', error);
        }
    }, 500);

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
    
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const barcodeImg = document.getElementById('barcode-img');

    let lastGeneratedCodeType = null;

    // 按容错等级从高到低尝试，长文本优先保证可以生成二维码
    const getQrCorrectLevelOptions = () => ([
        { label: '高容错', value: QRCode.CorrectLevel.H },
        { label: '较高容错', value: QRCode.CorrectLevel.Q },
        { label: '中等容错', value: QRCode.CorrectLevel.M },
        { label: '低容错', value: QRCode.CorrectLevel.L }
    ]);

    // 使用自动版本号和指定容错等级生成二维码，分片阶段复用预检结果。
    const createQrCodeAtCorrectLevel = (targetElement, content, size, colorDark, colorLight, correctLevelOption) => {
        targetElement.innerHTML = '';
        new QRCode(targetElement, {
            text: content,
            width: size,
            height: size,
            colorDark: colorDark,
            colorLight: colorLight,
            typeNumber: 0,
            correctLevel: correctLevelOption.value
        });
        return correctLevelOption;
    };

    // 按容错等级逐级预检，普通二维码只保留成功结果。
    const createAutoVersionQrCode = (targetElement, content, size, colorDark, colorLight) => {
        let lastError = null;

        for (const correctLevelOption of getQrCorrectLevelOptions()) {
            try {
                return createQrCodeAtCorrectLevel(
                    targetElement,
                    content,
                    size,
                    colorDark,
                    colorLight,
                    correctLevelOption
                );
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('内容过长，无法生成二维码');
    };

    // 超长内容自动分片生成多个二维码，二维码本身最大容量无法继续扩大。
    const createSplitQrCodes = (content, size, colorDark, colorLight) => {
        let chunkByteLength = 1200;
        let lastError = null;

        while (chunkByteLength >= 100) {
            const prepared = prepareQrPayloads(content, chunkByteLength);
            const longestPayload = prepared.payloads.reduce((longest, payload) =>
                getQrByteLength(payload) > getQrByteLength(longest) ? payload : longest, prepared.payloads[0]);
            const testContainer = document.createElement('div');

            try {
                const correctLevelOption = createAutoVersionQrCode(testContainer, longestPayload, size, colorDark, colorLight);
                qrcodeContainer.replaceChildren();

                prepared.payloads.forEach((payload, index) => {
                    const item = document.createElement('div');
                    item.className = 'qr-chunk-item';
                    const qrBox = document.createElement('div');
                    qrBox.className = 'qr-code-box';
                    const label = document.createElement('div');

                    label.textContent = `第 ${index + 1} / ${prepared.chunks.length} 张 · 组 ${prepared.groupId}`;
                    label.style.color = 'var(--text-secondary)';
                    label.style.fontSize = '0.8rem';

                    createQrCodeAtCorrectLevel(
                        qrBox,
                        payload,
                        size,
                        colorDark,
                        colorLight,
                        correctLevelOption
                    );
                    item.appendChild(qrBox);
                    item.appendChild(label);
                    qrcodeContainer.appendChild(item);
                });

                qrcodeContainer.classList.add('qr-chunk-grid');
                qrcodeContainer.style.display = 'grid';

                return { ...prepared, correctLevelOption };
            } catch (error) {
                lastError = error;
                chunkByteLength = Math.floor(chunkByteLength * 0.8);
            }
        }

        throw lastError || new Error('内容过长，无法分片生成二维码');
    };

    if (btnQrGenerate) {
        btnQrGenerate.addEventListener('click', () => {
            const content = qrInput.value; // 不 trim，允许空格
            if (!content) {
                showToast('请输入内容', 'warning');
                return;
            }

            const type = qrType.value;
            let size;
            try {
                size = parseQrSize(qrSize.value);
            } catch (error) {
                showToast(error.message, 'error');
                return;
            }
            const colorDark = qrColorDark.value;
            const colorLight = qrColorLight.value;

            // 重置显示
            qrPlaceholder.style.display = 'none';
            qrcodeContainer.innerHTML = '';
            qrcodeContainer.classList.remove('qr-chunk-grid');
            qrcodeContainer.style.display = 'none';
            barcodeImg.style.display = 'none';
            lastGeneratedCodeType = null;

            if (type === 'qrcode') {
                if (typeof QRCode === 'undefined') {
                    showToast('QRCode 库未加载，请检查 lib/qrcode.min.js', 'error');
                    return;
                }
                const inputBytes = getQrByteLength(content);
                if (inputBytes > QR_MAX_INPUT_BYTES) {
                    qrPlaceholder.style.display = 'block';
                    showToast(`输入 ${inputBytes} 字节，超过上限 ${QR_MAX_INPUT_BYTES} 字节`, 'error');
                    return;
                }
                qrcodeContainer.style.display = 'block';
                try {
                    qrcodeContainer.style.display = 'block';
                    qrcodeContainer.style.flexWrap = '';
                    qrcodeContainer.style.justifyContent = '';
                    qrcodeContainer.style.gap = '';
                    const correctLevelOption = createAutoVersionQrCode(qrcodeContainer, content, size, colorDark, colorLight);
                    lastGeneratedCodeType = 'qrcode';
                    showToast(`二维码生成成功（${correctLevelOption.label}）`, 'success');
                } catch (e) {
                    try {
                        const splitResult = createSplitQrCodes(content, size, colorDark, colorLight);
                        lastGeneratedCodeType = 'qrcode';
                        showToast(`内容已自动拆成 ${splitResult.chunks.length} 个二维码`, 'warning');
                    } catch (splitError) {
                        qrcodeContainer.innerHTML = '';
                        qrcodeContainer.style.display = 'none';
                        qrPlaceholder.style.display = 'block';
                        lastGeneratedCodeType = null;
                        showToast('生成失败: ' + splitError.message, 'error');
                    }
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
                    lastGeneratedCodeType = 'barcode';
                    showToast('条形码生成成功', 'success');
                } catch (e) {
                    barcodeImg.src = '';
                    lastGeneratedCodeType = null;
                    showToast('生成失败: 内容可能不符合条形码规范', 'error');
                }
            }
        });
    }

    if (btnQrDownload) {
        btnQrDownload.addEventListener('click', () => {
            const imgUrls = [];
            
            if (lastGeneratedCodeType === 'qrcode') {
                const qrBoxes = qrcodeContainer.querySelectorAll('.qr-code-box');
                const outputContainers = qrBoxes.length ? Array.from(qrBoxes) : [qrcodeContainer];
                outputContainers.forEach(container => {
                    const outputNode = selectQrOutputNode(container);
                    if (!outputNode) return;
                    if (outputNode.tagName === 'CANVAS') imgUrls.push(outputNode.toDataURL('image/png'));
                    else if (outputNode.src) imgUrls.push(outputNode.src);
                });
            } else if (lastGeneratedCodeType === 'barcode') {
                // JsBarcode 生成的是 img，我们用的是 img 标签
                if (barcodeImg.src) {
                    imgUrls.push(barcodeImg.src);
                }
            }

            if (imgUrls.length) {
                imgUrls.forEach((imgUrl, index) => {
                    const link = document.createElement('a');
                    link.download = imgUrls.length > 1 ? `code_${Date.now()}_${index + 1}.png` : `code_${Date.now()}.png`;
                    link.href = imgUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
                showToast(imgUrls.length > 1 ? `已开始下载 ${imgUrls.length} 张图片` : '下载已开始', 'success');
            } else {
                showToast('请先生成图片', 'warning');
            }
        });
    }

    if (btnQrClear) {
        btnQrClear.addEventListener('click', () => {
            qrInput.value = '';
            qrcodeContainer.innerHTML = '';
            qrcodeContainer.classList.remove('qr-chunk-grid');
            qrcodeContainer.style.display = 'none';
            barcodeImg.style.display = 'none';
            barcodeImg.src = '';
            lastGeneratedCodeType = null;
            qrPlaceholder.style.display = 'block';
            // 清空解析结果
            const qrDecodeResult = document.getElementById('qr-decode-result');
            const qrDecodeText = document.getElementById('qr-decode-text');
            if (qrDecodeResult) qrDecodeResult.style.display = 'none';
            if (qrDecodeText) qrDecodeText.textContent = '';
            if (qrDecodeInput) qrDecodeInput.value = '';
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

            // 重置 input 允许重复选择同一个文件。
            qrDecodeInput.value = '';

            if (typeof jsQR === 'undefined') {
                showToast('二维码解析库未加载，请下载完整的 jsQR.js 库', 'error');
                console.error('请从 https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js 下载完整库');
                return;
            }

            try {
                // 文件大小必须在读取前校验，避免无效的大文件进入解码流程。
                validateQrUploadSize(file.size);
            } catch (error) {
                showToast(error.message, 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = event => {
                const image = new Image();
                image.onload = () => {
                    try {
                        const sourceWidth = image.naturalWidth || image.width;
                        const sourceHeight = image.naturalHeight || image.height;
                        const decodeDimensions = getQrDecodeDimensions(sourceWidth, sourceHeight);

                        // 只分配缩放后的安全 Canvas，禁止先按原图尺寸分配再缩小。
                        const canvas = document.createElement('canvas');
                        canvas.width = decodeDimensions.width;
                        canvas.height = decodeDimensions.height;
                        const context = canvas.getContext('2d', { willReadFrequently: true });
                        context.drawImage(image, 0, 0, decodeDimensions.width, decodeDimensions.height);

                        const imageData = context.getImageData(0, 0, decodeDimensions.width, decodeDimensions.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: 'attemptBoth'
                        });

                        if (code?.data) {
                            // qrcode.js 为非 ASCII 内容保留 UTF-8 BOM，展示时去掉前导标记。
                            const decodedData = code.data.replace(/^\uFEFF/, '');
                            qrDecodeText.textContent = decodedData;
                            qrDecodeResult.style.display = 'block';
                            qrInput.value = decodedData;
                            showToast('二维码解析成功', 'success');
                        } else {
                            showToast('未能识别二维码，请确保图片清晰且包含二维码', 'warning');
                        }
                    } catch (error) {
                        console.error('解析错误:', error);
                        showToast('解析失败: ' + error.message, 'error');
                    }
                };
                image.onerror = () => {
                    showToast('图片加载失败', 'error');
                };
                image.src = event.target.result;
            };
            reader.onerror = () => {
                showToast('文件读取失败', 'error');
            };
            reader.readAsDataURL(file);
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

            const firstInsertStatement = splitSqlStatements(content).find(isInsertSqlStatement);
            if (!firstInsertStatement) {
                showToast('未找到有效的 INSERT INTO 语句', 'warning');
                return;
            }

            try {
                const parsedStatement = parseInsertStatement(firstInsertStatement);
                parsedTableName = parsedStatement.tableToken;
                parsedColumns = parsedStatement.columns.map(column => column.raw);

                if (currentTableNameSpan) currentTableNameSpan.textContent = parsedTableName;
                renderColumnSelector();
                columnSelector.style.display = 'block';
                showToast('列名识别成功，请勾选要删除的字段', 'success');
            } catch (error) {
                showToast('无法识别 SQL 结构：' + error.message, 'error');
            }
        });
    }

    function renderColumnSelector() {
        columnList.innerHTML = '';
        parsedColumns.forEach((col, index) => {
            // col 可能带 `col` / [col] / "col" 三种引号,显示时去掉,但 parsedColumns 原值保留
            const cleanName = col.replace(/^[`"\[]+|[`"\]]+$/g, '');
            
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

            // 把首条语句中的选择转换为列名，后续每条 SQL 按自己的列序匹配。
            const checkboxes = columnList.querySelectorAll('input[type="checkbox"]');
            const columnNamesToRemove = [];
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) columnNamesToRemove.push(parsedColumns[Number(checkbox.value)]);
            });

            let targetTableName = '';
            if (enableRenameTable && enableRenameTable.checked) {
                const newName = newTableNameInput.value.trim();
                if (newName) targetTableName = newName;
            }

            const content = cleanerInput.value.trim();
            const result = rewriteInsertStatements(content, columnNamesToRemove, targetTableName);

            cleanerPlaceholder.style.display = 'none';
            cleanerOutput.style.display = 'block';
            cleanerOutput.textContent = result.sql;

            const summary = `处理完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`;
            showToast(summary, result.failureCount > 0 ? 'warning' : 'success');
        });
    }

    function processInsertSql(sql, indicesToRemove, targetTableName) {
        // 1. 用方言无关的扫描器找 VALUES 关键字（跳过字符串/标识符内的同名片段）
        const valuesIndex = findKeywordOutsideQuotes(sql, 'VALUES');
        if (valuesIndex === -1) return sql;

        const valuesPart = sql.substring(valuesIndex + 6).trim();

        // 2. 处理新的列名列表
        const newColumns = parsedColumns.filter((_, index) => !indicesToRemove.has(index));
        const newHeader = `INSERT INTO ${targetTableName} (${newColumns.join(', ')}) VALUES`;

        // 3. 末尾分号摘除
        let cleanValuesPart = valuesPart;
        let hasSemicolon = false;
        if (cleanValuesPart.endsWith(';')) {
            hasSemicolon = true;
            cleanValuesPart = cleanValuesPart.slice(0, -1).trim();
        }

        // 4. 支持单组或多组 VALUES：(a,b), (c,d), (e,f)
        //    用括号深度扫描分割顶级括号块，避免 (1, '(test)') 误切
        const groups = extractTopLevelGroups(cleanValuesPart);
        if (groups.length === 0) {
            throw new Error('未识别到 VALUES 后的括号');
        }

        // 5. 每组分别过滤列
        const newGroups = groups.map(group => {
            const values = splitSqlValues(group);
            if (values.length !== parsedColumns.length) {
                throw new Error(`列数(${parsedColumns.length})与值数(${values.length})不匹配`);
            }
            const filtered = values.filter((_, i) => !indicesToRemove.has(i));
            return `(${filtered.join(', ')})`;
        });

        return `${newHeader} ${newGroups.join(', ')}${hasSemicolon ? ';' : ''}`;
    }

    /**
     * 在 SQL 字符串里查找一个关键字（大小写无关），跳过字符串字面量和标识符引号
     * 兼容三种方言的引号: ' "  ` 以及 SQL Server / 达梦 的 [identifier]
     * 字符串内 '' 转义按 SQL 标准识别
     */
    function findKeywordOutsideQuotes(sql, keyword) {
        const upper = keyword.toUpperCase();
        const len = sql.length;
        let i = 0;
        while (i < len) {
            const c = sql[i];
            if (c === "'") {
                i++;
                while (i < len) {
                    if (sql[i] === "'") {
                        if (sql[i + 1] === "'") { i += 2; continue; }
                        i++; break;
                    }
                    i++;
                }
                continue;
            }
            if (c === '"') {
                i++;
                while (i < len && sql[i] !== '"') i++;
                if (i < len) i++;
                continue;
            }
            if (c === '`') {
                i++;
                while (i < len && sql[i] !== '`') i++;
                if (i < len) i++;
                continue;
            }
            if (c === '[') {
                i++;
                while (i < len && sql[i] !== ']') i++;
                if (i < len) i++;
                continue;
            }
            if (sql.substr(i, keyword.length).toUpperCase() === upper) {
                const before = i === 0 ? ' ' : sql[i - 1];
                const after = sql[i + keyword.length] || ' ';
                if (!/\w/.test(before) && !/\w/.test(after)) return i;
            }
            i++;
        }
        return -1;
    }

    /**
     * 按括号深度从 "(...), (...), (...)" 字符串里提取顶级 () 内容
     * 处理字符串字面量内的括号、嵌套括号
     */
    function extractTopLevelGroups(str) {
        const groups = [];
        const len = str.length;
        let i = 0;
        while (i < len) {
            if (str[i] === '(') {
                let depth = 1;
                let j = i + 1;
                while (j < len && depth > 0) {
                    const cj = str[j];
                    if (cj === "'") {
                        j++;
                        while (j < len) {
                            if (str[j] === "'") {
                                if (str[j + 1] === "'") { j += 2; continue; }
                                j++; break;
                            }
                            j++;
                        }
                        continue;
                    }
                    if (cj === '(') depth++;
                    else if (cj === ')') depth--;
                    if (depth === 0) break;
                    j++;
                }
                if (depth !== 0) throw new Error('括号不匹配');
                groups.push(str.substring(i + 1, j));
                i = j + 1;
            } else {
                i++;
            }
        }
        return groups;
    }

    /**
     * 智能分割 SQL VALUES 内容:按顶层逗号切，兼容 SQL Server / 达梦 / MySQL
     *  - SQL 标准 '' 转义("it''s ok")
     *  - 反斜杠 \' 转义(MySQL 模式)
     *  - 嵌套括号(函数 / 子查询)
     *  - 方括号 / 双引号 / 反引号标识符
     */
    function splitSqlValues(str) {
        const result = [];
        let current = '';
        const len = str.length;
        let i = 0;
        let depth = 0;
        while (i < len) {
            const ch = str[i];

            if (ch === "'") {
                current += ch;
                i++;
                while (i < len) {
                    const c2 = str[i];
                    if (c2 === '\\' && i + 1 < len) {
                        current += c2 + str[i + 1];
                        i += 2;
                        continue;
                    }
                    if (c2 === "'") {
                        if (str[i + 1] === "'") {
                            current += "''";
                            i += 2;
                            continue;
                        }
                        current += "'";
                        i++;
                        break;
                    }
                    current += c2;
                    i++;
                }
                continue;
            }

            if (ch === '"' || ch === '`') {
                const close = ch;
                current += ch;
                i++;
                while (i < len && str[i] !== close) { current += str[i]; i++; }
                if (i < len) { current += str[i]; i++; }
                continue;
            }
            if (ch === '[') {
                current += ch;
                i++;
                while (i < len && str[i] !== ']') { current += str[i]; i++; }
                if (i < len) { current += str[i]; i++; }
                continue;
            }

            if (ch === '(') { depth++; current += ch; i++; continue; }
            if (ch === ')') { depth--; current += ch; i++; continue; }

            if (ch === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
                i++;
                continue;
            }

            current += ch;
            i++;
        }
        if (current.trim() !== '' || result.length > 0) {
            result.push(current.trim());
        }
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

            try {
                // 先完整解析临时对象，全部字段成功后才修改原数组。
                const newItem = collectFormData();
                collectedJsonItems.push(newItem);
                updateOutput(JSON.stringify(collectedJsonItems, null, 4), true);
                clearJsonFieldsForm();
                showToast(`已添加第 ${collectedJsonItems.length} 个对象`, 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    /**
     * 渲染JSON字段表单
     */
    function renderJsonFieldsForm(obj) {
        jsonFieldsContainer.innerHTML = '';
        
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fieldKind = getJsonFieldKind(value);
            
            // 创建字段容器
            const fieldDiv = document.createElement('div');
            fieldDiv.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
            
            // 字段标签
            const label = document.createElement('label');
            label.textContent = key;
            label.style.cssText = 'color: var(--text-primary); font-size: 13px; font-weight: bold;';
            
            // 输入框
            let input;
            if (fieldKind === 'boolean') {
                // 布尔类型使用下拉框
                input = document.createElement('select');
                input.innerHTML = '<option value="true">true</option><option value="false">false</option>';
            } else if (fieldKind === 'number') {
                // 数字类型
                input = document.createElement('input');
                input.type = 'number';
                input.step = 'any';
            } else if (fieldKind === 'object' || fieldKind === 'array') {
                // 嵌套对象和数组使用多行 JSON 编辑框。
                input = document.createElement('textarea');
                input.rows = 5;
            } else {
                input = document.createElement('input');
                input.type = 'text';
                if (fieldKind === 'null') input.placeholder = 'null 或输入值';
            }

            input.value = formatJsonFieldValue(value);
            input.dataset.fieldName = key;
            input.dataset.fieldKind = fieldKind;
            input.style.cssText = `
                width: 100%;
                padding: 0.5rem;
                background: var(--bg-dark);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 0.25rem;
                outline: none;
                font-size: 0.8125rem;
                box-sizing: border-box;
                resize: vertical;
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
        const inputs = jsonFieldsContainer.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            const fieldName = input.dataset.fieldName;
            result[fieldName] = parseJsonFieldValue(input.value, input.dataset.fieldKind, fieldName);
        });
        
        return result;
    }

    /**
     * 清空表单
     */
    function clearJsonFieldsForm() {
        const inputs = jsonFieldsContainer.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const fieldKind = input.dataset.fieldKind;
            if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else if (fieldKind === 'number') {
                input.value = '0';
            } else if (fieldKind === 'object') {
                input.value = '{}';
            } else if (fieldKind === 'array') {
                input.value = '[]';
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
                sqlOutput.textContent = '';
                sqlOutput.style.display = 'none';
                sqlPlaceholder.style.display = 'flex';
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

    function parseMyBatisLogLegacy(logText) {
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
                        // 用扫描器替换 ? 占位符:跳过字符串字面量内的 ?,
                        // 且参数本身含 ? 时不会被后续替换误伤
                        let finalSql = replacePlaceholdersOutsideQuotes(currentSql, params);
                        
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
        // 数值/布尔不加引号(三种数据库通用)
        const numericTypes = ['Integer', 'Long', 'Double', 'Float', 'Short', 'Byte', 'Boolean', 'BigDecimal', 'BigInteger', 'Number'];

        if (numericTypes.includes(type)) {
            return value;
        }
        // 字符串/时间/UUID 等加引号,SQL 标准 '' 转义,SQL Server / 达梦 / MySQL 都识别
        const escaped = String(value).replace(/'/g, "''");
        return `'${escaped}'`;
    }

    /**
     * 把 SQL 里的 ? 占位符依次换成实际参数,跳过字符串字面量内的 ?
     * 防止参数值里的 ? 被后续 replace 误当占位符
     */
    function replacePlaceholdersOutsideQuotes(sql, params) {
        let out = '';
        let pi = 0;
        const len = sql.length;
        let i = 0;
        while (i < len) {
            const c = sql[i];
            if (c === "'") {
                out += c; i++;
                while (i < len) {
                    if (sql[i] === '\\' && i + 1 < len) { out += sql[i] + sql[i + 1]; i += 2; continue; }
                    if (sql[i] === "'") {
                        if (sql[i + 1] === "'") { out += "''"; i += 2; continue; }
                        out += "'"; i++; break;
                    }
                    out += sql[i]; i++;
                }
                continue;
            }
            if (c === '"' || c === '`') {
                const close = c;
                out += c; i++;
                while (i < len && sql[i] !== close) { out += sql[i]; i++; }
                if (i < len) { out += sql[i]; i++; }
                continue;
            }
            if (c === '[') {
                out += c; i++;
                while (i < len && sql[i] !== ']') { out += sql[i]; i++; }
                if (i < len) { out += sql[i]; i++; }
                continue;
            }
            if (c === '?') {
                if (pi < params.length) {
                    out += params[pi];
                    pi++;
                } else {
                    out += '?';   // 参数不够时保留占位
                }
                i++;
                continue;
            }
            out += c;
            i++;
        }
        return out;
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
    
    const currentTimeDisplay = document.getElementById('timestamp-current-time');
    const currentTimestampDisplay = document.getElementById('current-timestamp');
    
    const tsResultContainer = document.getElementById('ts-result-container');
    const timeResultContainer = document.getElementById('time-result-container');
    const tsPlaceholder = document.getElementById('ts-placeholder');

    // 更新当前时间显示
    function updateCurrentTime() {
        const now = new Date();
        const beijingTime = formatShanghaiDateTime(now).formatted;
        const timestamp = Math.floor(now.getTime() / 1000);
        
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = beijingTime;
        }
        if (currentTimestampDisplay) {
            currentTimestampDisplay.textContent = timestamp;
        }
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
            const shanghaiParts = formatShanghaiDateTime(date);
            document.getElementById('ts-result-beijing').textContent = shanghaiParts.formatted;
            document.getElementById('ts-result-formatted').textContent = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            document.getElementById('ts-year').textContent = shanghaiParts.year;
            document.getElementById('ts-month').textContent = Number(shanghaiParts.month) + '月';
            document.getElementById('ts-day').textContent = Number(shanghaiParts.day) + '日';
            document.getElementById('ts-weekday').textContent = shanghaiParts.weekday;
            document.getElementById('ts-time').textContent = `${shanghaiParts.hour}:${shanghaiParts.minute}:${shanghaiParts.second}`;
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

            let date;
            try {
                date = parseShanghaiDateTimeLocal(input);
            } catch (error) {
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
async function copyToClipboard(text) {
    const normalizedText = String(text ?? '');

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(normalizedText);
            showToast('已复制到剪贴板', 'success');
            return true;
        } catch (error) {
            console.warn('Clipboard API 复制失败，尝试兼容方案:', error);
        }
    }

    return fallbackCopy(normalizedText);
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error('浏览器拒绝兼容复制命令');
        }
        showToast('已复制到剪贴板', 'success');
        return true;
    } catch (error) {
        console.error('兼容复制失败:', error);
        showToast('复制失败', 'error');
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
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
    const supportedTypes = new Set(['success', 'error', 'warning', 'info']);
    const normalizedType = supportedTypes.has(type) ? type : 'info';
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${normalizedType}`;
    toast.setAttribute('role', normalizedType === 'error' ? 'alert' : 'status');

    const icon = document.createElement('span');
    icon.style.marginRight = '0.5rem';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = icons[normalizedType];

    const messageText = document.createElement('span');
    messageText.textContent = String(message ?? '');

    toast.append(icon, messageText);
    container.appendChild(toast);

    const removeToast = () => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
        if (container.children.length === 0 && container.parentElement) {
            container.parentElement.removeChild(container);
        }
    };

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        toast.addEventListener('animationend', removeToast, { once: true });

        // 某些环境不会派发动画结束事件，使用兜底计时保证节点释放。
        setTimeout(removeToast, 500);
    }, 3000);
}

// 全局错误捕获
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global Error:', message, error);
    showToast('发生未知错误: ' + String(message), 'error');
    return false;
};
