(function initializeToolboxAiCore(globalObject, factory) {
    const coreApi = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = coreApi;
    }

    if (globalObject) {
        globalObject.ToolboxAiCore = coreApi;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createToolboxAiCore() {
    const AI_SCHEMA_VERSION = 1;
    const AI_BACKUP_MAX_BYTES = 20 * 1024 * 1024;
    const AI_LOCAL_FILE_MAX_BYTES = 512 * 1024;
    const AI_LOCAL_FILES_TOTAL_MAX_BYTES = 1024 * 1024;
    const AI_SKILL_MAX_BYTES = 256 * 1024;
    const AI_ENABLED_SKILLS_TOTAL_MAX_BYTES = 512 * 1024;
    const AI_IMAGE_MAX_TOTAL_PIXELS = 25000000;
    const utf8Encoder = new TextEncoder();
    const validTokenParameterModes = new Set(['max_tokens', 'max_completion_tokens', 'none']);
    const validMessageRoles = new Set(['user', 'assistant']);
    const strictImageDataUrlPattern = /^data:image\/(?:png|jpeg|webp);base64,(?=.{4,}$)(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    const validBase64PayloadPattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    const runtimePropertyNames = new Set([
        'approvalDialog',
        'compressing',
        'controller',
        'loading',
        'payloadSnapshot',
        'pendingFiles',
        'titleGenerating',
        '_compressing'
    ]);

    function hasOwn(value, propertyName) {
        return Object.prototype.hasOwnProperty.call(value, propertyName);
    }

    function createStableId(prefix = 'id') {
        const normalizedPrefix = String(prefix || 'id').replace(/[^A-Za-z0-9_-]/g, '') || 'id';
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `${normalizedPrefix}_${crypto.randomUUID()}`;
        }

        const randomPart = Math.random().toString(36).slice(2, 12);
        return `${normalizedPrefix}_${Date.now().toString(36)}_${randomPart}`;
    }

    function validateSkillContent(content) {
        const byteLength = utf8Encoder.encode(String(content || '')).length;
        if (byteLength > AI_SKILL_MAX_BYTES) {
            throw new Error('单个 Skill 内容不能超过 256 KiB');
        }
        return byteLength;
    }

    function getEnabledSkillsByteLength(skills) {
        return (Array.isArray(skills) ? skills : [])
            .filter(skill => skill?.enabled)
            .reduce((total, skill) => total + utf8Encoder.encode(String(skill.content || '')).length, 0);
    }

    function validateImageDimensions(width, height, currentTotalPixels = 0, options = {}) {
        const normalizedOptions = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
        const maxTotalPixels = normalizedOptions.maxTotalPixels ?? AI_IMAGE_MAX_TOTAL_PIXELS;
        if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
            throw new Error('图片尺寸无效');
        }
        if (!Number.isSafeInteger(currentTotalPixels) || currentTotalPixels < 0) {
            throw new Error('图片累计像素无效');
        }
        if (!Number.isSafeInteger(maxTotalPixels) || maxTotalPixels <= 0) {
            throw new Error('图片像素上限无效');
        }

        const imagePixels = width * height;
        const totalPixels = currentTotalPixels + imagePixels;
        if (!Number.isSafeInteger(imagePixels) || !Number.isSafeInteger(totalPixels) || totalPixels > maxTotalPixels) {
            throw new Error(`图片累计总像素不能超过 ${maxTotalPixels}`);
        }

        return { imagePixels, totalPixels, maxTotalPixels };
    }

    function cloneValue(value) {
        if (Array.isArray(value)) {
            return value.map(cloneValue);
        }
        if (value && typeof value === 'object') {
            const clone = {};
            Object.entries(value).forEach(([key, childValue]) => {
                if (typeof childValue !== 'function') {
                    clone[key] = cloneValue(childValue);
                }
            });
            return clone;
        }
        return value;
    }

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
            return value;
        }

        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    function sanitizePersistentValue(value) {
        if (Array.isArray(value)) {
            return value
                .map(sanitizePersistentValue)
                .filter(childValue => childValue !== undefined);
        }
        if (value && typeof value === 'object') {
            const sanitized = {};
            Object.entries(value).forEach(([key, childValue]) => {
                if (runtimePropertyNames.has(key) || typeof childValue === 'function') {
                    return;
                }

                const sanitizedChild = sanitizePersistentValue(childValue);
                if (sanitizedChild !== undefined) {
                    sanitized[key] = sanitizedChild;
                }
            });
            return sanitized;
        }
        return value === undefined ? undefined : value;
    }

    function createDefaultProfile(input = {}) {
        const maxTokens = Number(input.maxTokens) > 0 ? Number(input.maxTokens) : 32768;
        const tokenParameterMode = validTokenParameterModes.has(input.tokenParameterMode)
            ? input.tokenParameterMode
            : 'max_tokens';

        return {
            id: input.id || createStableId('p'),
            name: input.name || '默认',
            baseUrl: input.baseUrl || '',
            apiKey: input.apiKey || '',
            model: input.model || '',
            temperature: Number.isFinite(Number(input.temperature)) ? Number(input.temperature) : 0.7,
            topP: Number.isFinite(Number(input.topP)) ? Number(input.topP) : 1,
            maxTokens,
            maxOutputTokens: Number(input.maxOutputTokens) > 0 ? Number(input.maxOutputTokens) : maxTokens,
            contextLen: Number(input.contextLen) > 0 ? Number(input.contextLen) : 50,
            frequencyPenalty: Number.isFinite(Number(input.frequencyPenalty)) ? Number(input.frequencyPenalty) : 0,
            presencePenalty: Number.isFinite(Number(input.presencePenalty)) ? Number(input.presencePenalty) : 0,
            stream: input.stream !== false,
            reasoningEffort: input.reasoningEffort || '',
            reasoningEffortEnabled: input.reasoningEffortEnabled === true,
            supportsReasoning: input.supportsReasoning === true,
            supportsVision: input.supportsVision !== false,
            supportsTools: input.supportsTools !== undefined ? input.supportsTools === true : input.webEnabled === true,
            tokenParameterMode,
            webEnabled: input.webEnabled === true,
            searchUrlTemplate: input.searchUrlTemplate || ''
        };
    }

    function createDefaultConfig() {
        const profile = createDefaultProfile({ id: 'p_default', name: '默认' });
        return {
            schemaVersion: AI_SCHEMA_VERSION,
            profiles: [profile],
            currentProfileId: profile.id,
            system: '',
            systemTemplate: 'default',
            compressEnabled: false,
            compressThreshold: 20,
            compressKeepLast: 6,
            thinkDefaultOpen: false,
            skills: [],
            alwaysAllowedDomains: []
        };
    }

    function normalizeDomains(domains) {
        return [...new Set((Array.isArray(domains) ? domains : [])
            .map(domain => String(domain || '').trim().toLowerCase().replace(/\.$/, ''))
            .filter(Boolean))];
    }

    function createMigrationFailure(errors) {
        return {
            value: undefined,
            changed: false,
            valid: false,
            migratable: false,
            sourceKind: 'corrupt',
            errors
        };
    }

    function createMigrationSuccess(value, changed, sourceKind) {
        return {
            value,
            changed,
            valid: true,
            migratable: sourceKind === 'legacy',
            sourceKind,
            errors: []
        };
    }

    function inspectConfigSource(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            return { valid: false, errors: ['配置根节点必须是对象'] };
        }
        if (hasOwn(input, 'schemaVersion')
            && (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 0 || input.schemaVersion > AI_SCHEMA_VERSION)) {
            return { valid: false, errors: ['配置版本不受支持'] };
        }
        if (hasOwn(input, 'profiles') && !Array.isArray(input.profiles)) {
            return { valid: false, errors: ['profiles 必须是数组'] };
        }
        if (hasOwn(input, 'skills') && !Array.isArray(input.skills)) {
            return { valid: false, errors: ['skills 必须是数组'] };
        }
        if (hasOwn(input, 'alwaysAllowedDomains') && !Array.isArray(input.alwaysAllowedDomains)) {
            return { valid: false, errors: ['alwaysAllowedDomains 必须是数组'] };
        }

        const isCurrent = input.schemaVersion === AI_SCHEMA_VERSION && Array.isArray(input.profiles);
        if (isCurrent) {
            const errors = [];
            input.profiles.forEach((profile, index) => validateProfile(profile, index, errors));
            (input.skills || []).forEach((skill, index) => validateSkill(skill, index, errors));
            (input.alwaysAllowedDomains || []).forEach((domain, index) => {
                if (typeof domain !== 'string') errors.push(`alwaysAllowedDomains[${index}] 必须是字符串`);
            });
            validateUniqueIdentifiers(input.profiles, input.skills || [], [], errors);
            if (typeof input.currentProfileId !== 'string'
                || !input.profiles.some(profile => profile?.id === input.currentProfileId)) {
                errors.push('currentProfileId 找不到对应 Profile');
            }
            if (errors.length) return { valid: false, errors };
        }
        return { valid: true, sourceKind: isCurrent ? 'current' : 'legacy' };
    }

    function inspectSessionsSource(input) {
        if (Array.isArray(input)) {
            return { valid: true, sourceKind: 'legacy', envelope: { schemaVersion: 0, sessions: input } };
        }
        if (!input || typeof input !== 'object') {
            return { valid: false, errors: ['会话根节点必须是数组或对象'] };
        }
        if (hasOwn(input, 'schemaVersion')
            && (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 0 || input.schemaVersion > AI_SCHEMA_VERSION)) {
            return { valid: false, errors: ['会话版本不受支持'] };
        }
        if (!Array.isArray(input.sessions)) {
            return { valid: false, errors: ['sessions 必须是数组'] };
        }

        const sourceKind = input.schemaVersion === AI_SCHEMA_VERSION ? 'current' : 'legacy';
        if (sourceKind === 'current') {
            const errors = [];
            input.sessions.forEach((session, index) => validateSession(
                session,
                index,
                errors,
                { requirePersistentFields: true }
            ));
            const emptyProfiles = [];
            const emptySkills = [];
            validateUniqueIdentifiers(emptyProfiles, emptySkills, input.sessions, errors);
            if (errors.length) return { valid: false, errors };
        }
        return { valid: true, sourceKind, envelope: input };
    }

    function migrateConfig(input) {
        const inspection = inspectConfigSource(input);
        if (!inspection.valid) return createMigrationFailure(inspection.errors);

        const source = cloneValue(input);
        const defaults = createDefaultConfig();
        let profiles;

        if (Array.isArray(source.profiles)) {
            profiles = source.profiles.map(createDefaultProfile);
        } else {
            profiles = [createDefaultProfile({
                id: 'p_default',
                name: '默认',
                baseUrl: source.baseUrl,
                apiKey: source.apiKey,
                model: source.model,
                temperature: source.temperature,
                topP: source.topP,
                maxTokens: source.maxTokens,
                contextLen: source.contextLen,
                frequencyPenalty: source.frequencyPenalty,
                presencePenalty: source.presencePenalty,
                stream: source.stream,
                reasoningEffort: source.reasoningEffort,
                webEnabled: source.webEnabled,
                searchUrlTemplate: source.searchUrlTemplate
            })];
        }

        if (profiles.length === 0) {
            profiles = defaults.profiles;
        }

        const requestedCurrentProfileId = source.currentProfileId;
        const currentProfileId = profiles.some(profile => profile.id === requestedCurrentProfileId)
            ? requestedCurrentProfileId
            : profiles[0].id;
        const migrated = {
            schemaVersion: AI_SCHEMA_VERSION,
            profiles,
            currentProfileId,
            system: typeof source.system === 'string' ? source.system : defaults.system,
            systemTemplate: typeof source.systemTemplate === 'string' ? source.systemTemplate : defaults.systemTemplate,
            compressEnabled: source.compressEnabled === true,
            compressThreshold: Number(source.compressThreshold) >= 2 ? Number(source.compressThreshold) : defaults.compressThreshold,
            compressKeepLast: Number(source.compressKeepLast) >= 1 ? Number(source.compressKeepLast) : defaults.compressKeepLast,
            thinkDefaultOpen: source.thinkDefaultOpen === true,
            skills: Array.isArray(source.skills) ? source.skills.map(sanitizePersistentValue) : [],
            alwaysAllowedDomains: normalizeDomains(source.alwaysAllowedDomains)
        };

        return createMigrationSuccess(
            migrated,
            JSON.stringify(source) !== JSON.stringify(migrated),
            inspection.sourceKind
        );
    }

    function migrateMessage(message, sessionCreatedAt) {
        const source = message && typeof message === 'object' ? message : {};
        const migrated = {
            id: source.id || createStableId('m'),
            role: source.role === 'assistant' ? 'assistant' : 'user',
            content: typeof source.content === 'string' ? source.content : '',
            createdAt: Number(source.createdAt ?? source.ts ?? sessionCreatedAt ?? Date.now())
        };

        [
            'images',
            'reasoning',
            'thinkOpen',
            'truncated',
            'profileId',
            'model',
            'startedAt',
            'completedAt',
            'latencyMs',
            'usage',
            'finishReason',
            'toolEvents'
        ].forEach(key => {
            if (source[key] !== undefined) {
                migrated[key] = cloneValue(source[key]);
            }
        });

        return migrated;
    }

    function migrateSession(session) {
        const source = session && typeof session === 'object' ? session : {};
        const createdAt = Number(source.createdAt) || Date.now();
        const messages = (Array.isArray(source.messages) ? source.messages : [])
            .map(message => migrateMessage(message, createdAt));
        const revision = Number.isInteger(source.revision) && source.revision >= 0 ? source.revision : 0;
        const migrated = {
            id: source.id || createStableId('s'),
            title: typeof source.title === 'string' ? source.title : '新对话',
            titleAuto: source.titleAuto !== false,
            pinned: source.pinned === true,
            createdAt,
            updatedAt: Number(source.updatedAt) || createdAt,
            revision,
            messages
        };

        ['titleTries', 'sourceSessionId', 'sourceMessageId'].forEach(key => {
            if (source[key] !== undefined) migrated[key] = source[key];
        });

        if (source.compressed && typeof source.compressed.summary === 'string') {
            let boundaryMessageId = source.compressed.boundaryMessageId;
            if (!boundaryMessageId && Number.isInteger(source.compressed.upToIndex) && source.compressed.upToIndex > 0) {
                boundaryMessageId = messages[source.compressed.upToIndex - 1]?.id;
            }

            if (boundaryMessageId && messages.some(message => message.id === boundaryMessageId)) {
                migrated.compressed = {
                    summary: source.compressed.summary,
                    boundaryMessageId,
                    sourceRevision: Number.isInteger(source.compressed.sourceRevision)
                        ? source.compressed.sourceRevision
                        : revision,
                    createdAt: Number(source.compressed.createdAt ?? source.compressed.at ?? Date.now())
                };
            }
        }

        return migrated;
    }

    function migrateSessions(input) {
        const inspection = inspectSessionsSource(input);
        if (!inspection.valid) return createMigrationFailure(inspection.errors);

        const sourceEnvelope = cloneValue(inspection.envelope);
        if (inspection.sourceKind === 'current') {
            return createMigrationSuccess(sourceEnvelope.sessions, false, inspection.sourceKind);
        }

        const sessions = sourceEnvelope.sessions.map(migrateSession);
        const migratedEnvelope = { schemaVersion: AI_SCHEMA_VERSION, sessions };

        return createMigrationSuccess(
            sessions,
            JSON.stringify(sourceEnvelope) !== JSON.stringify(migratedEnvelope),
            inspection.sourceKind
        );
    }

    function createPersistentConfig(config) {
        return sanitizePersistentValue(config);
    }

    function createPersistentSessions(sessions) {
        return {
            schemaVersion: AI_SCHEMA_VERSION,
            sessions: sanitizePersistentValue(Array.isArray(sessions) ? sessions : [])
        };
    }

    function createSessionsQuotaCandidate(sourceSessions, protectedMessages = []) {
        const candidateSessions = cloneValue(Array.isArray(sourceSessions) ? sourceSessions : []);
        const protectedMessageKeys = new Set(
            (Array.isArray(protectedMessages) ? protectedMessages : [])
                .filter(item => isNonEmptyString(item?.sessionId) && isNonEmptyString(item?.messageId))
                .map(item => `${item.sessionId}\u0000${item.messageId}`)
        );
        let removedImageMessages = 0;
        const removedImageMessageReferences = [];

        function removeOldestImages(maximumMessages) {
            let removedThisRound = 0;
            for (let sessionIndex = candidateSessions.length - 1;
                sessionIndex >= 0 && removedThisRound < maximumMessages;
                sessionIndex--) {
                const session = candidateSessions[sessionIndex];
                if (!Array.isArray(session?.messages)) continue;
                for (let messageIndex = 0;
                    messageIndex < session.messages.length && removedThisRound < maximumMessages;
                    messageIndex++) {
                    const message = session.messages[messageIndex];
                    const messageKey = `${session.id}\u0000${message?.id}`;
                    if (protectedMessageKeys.has(messageKey) || !Array.isArray(message?.images) || message.images.length === 0) {
                        continue;
                    }
                    delete message.images;
                    removedImageMessageReferences.push({
                        sessionId: session.id,
                        messageId: message.id
                    });
                    removedThisRound++;
                    removedImageMessages++;
                }
            }
            return removedThisRound;
        }

        return {
            sessions: candidateSessions,
            get removedImageMessages() {
                return removedImageMessages;
            },
            get removedImageMessageReferences() {
                return removedImageMessageReferences.map(reference => ({ ...reference }));
            },
            removeOldestImages
        };
    }

    function createPayloadSnapshot(payload) {
        return deepFreeze(cloneValue(payload));
    }

    function findMessageIndexById(session, messageId) {
        return Array.isArray(session?.messages)
            ? session.messages.findIndex(message => message.id === messageId)
            : -1;
    }

    function createConversationBranch(sourceSession, options) {
        const sourceMessageIndex = findMessageIndexById(sourceSession, options.sourceMessageId);
        if (sourceMessageIndex < 0) throw new Error('找不到分支消息');

        let messages;
        let requestUserMessageId;

        if (options.mode === 'edit-user') {
            const sourceMessage = sourceSession.messages[sourceMessageIndex];
            if (sourceMessage.role !== 'user') throw new Error('只能编辑用户消息');

            const replacementMessage = {
                id: options.newMessageId || createStableId('m'),
                role: 'user',
                content: String(options.replacementContent ?? ''),
                createdAt: options.now ?? Date.now()
            };
            if (Array.isArray(options.replacementImages) && options.replacementImages.length) {
                replacementMessage.images = cloneValue(options.replacementImages);
            }

            messages = sourceSession.messages.slice(0, sourceMessageIndex).map(cloneValue);
            messages.push(replacementMessage);
            requestUserMessageId = replacementMessage.id;
        } else if (options.mode === 'regenerate-assistant') {
            const sourceMessage = sourceSession.messages[sourceMessageIndex];
            if (sourceMessage.role !== 'assistant') throw new Error('只能重新生成助手消息');

            let userMessageIndex = sourceMessageIndex - 1;
            while (userMessageIndex >= 0 && sourceSession.messages[userMessageIndex].role !== 'user') {
                userMessageIndex--;
            }
            if (userMessageIndex < 0) throw new Error('找不到对应的用户消息');

            messages = sourceSession.messages.slice(0, userMessageIndex + 1).map(cloneValue);
            requestUserMessageId = messages[messages.length - 1].id;
        } else {
            throw new Error(`不支持的会话分支模式：${options.mode}`);
        }

        const now = options.now ?? Date.now();
        return {
            session: {
                id: options.newSessionId || createStableId('s'),
                title: `${sourceSession.title || '新对话'} · 分支`,
                titleAuto: false,
                pinned: false,
                createdAt: now,
                updatedAt: now,
                revision: 0,
                sourceSessionId: sourceSession.id,
                sourceMessageId: options.sourceMessageId,
                messages
            },
            requestUserMessageId
        };
    }

    function incrementSessionRevision(session, { changedMessageId, now = Date.now() } = {}) {
        const updatedSession = cloneValue(session);
        updatedSession.revision = (Number(updatedSession.revision) || 0) + 1;
        updatedSession.updatedAt = now;
        return invalidateCompressionForMutation(updatedSession, changedMessageId);
    }

    function invalidateCompressionForMutation(session, changedMessageId) {
        const updatedSession = cloneValue(session);
        if (!updatedSession.compressed) return updatedSession;

        const changedIndex = findMessageIndexById(updatedSession, changedMessageId);
        const boundaryIndex = findMessageIndexById(updatedSession, updatedSession.compressed.boundaryMessageId);
        if (changedIndex < 0 || boundaryIndex < 0 || changedIndex <= boundaryIndex) {
            delete updatedSession.compressed;
        }
        return updatedSession;
    }

    function applyCompressionResult(session, result) {
        const updatedSession = cloneValue(session);
        const boundaryExists = findMessageIndexById(updatedSession, result.boundaryMessageId) >= 0;
        if ((Number(updatedSession.revision) || 0) !== result.startedRevision || !boundaryExists) {
            return { applied: false, session: updatedSession };
        }

        updatedSession.compressed = {
            summary: String(result.summary || ''),
            boundaryMessageId: result.boundaryMessageId,
            sourceRevision: result.startedRevision,
            createdAt: result.createdAt ?? Date.now()
        };
        return { applied: true, session: updatedSession };
    }

    function filterAndSortSessions(sessions, query) {
        const normalizedQuery = String(query || '').trim().toLowerCase();
        return (Array.isArray(sessions) ? sessions : [])
            .filter(session => {
                if (!normalizedQuery) return true;
                const messages = Array.isArray(session?.messages) ? session.messages : [];
                const searchableText = [
                    session.title,
                    ...messages.flatMap(message => [message.content, message.reasoning])
                ].join('\n').toLowerCase();
                return searchableText.includes(normalizedQuery);
            })
            .slice()
            .sort((left, right) => {
                if (Boolean(left.pinned) !== Boolean(right.pinned)) {
                    return left.pinned ? -1 : 1;
                }
                return (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0);
            });
    }

    function buildProfileRequestParameters(profile, { includeTools = false, tools = [] } = {}) {
        const parameters = {
            model: profile.model,
            temperature: Number(profile.temperature),
            top_p: Number(profile.topP),
            frequency_penalty: Number(profile.frequencyPenalty),
            presence_penalty: Number(profile.presencePenalty),
            stream: profile.stream !== false
        };
        const requestedTokens = Number(profile.maxTokens) > 0 ? Number(profile.maxTokens) : 0;
        const capabilityLimit = Number(profile.maxOutputTokens) > 0 ? Number(profile.maxOutputTokens) : requestedTokens;
        const outputTokens = requestedTokens && capabilityLimit
            ? Math.min(requestedTokens, capabilityLimit)
            : requestedTokens || capabilityLimit;

        if (outputTokens > 0 && profile.tokenParameterMode === 'max_completion_tokens') {
            parameters.max_completion_tokens = outputTokens;
        } else if (outputTokens > 0 && profile.tokenParameterMode !== 'none') {
            parameters.max_tokens = outputTokens;
        }

        if (profile.supportsReasoning && profile.reasoningEffortEnabled && profile.reasoningEffort) {
            parameters.reasoning_effort = profile.reasoningEffort;
        }
        if (includeTools && profile.supportsTools && Array.isArray(tools) && tools.length) {
            parameters.tools = cloneValue(tools);
            parameters.tool_choice = 'auto';
        }

        return parameters;
    }

    function getRequestFallback(status, responseText, sentBody) {
        if (![400, 422].includes(Number(status))) return null;
        const normalizedError = String(responseText || '').toLowerCase();
        const unsupportedPattern = /(unknown|unsupported|unrecognized|not allowed|not permitted|unexpected|invalid|extra).{0,80}(parameter|field|property|argument)|(?:parameter|field|property|argument).{0,80}(unknown|unsupported|unrecognized|not allowed|not permitted|unexpected|invalid|extra)/;
        if (!unsupportedPattern.test(normalizedError)) return null;

        const fallbackFields = ['reasoning_effort', 'max_completion_tokens', 'max_tokens'];
        for (const fieldName of fallbackFields) {
            const hyphenName = fieldName.replace(/_/g, '-');
            const mentionsField = normalizedError.includes(fieldName) || normalizedError.includes(hyphenName);
            if (sentBody?.[fieldName] !== undefined && mentionsField) {
                if (fieldName === 'max_completion_tokens') {
                    return { removeField: fieldName, replacementField: 'max_tokens' };
                }
                if (fieldName === 'max_tokens') {
                    return { removeField: fieldName, replacementField: 'max_completion_tokens' };
                }
                return { removeField: fieldName };
            }
        }
        return null;
    }

    function estimateTextTokens(text) {
        let estimatedTokens = 0;
        for (const character of String(text || '')) {
            const codePoint = character.codePointAt(0);
            if (codePoint <= 0x7f) estimatedTokens += 0.25;
            else if ((codePoint >= 0x3400 && codePoint <= 0x9fff) || (codePoint >= 0xf900 && codePoint <= 0xfaff)) estimatedTokens += 1;
            else estimatedTokens += 0.5;
        }
        return Math.ceil(estimatedTokens);
    }

    function estimateContextBudget({
        systemText = '',
        skillTexts = [],
        summaryText = '',
        historyMessages = [],
        currentInput = '',
        localFiles = [],
        imageCount = 0
    } = {}) {
        const budget = {
            system: estimateTextTokens(systemText),
            skills: (skillTexts || []).reduce((total, text) => total + estimateTextTokens(text), 0),
            summary: estimateTextTokens(summaryText),
            history: (historyMessages || []).reduce((total, message) => total + estimateTextTokens(message?.content || ''), 0),
            currentInput: estimateTextTokens(currentInput),
            localFiles: (localFiles || []).reduce((total, file) => total + estimateTextTokens(file?.content || ''), 0),
            imageCount: Number(imageCount) || 0
        };
        budget.estimatedTokens = budget.system + budget.skills + budget.summary + budget.history + budget.currentInput + budget.localFiles;
        return budget;
    }

    function createSseParser(handlers = {}) {
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let eventDataLines = [];
        let content = '';
        let reasoning = '';
        let usage = null;
        let finishReason = '';
        let done = false;
        const errors = [];

        function processEvent() {
            if (!eventDataLines.length || done) {
                eventDataLines = [];
                return;
            }

            const payload = eventDataLines.join('\n').trim();
            eventDataLines = [];
            if (!payload) return;
            if (payload === '[DONE]') {
                done = true;
                handlers.onDone?.();
                return;
            }

            try {
                const parsed = JSON.parse(payload);
                const choice = parsed?.choices?.[0] || {};
                const delta = choice.delta || {};
                const message = choice.message || {};
                const contentDelta = delta.content ?? message.content ?? '';
                const reasoningDelta = delta.reasoning ?? delta.reasoning_content ?? delta.thought ?? message.reasoning ?? message.reasoning_content ?? message.thought ?? '';

                if (contentDelta) {
                    content += contentDelta;
                    handlers.onContent?.(contentDelta);
                }
                if (reasoningDelta) {
                    reasoning += reasoningDelta;
                    handlers.onReasoning?.(reasoningDelta);
                }
                if (choice.finish_reason) {
                    finishReason = choice.finish_reason;
                    handlers.onFinishReason?.(finishReason);
                }
                if (parsed.usage) {
                    usage = cloneValue(parsed.usage);
                    handlers.onUsage?.(cloneValue(usage));
                }
            } catch (error) {
                const diagnostic = { payload, message: error.message };
                errors.push(diagnostic);
                handlers.onParseError?.(diagnostic);
            }
        }

        function processBufferedLines(flushRemaining = false) {
            while (buffer.length) {
                const lineBreakMatch = buffer.match(/\r\n|\n|\r/);
                if (!lineBreakMatch) break;
                const newlineIndex = lineBreakMatch.index;
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + lineBreakMatch[0].length);

                if (line === '') {
                    processEvent();
                } else if (line.startsWith('data:')) {
                    eventDataLines.push(line.slice(5).replace(/^ /, ''));
                }
            }

            if (flushRemaining && buffer) {
                const line = buffer;
                buffer = '';
                if (line.startsWith('data:')) {
                    eventDataLines.push(line.slice(5).replace(/^ /, ''));
                }
            }
            if (flushRemaining) processEvent();
        }

        return {
            push(chunk) {
                if (done) return { done: true };
                buffer += typeof chunk === 'string'
                    ? chunk
                    : decoder.decode(chunk, { stream: true });
                processBufferedLines(false);
                return { done };
            },
            finish() {
                buffer += decoder.decode();
                processBufferedLines(true);
                return {
                    done,
                    content,
                    reasoning,
                    usage: cloneValue(usage),
                    finishReason,
                    errors: cloneValue(errors)
                };
            }
        };
    }

    function mergeContinuationText(existingText, incomingText, { maxOverlapCharacters = 4000 } = {}) {
        const existing = String(existingText || '');
        const incoming = String(incomingText || '');
        const maxOverlap = Math.min(existing.length, incoming.length, Math.max(0, maxOverlapCharacters));

        for (let overlapLength = maxOverlap; overlapLength > 0; overlapLength--) {
            if (existing.slice(-overlapLength) === incoming.slice(0, overlapLength)) {
                return {
                    appendedText: incoming.slice(overlapLength),
                    overlapLength
                };
            }
        }

        return { appendedText: incoming, overlapLength: 0 };
    }

    function createBackupSnapshot({ config = {}, sessions = [] }, { includeApiKeys = false, exportedAt = new Date().toISOString() } = {}) {
        const persistentConfig = createPersistentConfig(config);
        const profiles = (persistentConfig.profiles || []).map(profile => {
            const clonedProfile = cloneValue(profile);
            if (!includeApiKeys) delete clonedProfile.apiKey;
            return clonedProfile;
        });
        const skills = cloneValue(persistentConfig.skills || []);
        const alwaysAllowedDomains = normalizeDomains(persistentConfig.alwaysAllowedDomains);
        const globalConfig = cloneValue(persistentConfig);
        delete globalConfig.profiles;
        delete globalConfig.skills;
        delete globalConfig.alwaysAllowedDomains;

        return {
            schemaVersion: AI_SCHEMA_VERSION,
            exportedAt,
            containsApiKeys: includeApiKeys && profiles.some(profile => Boolean(profile.apiKey)),
            config: globalConfig,
            profiles,
            skills,
            alwaysAllowedDomains,
            sessions: createPersistentSessions(sessions).sessions
        };
    }

    function isPlainObject(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.length > 0;
    }

    function addOptionalTypeError(errors, value, propertyName, expectedType, path) {
        if (!hasOwn(value, propertyName)) return;
        const propertyValue = value[propertyName];
        const valid = expectedType === 'array'
            ? Array.isArray(propertyValue)
            : expectedType === 'integer'
                ? Number.isInteger(propertyValue)
                : expectedType === 'number'
                    ? typeof propertyValue === 'number' && Number.isFinite(propertyValue)
                    : expectedType === 'object'
                        ? isPlainObject(propertyValue)
                        : typeof propertyValue === expectedType;
        if (!valid) errors.push(`${path}.${propertyName} 类型无效`);
    }

    function validateProfile(profile, index, errors) {
        const path = `profiles[${index}]`;
        if (!isPlainObject(profile)) {
            errors.push(`${path} 必须是对象`);
            return;
        }
        if (!isNonEmptyString(profile.id)) errors.push(`${path}.id 必须是非空字符串`);
        if (!isNonEmptyString(profile.name)) errors.push(`${path}.name 必须是非空字符串`);

        ['baseUrl', 'apiKey', 'model', 'reasoningEffort', 'tokenParameterMode', 'searchUrlTemplate']
            .forEach(propertyName => addOptionalTypeError(errors, profile, propertyName, 'string', path));
        ['temperature', 'topP', 'maxTokens', 'maxOutputTokens', 'contextLen', 'frequencyPenalty', 'presencePenalty']
            .forEach(propertyName => addOptionalTypeError(errors, profile, propertyName, 'number', path));
        ['stream', 'reasoningEffortEnabled', 'supportsReasoning', 'supportsVision', 'supportsTools', 'webEnabled']
            .forEach(propertyName => addOptionalTypeError(errors, profile, propertyName, 'boolean', path));
        if (profile.tokenParameterMode !== undefined && !validTokenParameterModes.has(profile.tokenParameterMode)) {
            errors.push(`${path}.tokenParameterMode 不受支持`);
        }
    }

    function validateSkill(skill, index, errors) {
        const path = `skills[${index}]`;
        if (!isPlainObject(skill)) {
            errors.push(`${path} 必须是对象`);
            return;
        }
        if (!isNonEmptyString(skill.id)) errors.push(`${path}.id 必须是非空字符串`);
        if (!isNonEmptyString(skill.name)) errors.push(`${path}.name 必须是非空字符串`);
        if (typeof skill.content !== 'string') errors.push(`${path}.content 必须是字符串`);
        if (typeof skill.enabled !== 'boolean') errors.push(`${path}.enabled 必须是布尔值`);
        addOptionalTypeError(errors, skill, 'source', 'string', path);
        addOptionalTypeError(errors, skill, 'createdAt', 'number', path);

        if (typeof skill.content === 'string' && utf8Encoder.encode(skill.content).length > AI_SKILL_MAX_BYTES) {
            errors.push(`${path}.content 不能超过 256 KiB`);
        }
    }

    function isStrictImageDataUrl(value) {
        if (typeof value !== 'string' || !strictImageDataUrlPattern.test(value)) return false;
        const payload = value.slice(value.indexOf(',') + 1);
        if (!validBase64PayloadPattern.test(payload)) return false;

        // Base64 尾部未使用位必须为零，否则不同解码器可能得到不一致内容。
        const unpaddedLength = payload.replace(/=+$/, '').length;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const lastValue = alphabet.indexOf(payload[unpaddedLength - 1]);
        if (payload.endsWith('==')) return (lastValue & 15) === 0;
        if (payload.endsWith('=')) return (lastValue & 3) === 0;
        return true;
    }

    function validateMessage(message, sessionIndex, messageIndex, errors, options = {}) {
        const path = `sessions[${sessionIndex}].messages[${messageIndex}]`;
        const requirePersistentFields = options.requirePersistentFields === true;
        if (!isPlainObject(message)) {
            errors.push(`${path} 必须是对象`);
            return;
        }
        if (!isNonEmptyString(message.id)) errors.push(`${path}.id 必须是非空字符串`);
        if (!validMessageRoles.has(message.role)) errors.push(`${path}.role 只能是 user 或 assistant`);
        if (typeof message.content !== 'string') errors.push(`${path}.content 必须是字符串`);
        if (requirePersistentFields && !hasOwn(message, 'createdAt')) errors.push(`${path}.createdAt 必须存在`);
        addOptionalTypeError(errors, message, 'createdAt', 'number', path);
        ['reasoning', 'profileId', 'model', 'finishReason']
            .forEach(propertyName => addOptionalTypeError(errors, message, propertyName, 'string', path));
        ['thinkOpen', 'truncated']
            .forEach(propertyName => addOptionalTypeError(errors, message, propertyName, 'boolean', path));
        ['startedAt', 'completedAt', 'latencyMs']
            .forEach(propertyName => addOptionalTypeError(errors, message, propertyName, 'number', path));
        addOptionalTypeError(errors, message, 'usage', 'object', path);
        addOptionalTypeError(errors, message, 'toolEvents', 'array', path);
        addOptionalTypeError(errors, message, 'fileNames', 'array', path);
        if (Array.isArray(message.toolEvents)) {
            message.toolEvents.forEach((toolEvent, toolEventIndex) => {
                if (!isPlainObject(toolEvent)) errors.push(`${path}.toolEvents[${toolEventIndex}] 必须是对象`);
            });
        }
        if (Array.isArray(message.fileNames)) {
            message.fileNames.forEach((fileName, fileNameIndex) => {
                if (typeof fileName !== 'string') errors.push(`${path}.fileNames[${fileNameIndex}] 必须是字符串`);
            });
        }

        if (hasOwn(message, 'images')) {
            if (!Array.isArray(message.images)) {
                errors.push(`${path}.images 必须是数组`);
            } else {
                message.images.forEach((image, imageIndex) => {
                    if (!isStrictImageDataUrl(image)) {
                        errors.push(`${path}.images[${imageIndex}] 必须是 PNG、JPEG 或 WebP Base64 data URL`);
                    }
                });
            }
        }
    }

    function validateCompressedSession(compressed, session, index, errors) {
        const path = `sessions[${index}].compressed`;
        if (!isPlainObject(compressed)) {
            errors.push(`${path} 必须是对象`);
            return;
        }
        if (typeof compressed.summary !== 'string') errors.push(`${path}.summary 必须是字符串`);
        if (!isNonEmptyString(compressed.boundaryMessageId)) errors.push(`${path}.boundaryMessageId 必须是非空字符串`);
        addOptionalTypeError(errors, compressed, 'sourceRevision', 'integer', path);
        addOptionalTypeError(errors, compressed, 'createdAt', 'number', path);
        if (isNonEmptyString(compressed.boundaryMessageId)
            && Array.isArray(session.messages)
            && !session.messages.some(message => message?.id === compressed.boundaryMessageId)) {
            errors.push(`${path}.boundaryMessageId 找不到对应消息`);
        }
    }

    function validateSession(session, index, errors, options = {}) {
        const path = `sessions[${index}]`;
        const requirePersistentFields = options.requirePersistentFields === true;
        if (!isPlainObject(session)) {
            errors.push(`${path} 必须是对象`);
            return;
        }
        if (!isNonEmptyString(session.id)) errors.push(`${path}.id 必须是非空字符串`);
        if (typeof session.title !== 'string') errors.push(`${path}.title 必须是字符串`);
        if (requirePersistentFields) {
            ['titleAuto', 'pinned', 'createdAt', 'updatedAt', 'revision'].forEach(propertyName => {
                if (!hasOwn(session, propertyName)) errors.push(`${path}.${propertyName} 必须存在`);
            });
        }
        ['titleAuto', 'pinned'].forEach(propertyName => addOptionalTypeError(errors, session, propertyName, 'boolean', path));
        ['createdAt', 'updatedAt'].forEach(propertyName => addOptionalTypeError(errors, session, propertyName, 'number', path));
        addOptionalTypeError(errors, session, 'revision', 'integer', path);
        ['sourceSessionId', 'sourceMessageId'].forEach(propertyName => addOptionalTypeError(errors, session, propertyName, 'string', path));

        if (!Array.isArray(session.messages)) {
            errors.push(`${path}.messages 必须是数组`);
        } else {
            session.messages.forEach((message, messageIndex) => validateMessage(
                message,
                index,
                messageIndex,
                errors,
                { requirePersistentFields }
            ));
        }
        if (hasOwn(session, 'compressed')) {
            validateCompressedSession(session.compressed, session, index, errors);
        }
    }

    function validateUniqueIdentifiers(profiles, skills, sessions, errors, { validateReferences = false } = {}) {
        const collectUniqueIds = (items, path) => {
            const identifiers = new Set();
            (Array.isArray(items) ? items : []).forEach((item, index) => {
                if (!isNonEmptyString(item?.id)) return;
                if (identifiers.has(item.id)) errors.push(`${path}[${index}].id 重复：${item.id}`);
                identifiers.add(item.id);
            });
            return identifiers;
        };

        const profileIds = collectUniqueIds(profiles, 'profiles');
        collectUniqueIds(skills, 'skills');
        const sessionIds = collectUniqueIds(sessions, 'sessions');
        const sessionsById = new Map(
            (Array.isArray(sessions) ? sessions : [])
                .filter(session => isNonEmptyString(session?.id))
                .map(session => [session.id, session])
        );

        (Array.isArray(sessions) ? sessions : []).forEach((session, sessionIndex) => {
            collectUniqueIds(session?.messages, `sessions[${sessionIndex}].messages`);
            if (!validateReferences || !isPlainObject(session)) return;

            if (isNonEmptyString(session.sourceSessionId)) {
                const sourceSession = sessionsById.get(session.sourceSessionId);
                if (!sessionIds.has(session.sourceSessionId)) {
                    errors.push(`sessions[${sessionIndex}].sourceSessionId 找不到对应会话`);
                } else if (isNonEmptyString(session.sourceMessageId)
                    && !sourceSession?.messages?.some(message => message?.id === session.sourceMessageId)) {
                    errors.push(`sessions[${sessionIndex}].sourceMessageId 找不到来源消息`);
                }
            }

            (Array.isArray(session?.messages) ? session.messages : []).forEach((message, messageIndex) => {
                if (isNonEmptyString(message?.profileId) && !profileIds.has(message.profileId)) {
                    errors.push(`sessions[${sessionIndex}].messages[${messageIndex}].profileId 找不到对应 Profile`);
                }
            });
        });
    }

    function validateBackupSnapshot(value, { byteLength = 0 } = {}) {
        const errors = [];
        if (!Number.isFinite(byteLength) || byteLength < 0) errors.push('备份文件字节数无效');
        if (byteLength > AI_BACKUP_MAX_BYTES) errors.push('备份文件超过 20 MiB 上限');
        if (!isPlainObject(value)) {
            errors.push('备份根节点必须是对象');
            return { valid: false, errors, summary: undefined };
        }
        if (value.schemaVersion !== AI_SCHEMA_VERSION) errors.push('备份版本不受支持');
        if (!Array.isArray(value.sessions)) errors.push('sessions 必须是数组');
        if (!Array.isArray(value.profiles)) errors.push('profiles 必须是数组');
        if (!Array.isArray(value.skills)) errors.push('skills 必须是数组');
        if (!Array.isArray(value.alwaysAllowedDomains)) errors.push('alwaysAllowedDomains 必须是数组');
        if (!isPlainObject(value.config)) errors.push('config 必须是对象');
        addOptionalTypeError(errors, value, 'exportedAt', 'string', 'backup');
        addOptionalTypeError(errors, value, 'containsApiKeys', 'boolean', 'backup');

        if (Array.isArray(value.profiles)) value.profiles.forEach((profile, index) => validateProfile(profile, index, errors));
        if (Array.isArray(value.skills)) value.skills.forEach((skill, index) => validateSkill(skill, index, errors));
        if (Array.isArray(value.sessions)) value.sessions.forEach((session, index) => validateSession(session, index, errors));
        if (Array.isArray(value.profiles) && Array.isArray(value.skills) && Array.isArray(value.sessions)) {
            validateUniqueIdentifiers(value.profiles, value.skills, value.sessions, errors, { validateReferences: true });
        }
        if (Array.isArray(value.alwaysAllowedDomains)) {
            value.alwaysAllowedDomains.forEach((domain, index) => {
                if (typeof domain !== 'string') errors.push(`alwaysAllowedDomains[${index}] 必须是字符串`);
            });
        }
        if (isPlainObject(value.config)) {
            ['currentProfileId', 'system', 'systemTemplate']
                .forEach(propertyName => addOptionalTypeError(errors, value.config, propertyName, 'string', 'config'));
            ['compressEnabled', 'thinkDefaultOpen']
                .forEach(propertyName => addOptionalTypeError(errors, value.config, propertyName, 'boolean', 'config'));
            ['schemaVersion', 'compressThreshold', 'compressKeepLast']
                .forEach(propertyName => addOptionalTypeError(errors, value.config, propertyName, 'number', 'config'));
        }
        if (Array.isArray(value.skills) && getEnabledSkillsByteLength(value.skills) > AI_ENABLED_SKILLS_TOTAL_MAX_BYTES) {
            errors.push('已启用 Skill 总文本不能超过 512 KiB');
        }

        return {
            valid: errors.length === 0,
            errors,
            summary: errors.length ? undefined : {
                sessionCount: value.sessions.length,
                profileCount: value.profiles.length,
                skillCount: value.skills.length,
                containsApiKeys: value.containsApiKeys === true
            }
        };
    }

    function mergeBackupSnapshot(currentState, importedBackup, { createId = createStableId, now = Date.now() } = {}) {
        const validation = validateBackupSnapshot(importedBackup);
        if (!validation.valid) {
            throw new Error(`备份文件无效：${validation.errors.join('；')}`);
        }
        if (typeof createId !== 'function' || !Number.isFinite(now)) {
            throw new Error('备份合并选项无效');
        }

        if (!currentState || typeof currentState !== 'object' || Array.isArray(currentState)) {
            throw new Error('当前 AI 状态无效');
        }
        if (!isPlainObject(currentState.config) || !Array.isArray(currentState.sessions)) {
            throw new Error('当前 AI 状态无效');
        }
        if (currentState.sessions.some(session => !isPlainObject(session))) {
            throw new Error('当前 AI 状态无效');
        }
        if (hasOwn(currentState.config, 'profiles') && !Array.isArray(currentState.config.profiles)) {
            throw new Error('当前 AI 状态无效');
        }
        if (hasOwn(currentState.config, 'skills') && !Array.isArray(currentState.config.skills)) {
            throw new Error('当前 AI 状态无效');
        }
        if (hasOwn(currentState.config, 'alwaysAllowedDomains')
            && !Array.isArray(currentState.config.alwaysAllowedDomains)) {
            throw new Error('当前 AI 状态无效');
        }

        const currentConfig = cloneValue(currentState.config);
        const currentSessions = cloneValue(currentState.sessions);
        const currentProfiles = Array.isArray(currentConfig.profiles) ? currentConfig.profiles : [];
        const currentSkills = Array.isArray(currentConfig.skills) ? currentConfig.skills : [];
        const currentDomains = Array.isArray(currentConfig.alwaysAllowedDomains) ? currentConfig.alwaysAllowedDomains : [];
        if (currentProfiles.some(profile => !isPlainObject(profile))
            || currentSkills.some(skill => !isPlainObject(skill))
            || currentDomains.some(domain => typeof domain !== 'string')) {
            throw new Error('当前 AI 状态无效');
        }
        const existingProfileIds = new Set(currentProfiles.map(profile => profile.id));
        const existingSessionIds = new Set(currentSessions.map(session => session.id));
        const existingSkillIds = new Set(currentSkills.map(skill => skill.id));
        const profileIdMap = new Map();
        const sessionIdMap = new Map();
        const skillIdMap = new Map();

        function createUniqueId(prefix, existingIds) {
            const maximumAttempts = 100;
            for (let attempt = 0; attempt < maximumAttempts; attempt++) {
                const nextId = createId(prefix);
                if (isNonEmptyString(nextId) && !existingIds.has(nextId)) return nextId;
            }
            throw new Error(`无法为 ${prefix} 生成唯一 ID`);
        }

        const importedProfiles = (importedBackup.profiles || []).map(profile => {
            const importedProfile = cloneValue(profile);
            let nextId = importedProfile.id;
            if (existingProfileIds.has(nextId)) nextId = createUniqueId('p', existingProfileIds);
            profileIdMap.set(importedProfile.id, nextId);
            existingProfileIds.add(nextId);
            importedProfile.id = nextId;
            return importedProfile;
        });

        const importedSkills = (importedBackup.skills || []).map(skill => {
            const importedSkill = cloneValue(skill);
            let nextId = importedSkill.id;
            if (existingSkillIds.has(nextId)) nextId = createUniqueId('sk', existingSkillIds);
            skillIdMap.set(importedSkill.id, nextId);
            existingSkillIds.add(nextId);
            importedSkill.id = nextId;
            return importedSkill;
        });

        const importedSessions = (importedBackup.sessions || []).map(session => {
            const importedSession = cloneValue(session);
            let nextId = importedSession.id;
            if (existingSessionIds.has(nextId)) nextId = createUniqueId('s', existingSessionIds);
            sessionIdMap.set(importedSession.id, nextId);
            existingSessionIds.add(nextId);
            importedSession.id = nextId;
            importedSession.updatedAt = Number(importedSession.updatedAt) || now;
            return importedSession;
        });

        importedSessions.forEach(session => {
            if (session.sourceSessionId && sessionIdMap.has(session.sourceSessionId)) {
                session.sourceSessionId = sessionIdMap.get(session.sourceSessionId);
            }
            (Array.isArray(session?.messages) ? session.messages : []).forEach(message => {
                if (message.profileId && profileIdMap.has(message.profileId)) {
                    message.profileId = profileIdMap.get(message.profileId);
                }
            });
        });

        const mergedConfig = {
            ...currentConfig,
            profiles: [...currentProfiles, ...importedProfiles],
            skills: [...currentSkills, ...importedSkills],
            alwaysAllowedDomains: normalizeDomains([
                ...currentDomains,
                ...importedBackup.alwaysAllowedDomains
            ])
        };

        return {
            config: mergedConfig,
            sessions: [...currentSessions, ...importedSessions],
            remappedIds: {
                profiles: Object.fromEntries(profileIdMap),
                sessions: Object.fromEntries(sessionIdMap),
                skills: Object.fromEntries(skillIdMap)
            }
        };
    }

    return {
        AI_BACKUP_MAX_BYTES,
        AI_ENABLED_SKILLS_TOTAL_MAX_BYTES,
        AI_IMAGE_MAX_TOTAL_PIXELS,
        AI_LOCAL_FILE_MAX_BYTES,
        AI_LOCAL_FILES_TOTAL_MAX_BYTES,
        AI_SCHEMA_VERSION,
        AI_SKILL_MAX_BYTES,
        applyCompressionResult,
        buildProfileRequestParameters,
        createBackupSnapshot,
        createConversationBranch,
        createPayloadSnapshot,
        createPersistentConfig,
        createPersistentSessions,
        createSessionsQuotaCandidate,
        createSseParser,
        createStableId,
        estimateContextBudget,
        estimateTextTokens,
        filterAndSortSessions,
        findMessageIndexById,
        getRequestFallback,
        getEnabledSkillsByteLength,
        incrementSessionRevision,
        invalidateCompressionForMutation,
        mergeBackupSnapshot,
        mergeContinuationText,
        migrateConfig,
        migrateSessions,
        validateBackupSnapshot,
        validateImageDimensions,
        validateSkillContent
    };
}));
