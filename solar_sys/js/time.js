var globalTimeFlag = true;
var useRealTime = true; // Toggle for real-time rotation

var globalTime = {
    absolute: 0,
    relative: 0,
    scale: 1.,
    getAbsolute: function () { return this.absolute; },
    getRelative: function () { return this.relative; },
    getJulianDate: function () {
        const now = new Date();
        return (now / 86400000) - (now.getTimezoneOffset() / 1440) + 2440587.5;
    }
};

window.setInterval(function () {
    if (globalTimeFlag) {
        globalTime.relative += 0.001 * globalTime.scale;
        globalTime.absolute += 0.001;
    }
}, 10);
