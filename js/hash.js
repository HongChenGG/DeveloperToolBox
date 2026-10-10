// Hash 计算器（文本 + 文件）依赖 lib/crypto-js.min.js (全局 CryptoJS)
(function() {
    const FILE_CHUNK_SIZE_BYTES = 4 * 1024 * 1024;
    const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

    function init() {
        const textInput = document.getElementById('hash-text');
        if (!textInput) return;
        const out = document.getElementById('hash-out');
        const fileInput = document.getElementById('hash-file');
        const fileInfo = document.getElementById('hash-file-info');
        const btnText = document.getElementById('btn-hash-text');
        const btnClear = document.getElementById('btn-hash-clear');
        let activeFileWorker = null;
        let activeFileRequestId = 0;

        function htmlRow(label, value) {
            return `<div style="margin-bottom:8px;padding:10px;background:var(--bg-darker);border-radius:4px;font-family:monospace;font-size:13px;">
                <div style="color:var(--accent-color);font-weight:bold;margin-bottom:4px;">${label}</div>
                <div style="word-break:break-all;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="flex:1">${value}</span>
                    <button class="btn btn-success" style="padding:4px 10px;font-size:12px;flex:none" data-copy="${value}">复制</button>
                </div>
            </div>`;
        }

        function bindCopyButtons() {
            out.querySelectorAll('[data-copy]').forEach(button => {
                button.addEventListener('click', () => {
                    copyToClipboard(button.getAttribute('data-copy'));
                });
            });
        }

        function stopActiveFileWorker() {
            if (activeFileWorker) {
                activeFileWorker.terminate();
                activeFileWorker = null;
            }
        }

        function beginFileRequest() {
            activeFileRequestId += 1;
            stopActiveFileWorker();
            return activeFileRequestId;
        }

        function calcText() {
            beginFileRequest();
            const text = textInput.value;
            if (typeof CryptoJS === 'undefined') { out.innerHTML = '<span style="color:var(--danger-color)">crypto-js.min.js 未加载</span>'; return; }
            const md5 = CryptoJS.MD5(text).toString();
            const sha1 = CryptoJS.SHA1(text).toString();
            const sha256 = CryptoJS.SHA256(text).toString();
            const sha512 = CryptoJS.SHA512(text).toString();
            const sha3 = CryptoJS.SHA3(text).toString();
            const ripemd = CryptoJS.RIPEMD160(text).toString();
            const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));
            out.innerHTML =
                htmlRow('MD5', md5) +
                htmlRow('SHA-1', sha1) +
                htmlRow('SHA-256', sha256) +
                htmlRow('SHA-512', sha512) +
                htmlRow('SHA-3', sha3) +
                htmlRow('RIPEMD-160', ripemd) +
                htmlRow('Base64', base64) +
                htmlRow('字符长度 / 字节长度', text.length + ' / ' + new Blob([text]).size);
            bindCopyButtons();
        }

        function createHashers() {
            if (typeof CryptoJS === 'undefined') {
                throw new Error('crypto-js.min.js 未加载');
            }
            return {
                md5: CryptoJS.algo.MD5.create(),
                sha1: CryptoJS.algo.SHA1.create(),
                sha256: CryptoJS.algo.SHA256.create(),
                sha512: CryptoJS.algo.SHA512.create()
            };
        }

        function updateHashers(hashers, arrayBuffer) {
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
            Object.values(hashers).forEach(hasher => hasher.update(wordArray));
        }

        function finalizeHashers(hashers) {
            return {
                md5: hashers.md5.finalize().toString(),
                sha1: hashers.sha1.finalize().toString(),
                sha256: hashers.sha256.finalize().toString(),
                sha512: hashers.sha512.finalize().toString()
            };
        }

        function updateFileProgress(file, progress) {
            fileInfo.textContent = `文件: ${file.name}（${(file.size / 1024).toFixed(2)} KB）计算中... ${progress}%`;
        }

        function renderFileHashes(file, hashes) {
            fileInfo.textContent = `文件: ${file.name}（${(file.size / 1024).toFixed(2)} KB）`;
            out.innerHTML =
                htmlRow('文件 MD5', hashes.md5) +
                htmlRow('文件 SHA-1', hashes.sha1) +
                htmlRow('文件 SHA-256', hashes.sha256) +
                htmlRow('文件 SHA-512', hashes.sha512);
            bindCopyButtons();
        }

        function renderFileError(file, message) {
            fileInfo.textContent = `文件 ${file.name} 计算失败: ${message}`;
            if (typeof showToast === 'function') showToast('文件哈希计算失败', 'error');
        }

        function yieldToMainThread() {
            return new Promise(resolve => setTimeout(resolve, 0));
        }

        async function calculateFileOnMainThread(file, requestId) {
            const hashers = createHashers();
            let offset = 0;

            while (offset < file.size) {
                if (requestId !== activeFileRequestId) return;
                const chunkEnd = Math.min(offset + FILE_CHUNK_SIZE_BYTES, file.size);
                const chunkBuffer = await file.slice(offset, chunkEnd).arrayBuffer();
                if (requestId !== activeFileRequestId) return;

                updateHashers(hashers, chunkBuffer);
                offset = chunkEnd;
                updateFileProgress(file, Math.round((offset / file.size) * 100));

                // file 协议降级时每片主动让出主线程，避免连续计算冻结页面。
                await yieldToMainThread();
            }

            if (requestId !== activeFileRequestId) return;
            if (file.size === 0) updateFileProgress(file, 100);
            renderFileHashes(file, finalizeHashers(hashers));
        }

        function startMainThreadHash(file, requestId) {
            calculateFileOnMainThread(file, requestId).catch(error => {
                if (requestId === activeFileRequestId) renderFileError(file, error.message);
            });
        }

        function startWorkerHash(file, requestId) {
            let worker;
            try {
                worker = new Worker('js/hash-worker.js');
            } catch (error) {
                startMainThreadHash(file, requestId);
                return;
            }

            let fallbackStarted = false;
            activeFileWorker = worker;

            const startFallback = event => {
                if (event && typeof event.preventDefault === 'function') event.preventDefault();
                if (fallbackStarted || requestId !== activeFileRequestId) return;
                fallbackStarted = true;
                stopActiveFileWorker();
                startMainThreadHash(file, requestId);
            };

            worker.onmessage = event => {
                const response = event.data || {};
                if (requestId !== activeFileRequestId || response.requestId !== requestId) return;

                if (response.type === 'progress') {
                    updateFileProgress(file, response.progress);
                    return;
                }

                stopActiveFileWorker();
                if (!response.ok) {
                    renderFileError(file, response.error);
                    return;
                }
                renderFileHashes(file, response.hashes);
            };
            worker.onerror = startFallback;
            worker.onmessageerror = startFallback;

            try {
                worker.postMessage({ requestId, file });
            } catch (error) {
                startFallback();
            }
        }

        function calcFile(file) {
            if (!file) return;
            const requestId = beginFileRequest();

            // 保留既有总文件上限，分块计算只解决峰值内存问题。
            if (file.size > MAX_FILE_SIZE_BYTES) {
                fileInfo.textContent = `文件 ${file.name}(${(file.size / 1024 / 1024).toFixed(0)} MB)过大,已拒绝(限制 500MB)`;
                if (typeof showToast === 'function') showToast('文件过大,超过 500MB', 'error');
                return;
            }

            updateFileProgress(file, 0);
            if (window.location.protocol === 'file:' || typeof Worker === 'undefined') {
                startMainThreadHash(file, requestId);
                return;
            }
            startWorkerHash(file, requestId);
        }

        btnText && btnText.addEventListener('click', calcText);
        textInput.addEventListener('input', () => {
            if (textInput.value) {
                calcText();
            } else {
                beginFileRequest();
                out.innerHTML = '';
            }
        });
        fileInput && fileInput.addEventListener('change', event => calcFile(event.target.files[0]));
        btnClear && btnClear.addEventListener('click', () => {
            beginFileRequest();
            textInput.value = '';
            out.innerHTML = '';
            fileInput.value = '';
            fileInfo.textContent = '';
        });

        // 拖拽文件
        const dropZone = document.getElementById('hash-drop');
        if (dropZone) {
            ['dragover', 'dragenter'].forEach(eventName => dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.style.background = 'var(--hover-bg)';
            }));
            ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.style.background = '';
            }));
            dropZone.addEventListener('drop', event => {
                const file = event.dataTransfer.files[0];
                if (file) calcFile(file);
            });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
