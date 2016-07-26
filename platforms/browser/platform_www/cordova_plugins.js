cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/cordova-plugin-music-controls/www/MusicControls.js",
        "id": "cordova-plugin-music-controls.MusicControls",
        "pluginId": "cordova-plugin-music-controls",
        "clobbers": [
            "MusicControls"
        ]
    },
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
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-music-controls": "1.3",
    "cordova-plugin-battery-status": "1.1.2"
}
// BOTTOM OF METADATA
});