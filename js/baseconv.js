// 进制 / Unicode / ASCII 转换
(function() {
    function validateRadix(radix) {
        if (!Number.isInteger(radix) || radix < 2 || radix > 36) {
            throw new Error('进制范围必须是 2-36 的整数');
        }
    }

    function parseBigIntByRadix(text, radix) {
        validateRadix(radix);
        const normalizedText = String(text ?? '').trim();
        const match = normalizedText.match(/^([+-]?)([0-9A-Za-z]+)$/);
        if (!match) throw new Error('请输入完整整数');

        const [, sign, digits] = match;
        const bigIntRadix = BigInt(radix);
        let value = 0n;

        for (const character of digits.toUpperCase()) {
            const characterCode = character.charCodeAt(0);
            const digitValue = characterCode >= 48 && characterCode <= 57
                ? characterCode - 48
                : characterCode - 55;
            if (digitValue < 0 || digitValue >= radix) {
                throw new Error(`字符 ${character} 不属于 ${radix} 进制`);
            }
            value = value * bigIntRadix + BigInt(digitValue);
        }

        return sign === '-' ? -value : value;
    }

    function convertBigIntRadix(text, fromRadix, toRadix) {
        validateRadix(toRadix);
        return parseBigIntByRadix(text, fromRadix).toString(toRadix).toUpperCase();
    }

    function init() {
        const dec = document.getElementById('base-dec');
        if (!dec) return;
        const bin = document.getElementById('base-bin');
        const oct = document.getElementById('base-oct');
        const hex = document.getElementById('base-hex');
        const customIn = document.getElementById('base-custom-in');
        const customFrom = document.getElementById('base-custom-from');
        const customTo = document.getElementById('base-custom-to');
        const customOut = document.getElementById('base-custom-out');
        const btnCustom = document.getElementById('btn-base-custom');

        const textInput = document.getElementById('uni-text');
        const uniOut = document.getElementById('uni-out');
        const asciiOut = document.getElementById('uni-ascii');
        const utf8Out = document.getElementById('uni-utf8');
        const utf16Out = document.getElementById('uni-utf16');
        const btnUni = document.getElementById('btn-uni-go');
        const uniDecodeIn = document.getElementById('uni-decode-in');
        const uniDecodeOut = document.getElementById('uni-decode-out');
        const btnUniDecode = document.getElementById('btn-uni-decode');

        let updating = false;
        function syncFrom(srcBase, srcEl) {
            if (updating) return;
            updating = true;
            try {
                const inputText = srcEl.value.trim();
                if (!inputText) {
                    [dec, bin, oct, hex].forEach(element => { if (element !== srcEl) element.value = ''; });
                    return;
                }
                const value = parseBigIntByRadix(inputText, srcBase);
                if (srcEl !== dec) dec.value = value.toString(10);
                if (srcEl !== bin) bin.value = value.toString(2);
                if (srcEl !== oct) oct.value = value.toString(8);
                if (srcEl !== hex) hex.value = value.toString(16).toUpperCase();
            } catch (e) { /* ignore */ }
            finally { updating = false; }
        }
        dec && dec.addEventListener('input', () => syncFrom(10, dec));
        bin && bin.addEventListener('input', () => syncFrom(2, bin));
        oct && oct.addEventListener('input', () => syncFrom(8, oct));
        hex && hex.addEventListener('input', () => syncFrom(16, hex));

        btnCustom && btnCustom.addEventListener('click', () => {
            try {
                const fromRadix = Number(customFrom.value);
                const toRadix = Number(customTo.value);
                customOut.value = convertBigIntRadix(customIn.value, fromRadix, toRadix);
            } catch (e) { customOut.value = '错误: ' + e.message; }
        });

        function textToUnicode() {
            const t = textInput.value;
            if (!t) { uniOut.value = ''; asciiOut.value = ''; utf8Out.value = ''; utf16Out.value = ''; return; }
            // Unicode 码点
            const codepoints = [];
            for (const ch of t) codepoints.push('U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
            uniOut.value = codepoints.join(' ');
            // ASCII (字符码)
            asciiOut.value = [...t].map(ch => ch.charCodeAt(0)).join(' ');
            // UTF-8 hex
            const utf8 = new TextEncoder().encode(t);
            utf8Out.value = [...utf8].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            // UTF-16 hex
            const utf16 = [];
            for (let i = 0; i < t.length; i++) utf16.push(t.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'));
            utf16Out.value = utf16.join(' ');
        }
        btnUni && btnUni.addEventListener('click', textToUnicode);
        textInput && textInput.addEventListener('input', textToUnicode);

        // 反解：支持 U+XXXX / \uXXXX / &#NNN; / hex
        btnUniDecode && btnUniDecode.addEventListener('click', () => {
            let s = uniDecodeIn.value;
            // \uXXXX
            s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
            // U+XXXX
            s = s.replace(/U\+([0-9a-fA-F]{1,6})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
            // &#NNN;
            s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
            s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
            uniDecodeOut.value = s;
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { convertBigIntRadix, parseBigIntByRadix };
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    }
})();
