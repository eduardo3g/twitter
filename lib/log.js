const dayjs = require('dayjs');
module.exports = (function (c) {
    let log = function (a, t, f) {
        let location = ((new Error().stack).split('at ')[3]).trim();
        let func = location.substr(0, location.indexOf(' (')) + '()';
        const pos = location.lastIndexOf('/') + 1;
        location = location.substr(pos, location.lastIndexOf(':') - pos);

        let args = [dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), t, location];
        for (let i = 0; i < a.length; ++i) {
            args.push(a[i]);
        }
        f.apply(c, args);
    };

    return {
        t: function (...args) {
            log(args, '[T]', c.trace);
        },
        d: function (...args) {
            log(args, '[D]', c.debug);
        },
        i: function (...args) {
            log(args, '[I]', c.info);
        },
        w: function (...args) {
            log(args, '[W]', c.warn);
        },
        e: function (...args) {
            log(args, '[E]', c.error);
        },
        l: function (...args) {
            log(args, '[L]', c.log);
        },
    };
}(console));
