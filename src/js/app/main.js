define([
    'iframe-messenger'
], function(
    iframeMessenger
) {
   'use strict';

    function app(el) {
    }

    function init(el) {
        // Enable iframe resizing on the GU site
        iframeMessenger.enableAutoResize();

        app(el);
    }

    return {
        init: init
    };
});
