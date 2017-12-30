"use strict";

const request = require('request');
const Base64 = require('js-base64').Base64;

/**
 * A zato.service.invoke client that handles only JSON payloads and JSON responses.
 * 
 * @param {string} url 
 * @param {string} username 
 * @param {string} password 
 */
function ZatoClient(url, username, password) {
    this._url = url;
    this._username = username;
    this._password = password;
    this._request = request.defaults({
        baseUrl: url,
        url: this.INVOKE_SERVICE_SUFFIX,
        method: 'POST',
        agent: this.USER_AGENT,
        auth: {
            user: username,
            pass: password,
            sendImmediately: true // Don't waste a roundtrip on HTTP 401.
        }
    });
}

ZatoClient.prototype = {
    INVOKE_SERVICE_SUFFIX: "/zato/admin/invoke",
    USER_AGENT: 'zato_client.js',
    CHANNEL: 'invoke',
    DEFAULT_EXPIRATION: 15,  // zato/common/__init__.py::BROKER.DEFAULT_EXPIRATION
    PING_SERVICE_NAME: 'zato.ping',

    /**
     * Arrange for a request to be made through the admin.invoke mechanism. The only
     * supported request and response data format is JSON.
     * 
     * @param {string} serviceName  Name of the service to invoke.
     * @param {object} payload  JSON-serializable payload.
     */
    _invoke: function(serviceName, payload) {
        var payloadJson = JSON.stringify(payload || {});
    
        var jsonPayload = {
            name: serviceName,
            payload: Base64.encode(payloadJson),
            channel: this.CHANNEL,
            data_format: 'json',
            transport: null,
            async: false,
            expiration: this.DEFAULT_EXPIRATION,
            pid: null,
        };

        return this._request({
            json: payload
        });
    },

    /**
     * Arrange for a dummy request to be made through the admin.invoke mechanism.
     */
    ping() {
        return this._invoke(this.PING_SERVICE_NAME);
    }
};


module.exports = ZatoClient;