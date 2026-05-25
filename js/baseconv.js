// 进制 / Unicode / ASCII 转换
(function() {
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
                const n = srcEl.value.trim();
                if (!n) { [dec, bin, oct, hex].forEach(e => { if (e !== srcEl) e.value = ''; }); updating = false; return; }
                const val = parseInt(n, srcBase);
                if (isNaN(val)) throw new Error('无法解析');
                if (srcEl !== dec) dec.value = val.toString(10);
                if (srcEl !== bin) bin.value = val.toString(2);
                if (srcEl !== oct) oct.value = val.toString(8);
                if (srcEl !== hex) hex.value = val.toString(16).toUpperCase();
            } catch (e) { /* ignore */ }
            updating = false;
        }
        dec && dec.addEventListener('input', () => syncFrom(10, dec));
        bin && bin.addEventListener('input', () => syncFrom(2, bin));
        oct && oct.addEventListener('input', () => syncFrom(8, oct));
        hex && hex.addEventListener('input', () => syncFrom(16, hex));

        btnCustom && btnCustom.addEventListener('click', () => {
            try {
                const f = parseInt(customFrom.value);
                const t = parseInt(customTo.value);
                if (f < 2 || f > 36 || t < 2 || t > 36) throw new Error('进制范围 2-36');
                const val = parseInt(customIn.value.trim(), f);
                if (isNaN(val)) throw new Error('无法解析');
                customOut.value = val.toString(t).toUpperCase();
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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
