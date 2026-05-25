// UUID / 雪花ID / 随机Mock数据生成
(function() {
    // 中文姓氏 / 名
    const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎'.split('');
    const GIVEN = ['伟','芳','娜','秀英','敏','静','丽','强','磊','军','洋','勇','艳','杰','娟','涛','明','超','秀兰','霞','平','刚','桂英','建华','宇航','晓东','雨桐','梓涵','子轩','浩然','一鸣','若曦','思琪','嘉怡'];
    const CITIES = ['北京','上海','广州','深圳','杭州','成都','南京','武汉','西安','重庆','苏州','天津','长沙','青岛','大连','厦门','宁波','无锡','合肥','郑州'];
    const DISTRICTS = ['朝阳区','海淀区','西城区','东城区','丰台区','浦东新区','黄浦区','静安区','天河区','越秀区','南山区','福田区','西湖区','武侯区'];
    const STREETS = ['中山路','人民路','解放路','建设路','和平路','光明街','文化街','幸福路','长安街','五一路'];
    const COMPANIES = ['科技','网络','信息','软件','数据','智能','创新','互联网','文化','传媒'];

    function init() {
        const out = document.getElementById('idgen-out');
        if (!out) return;
        const count = document.getElementById('idgen-count');
        const btnUuid = document.getElementById('btn-idgen-uuid');
        const btnUuidNo = document.getElementById('btn-idgen-uuid-nohyphen');
        const btnSnowflake = document.getElementById('btn-idgen-snowflake');
        const btnNano = document.getElementById('btn-idgen-nano');
        const btnPwd = document.getElementById('btn-idgen-pwd');
        const btnSnowDecode = document.getElementById('btn-idgen-snow-decode');
        const snowInput = document.getElementById('idgen-snow-input');
        const snowResult = document.getElementById('idgen-snow-result');
        const btnMock = document.getElementById('btn-idgen-mock');
        const mockType = document.getElementById('idgen-mock-type');
        const btnCopy = document.getElementById('btn-idgen-copy');

        function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
        function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

        function uuidv4() {
            if (crypto && crypto.randomUUID) return crypto.randomUUID();
            // 兼容
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
        }

        // 雪花ID（简化版，BigInt 实现）
        // 64位：1 符号 + 41 时间戳 + 5 数据中心 + 5 机器 + 12 序列
        let lastTs = 0n, seq = 0n;
        const EPOCH = 1577836800000n; // 2020-01-01
        const DATACENTER = 1n, WORKER = 1n;
        function snowflake() {
            let now = BigInt(Date.now());
            if (now === lastTs) {
                seq = (seq + 1n) & 4095n;
                if (seq === 0n) { while (BigInt(Date.now()) === lastTs) {} now = BigInt(Date.now()); }
            } else seq = 0n;
            lastTs = now;
            return ((now - EPOCH) << 22n) | (DATACENTER << 17n) | (WORKER << 12n) | seq;
        }

        function decodeSnowflake(idStr) {
            try {
                const id = BigInt(idStr.trim());
                const seqV = id & 4095n;
                const worker = (id >> 12n) & 31n;
                const dc = (id >> 17n) & 31n;
                const ts = (id >> 22n) + EPOCH;
                const d = new Date(Number(ts));
                return `时间戳: ${ts} (${d.toLocaleString('zh-CN', {hour12:false})})\n数据中心: ${dc}\n机器: ${worker}\n序列: ${seqV}`;
            } catch (e) { return '解析失败: ' + e.message; }
        }

        function nanoid(size = 21) {
            const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
            const bytes = new Uint8Array(size);
            crypto.getRandomValues(bytes);
            let s = '';
            for (let i = 0; i < size; i++) s += alpha[bytes[i] % 64];
            return s;
        }

        function password(len = 16) {
            const sets = ['ABCDEFGHIJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%^&*-_=+'];
            const all = sets.join('');
            let s = sets.map(set => set[Math.floor(Math.random() * set.length)]).join('');
            while (s.length < len) s += all[Math.floor(Math.random() * all.length)];
            return s.split('').sort(() => Math.random() - 0.5).join('');
        }

        function genName() { return rnd(SURNAMES) + rnd(GIVEN); }
        function genPhone() { const p = ['134','135','136','137','138','139','150','151','152','158','159','188','189','187','176','170','198']; return rnd(p) + Array.from({length: 8}, () => rndInt(0, 9)).join(''); }
        function genEmail() {
            const prefixes = ['user', 'dev', 'test', 'admin', 'hello', 'foo', 'bar'];
            const suffix = Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[rndInt(0, 35)]).join('');
            return rnd(prefixes) + suffix + '@' + rnd(['gmail.com', 'qq.com', '163.com', '126.com', 'outlook.com', 'foxmail.com']);
        }
        function genAddress() { return rnd(CITIES) + '市' + rnd(DISTRICTS) + rnd(STREETS) + rndInt(1, 999) + '号'; }
        function genCompany() { return rnd(CITIES) + rnd(['博','创','瑞','德','安','信','华','众','汇']) + rnd(['泰','达','盛','元','源','和','正','通']) + rnd(COMPANIES) + '有限公司'; }
        function genIDCard() {
            // 行政区(6) + 出生(8) + 顺序(3) + 校验
            const region = '110101';
            const year = rndInt(1960, 2005);
            const month = String(rndInt(1, 12)).padStart(2, '0');
            const day = String(rndInt(1, 28)).padStart(2, '0');
            const seq = String(rndInt(0, 999)).padStart(3, '0');
            const body = region + year + month + day + seq;
            const w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
            const codes = ['1','0','X','9','8','7','6','5','4','3','2'];
            let sum = 0;
            for (let i = 0; i < 17; i++) sum += parseInt(body[i]) * w[i];
            return body + codes[sum % 11];
        }
        function genIP() { return [rndInt(1, 223), rndInt(0, 255), rndInt(0, 255), rndInt(1, 254)].join('.'); }
        function genDate() { const y = rndInt(2020, 2025); const m = String(rndInt(1,12)).padStart(2,'0'); const d = String(rndInt(1,28)).padStart(2,'0'); return `${y}-${m}-${d}`; }

        function gen(fn) {
            const n = parseInt(count.value) || 10;
            const arr = [];
            for (let i = 0; i < n; i++) arr.push(typeof fn === 'function' ? fn() : fn);
            out.value = arr.join('\n');
        }

        btnUuid && btnUuid.addEventListener('click', () => gen(() => uuidv4()));
        btnUuidNo && btnUuidNo.addEventListener('click', () => gen(() => uuidv4().replace(/-/g, '')));
        btnSnowflake && btnSnowflake.addEventListener('click', () => gen(() => snowflake().toString()));
        btnNano && btnNano.addEventListener('click', () => gen(() => nanoid()));
        btnPwd && btnPwd.addEventListener('click', () => gen(() => password(16)));
        btnSnowDecode && btnSnowDecode.addEventListener('click', () => { snowResult.textContent = decodeSnowflake(snowInput.value); });

        btnMock && btnMock.addEventListener('click', () => {
            const t = mockType.value;
            const fns = { name: genName, phone: genPhone, email: genEmail, address: genAddress, company: genCompany, idcard: genIDCard, ip: genIP, date: genDate };
            const fn = fns[t];
            if (!fn) return;
            gen(fn);
        });
        btnCopy && btnCopy.addEventListener('click', () => {
            if (!out.value) return;
            navigator.clipboard.writeText(out.value).then(() => showToast && showToast('已复制', 'success'));
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
