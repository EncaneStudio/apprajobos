cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/cordova-plugin-battery-status/www/battery.js",
        "id": "cordova-plugin-battery-status.battery",
        "pluginId": "cordova-plugin-battery-status",
        "clobbers": [
            "navigator.battery"
        ]
    },
    {
        "file": "plugins/cordova-plugin-battery-status/src/browser/BatteryProxy.js",
        "id": "cordova-plugin-battery-status.Battery",
        "pluginId": "cordova-plugin-battery-status",
        "runs": true
    },
    {
        "file": "plugins/cordova-plugin-nowplaying/www/NowPlaying.js",
        "id": "cordova-plugin-nowplaying.NowPlaying",
        "pluginId": "cordova-plugin-nowplaying",
        "clobbers": [
            "window.NowPlaying"
        ]
    },
    {
        "file": "plugins/cordova-plugin-nowplaying/src/browser/MNowPlaying.js",
        "id": "cordova-plugin-nowplaying.MNowPlaying",
        "pluginId": "cordova-plugin-nowplaying",
        "clobbers": [
            "window.NowPlaying"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-battery-status": "1.1.2",
    "cordova-plugin-nowplaying": "1.0.0"
}
// BOTTOM OF METADATA
});