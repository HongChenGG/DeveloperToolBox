importScripts('../lib/crypto-js.min.js');

const FILE_CHUNK_SIZE_BYTES = 4 * 1024 * 1024;

function createHashers() {
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

// 文件在 Worker 内按固定大小切片，避免一次读取完整文件。
self.onmessage = async function handleHashRequest(event) {
    const request = event.data || {};
    const requestId = request.requestId;

    try {
        if (!(request.file instanceof Blob)) {
            throw new Error('缺少待计算文件');
        }

        const hashers = createHashers();
        let offset = 0;

        while (offset < request.file.size) {
            const chunkEnd = Math.min(offset + FILE_CHUNK_SIZE_BYTES, request.file.size);
            const chunkBuffer = await request.file.slice(offset, chunkEnd).arrayBuffer();
            updateHashers(hashers, chunkBuffer);
            offset = chunkEnd;

            self.postMessage({
                requestId,
                type: 'progress',
                progress: Math.round((offset / request.file.size) * 100)
            });
        }

        if (request.file.size === 0) {
            self.postMessage({ requestId, type: 'progress', progress: 100 });
        }

        self.postMessage({
            requestId,
            type: 'result',
            ok: true,
            hashes: finalizeHashers(hashers),
            error: null
        });
    } catch (error) {
        self.postMessage({
            requestId,
            type: 'result',
            ok: false,
            hashes: null,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
