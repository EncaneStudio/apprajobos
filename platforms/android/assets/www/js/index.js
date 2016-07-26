/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
	console.log(MusicControls.create({
    track       : 'Time is Running Out',        // optional, default : ''
    artist      : 'Muse',                       // optional, default : ''
    cover       : 'albums/absolution.jpg',      // optional, default : nothing
    // cover can be a local path (use fullpath 'file:///storage/emulated/...', or only 'my_image.jpg' if my_image.jpg is in the www folder of your app)
    //           or a remote url ('http://...', 'https://...', 'ftp://...')
    isPlaying   : true,                         // optional, default : true
    dismissable : true,                         // optional, default : false

    // hide previous/next/close buttons:
    hasPrev   : false,      // show previous button, optional, default: true
    hasNext   : false,      // show next button, optional, default: true
    hasClose  : true,       // show close button, optional, default: false

    // Android only, optional
    // text displayed in the status bar when the notification (and the ticker) are updated
    ticker    : 'Now playing "Time is Running Out"'
}, onSuccess, onError));
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {}
};
