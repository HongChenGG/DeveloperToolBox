// IP / CIDR 网络计算器
(function() {
    const IPV4_MAX_INTEGER = 4294967295n;

    function parseIpv4Address(text) {
        const normalizedText = String(text ?? '').trim();
        if (!/^\d+\.\d+\.\d+\.\d+$/.test(normalizedText)) throw new Error('IP 格式错误');

        let integer = 0n;
        for (const octetText of normalizedText.split('.')) {
            const octet = Number(octetText);
            if (!Number.isInteger(octet) || octet < 0 || octet > 255) throw new Error('IP 格式错误');
            integer = (integer << 8n) | BigInt(octet);
        }
        return integer;
    }

    function parseIpv4Integer(value) {
        let integer;
        if (typeof value === 'bigint') {
            integer = value;
        } else if (typeof value === 'number') {
            if (!Number.isSafeInteger(value)) throw new Error('IPv4 整数格式错误');
            integer = BigInt(value);
        } else {
            const normalizedText = String(value ?? '').trim();
            if (!/^(?:0[xX][0-9A-Fa-f]+|\d+)$/.test(normalizedText)) {
                throw new Error('IPv4 整数格式错误');
            }
            integer = BigInt(normalizedText);
        }

        if (integer < 0n || integer > IPV4_MAX_INTEGER) throw new Error('IPv4 整数超出范围');
        return integer;
    }

    function formatIpv4Integer(value) {
        const integer = parseIpv4Integer(value);
        return [24n, 16n, 8n, 0n]
            .map(shift => Number((integer >> shift) & 255n))
            .join('.');
    }

    function summarizeIpv4Range(startAddress, endAddress, maximumCidrs = 4096) {
        const start = parseIpv4Address(startAddress);
        const end = parseIpv4Address(endAddress);
        if (start > end) throw new Error('起始 IP 大于结束 IP');
        if (!Number.isInteger(maximumCidrs) || maximumCidrs <= 0) throw new Error('CIDR 结果上限无效');

        const cidrs = [];
        let current = start;
        while (current <= end) {
            let blockSize = current === 0n ? 1n << 32n : current & -current;
            const remainingAddresses = end - current + 1n;
            while (blockSize > remainingAddresses) blockSize >>= 1n;

            const prefixLength = 32 - (blockSize.toString(2).length - 1);
            cidrs.push(`${formatIpv4Integer(current)}/${prefixLength}`);
            if (cidrs.length > maximumCidrs) {
                throw new Error(`CIDR 结果超过 ${maximumCidrs} 条，请缩小 IP 范围`);
            }
            current += blockSize;
        }

        return {
            start,
            end,
            count: end - start + 1n,
            cidrs
        };
    }

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
            return Number(parseIpv4Address(ip));
        }
        function intToIp(n) {
            return formatIpv4Integer(n);
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
                const match = text.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
                if (!match) throw new Error('请输入 IP 范围，如 192.168.1.0-192.168.1.255');
                const summary = summarizeIpv4Range(match[1], match[2]);
                rangeOut.innerHTML =
                    row('起始 IP', formatIpv4Integer(summary.start)) +
                    row('结束 IP', formatIpv4Integer(summary.end)) +
                    row('IP 数量', summary.count.toLocaleString()) +
                    row('最小 CIDR 集合', summary.cidrs.join('<br>'));
            } catch (e) {
                rangeOut.innerHTML = '<span style="color:var(--danger-color)">' + e.message + '</span>';
            }
        }

        function calcConv() {
            try {
                const text = convInput.value.trim();
                let ip;
                if (text.includes('.')) ip = parseIpv4Address(text);
                else ip = parseIpv4Integer(text);
                convOut.innerHTML =
                    row('点分十进制', formatIpv4Integer(ip)) +
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

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            formatIpv4Integer,
            parseIpv4Address,
            parseIpv4Integer,
            summarizeIpv4Range
        };
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    }
})();
