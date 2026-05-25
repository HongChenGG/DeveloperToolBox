// IP / CIDR 网络计算器
(function() {
    function init() {
        const cidrInput = document.getElementById('ip-cidr-input');
        if (!cidrInput) return;
        const cidrOut = document.getElementById('ip-cidr-out');
        const btnCidr = document.getElementById('btn-ip-cidr');
        const rangeInput = document.getElementById('ip-range-input');
        const rangeOut = document.getElementById('ip-range-out');
        const btnRange = document.getElementById('btn-ip-range');
        const convInput = document.getElementById('ip-conv-input');
        const convOut = document.getElementById('ip-conv-out');
        const btnConv = document.getElementById('btn-ip-conv');

        function ipToInt(ip) {
            const p = ip.split('.').map(Number);
            if (p.length !== 4 || p.some(n => isNaN(n) || n < 0 || n > 255)) throw new Error('IP 格式错误');
            return (p[0] << 24 >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
        }
        function intToIp(n) {
            return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
        }
        function row(label, val) {
            return `<div style="display:flex;padding:6px 10px;background:var(--bg-darker);border-radius:4px;margin-bottom:4px;font-family:monospace;font-size:13px">
                <span style="color:var(--text-secondary);width:140px;flex-shrink:0">${label}</span>
                <span style="color:var(--text-primary);flex:1;word-break:break-all">${val}</span>
            </div>`;
        }

        function calcCidr() {
            try {
                const text = cidrInput.value.trim();
                const m = text.match(/^([\d.]+)\/(\d+)$/);
                if (!m) throw new Error('请输入 CIDR 格式，如 192.168.1.0/24');
                const ip = ipToInt(m[1]);
                const prefix = parseInt(m[2]);
                if (prefix < 0 || prefix > 32) throw new Error('掩码位 0-32');
                const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
                const network = (ip & mask) >>> 0;
                const broadcast = (network | (~mask >>> 0)) >>> 0;
                const total = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.pow(2, 32 - prefix);
                const usable = total > 2 ? total - 2 : total;
                const firstHost = total > 2 ? network + 1 : network;
                const lastHost = total > 2 ? broadcast - 1 : broadcast;
                const wildcard = (~mask >>> 0);
                // 类
                const first = (network >>> 24);
                let cls = 'D/E（保留）';
                if (first < 128) cls = 'A';
                else if (first < 192) cls = 'B';
                else if (first < 224) cls = 'C';
                else if (first < 240) cls = 'D（组播）';
                // 私有
                const isPrivate = first === 10 || (first === 172 && ((network >>> 16) & 0xff) >= 16 && ((network >>> 16) & 0xff) <= 31) || (first === 192 && ((network >>> 16) & 0xff) === 168);

                cidrOut.innerHTML =
                    row('CIDR', `${intToIp(network)}/${prefix}`) +
                    row('网络地址', intToIp(network)) +
                    row('广播地址', intToIp(broadcast)) +
                    row('子网掩码', intToIp(mask)) +
                    row('反掩码 (Wildcard)', intToIp(wildcard)) +
                    row('掩码二进制', mask.toString(2).padStart(32, '0').match(/.{8}/g).join('.')) +
                    row('可用主机数', usable.toLocaleString() + ' / 总 ' + total.toLocaleString()) +
                    row('可用主机范围', total > 2 ? intToIp(firstHost) + ' ~ ' + intToIp(lastHost) : '(无)') +
                    row('IP 类别', cls + (isPrivate ? ' [私有地址]' : ' [公网]'));
            } catch (e) {
                cidrOut.innerHTML = '<span style="color:var(--danger-color)">' + e.message + '</span>';
            }
        }

        function calcRange() {
            try {
                const text = rangeInput.value.trim();
                const m = text.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
                if (!m) throw new Error('请输入 IP 范围，如 192.168.1.0-192.168.1.255');
                const a = ipToInt(m[1]), b = ipToInt(m[2]);
                if (a > b) throw new Error('起始 IP 大于结束 IP');
                const count = b - a + 1;
                // 求最小 CIDR 集合
                const cidrs = [];
                let cur = a;
                while (cur <= b) {
                    let maxSize = 32;
                    while (maxSize > 0) {
                        const mask = maxSize === 0 ? 0 : (0xffffffff << (32 - maxSize + 1)) >>> 0;
                        if ((cur & mask) !== cur) break;
                        if ((cur + Math.pow(2, 32 - maxSize + 1) - 1) > b) break;
                        maxSize--;
                    }
                    cidrs.push(intToIp(cur) + '/' + maxSize);
                    cur += Math.pow(2, 32 - maxSize);
                    if (cur > 0xffffffff) break;
                }
                rangeOut.innerHTML =
                    row('起始 IP', intToIp(a)) +
                    row('结束 IP', intToIp(b)) +
                    row('IP 数量', count.toLocaleString()) +
                    row('最小 CIDR 集合', cidrs.join('<br>'));
            } catch (e) {
                rangeOut.innerHTML = '<span style="color:var(--danger-color)">' + e.message + '</span>';
            }
        }

        function calcConv() {
            try {
                const text = convInput.value.trim();
                let ip;
                if (text.includes('.')) ip = ipToInt(text);
                else if (/^0x/.test(text)) ip = parseInt(text, 16) >>> 0;
                else if (/^\d+$/.test(text)) ip = parseInt(text) >>> 0;
                else throw new Error('无法识别格式');
                if (ip > 0xffffffff) throw new Error('超出 IPv4 范围');
                convOut.innerHTML =
                    row('点分十进制', intToIp(ip)) +
                    row('十进制整数', ip.toString()) +
                    row('十六进制', '0x' + ip.toString(16).toUpperCase().padStart(8, '0')) +
                    row('二进制', ip.toString(2).padStart(32, '0').match(/.{8}/g).join('.'));
            } catch (e) {
                convOut.innerHTML = '<span style="color:var(--danger-color)">' + e.message + '</span>';
            }
        }

        btnCidr && btnCidr.addEventListener('click', calcCidr);
        btnRange && btnRange.addEventListener('click', calcRange);
        btnConv && btnConv.addEventListener('click', calcConv);
        cidrInput && cidrInput.addEventListener('keydown', e => { if (e.key === 'Enter') calcCidr(); });
        rangeInput && rangeInput.addEventListener('keydown', e => { if (e.key === 'Enter') calcRange(); });
        convInput && convInput.addEventListener('keydown', e => { if (e.key === 'Enter') calcConv(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
