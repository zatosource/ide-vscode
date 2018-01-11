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
        url: this.IDE_DEPLOY_SERVICE_SUFFIX,
        auth: {
            user: username,
            pass: password,
            sendImmediately: true // Don't waste a roundtrip on HTTP 401.
        }
    });
}

ZatoClient.prototype = {
    IDE_DEPLOY_SERVICE_SUFFIX: "/zato/ide-deploy",

    /**
     * Arrange for a dummy request to be made through the admin.invoke mechanism.
     */
    ping: function(onSuccess, onFailure) {
        (this._request({})
            .on("error", onFailure)
            .on("response", this._onPingResponse.bind(this, onSuccess, onFailure)));
    },

    _onPingResponse: function(onSuccess, onFailure, response) {
        if(response.statusCode == 200) {
            onSuccess();
        } else {
            console.log("_onPingResponse: status!=200: %s", response);
            onFailure();
        }
    },

    /**
     * Arrange for a source file to be hot-deployed to the cluster.
     * 
     * @param {string} filename
     *      File name to deploy.
     * @param {string} data
     *      File contents.
     * @param {function} onSuccess
     *      Callback invoked as onSuccces() on success.
     * @param {function} onFailure
     *      Callback invoked as onFailure() on failure. Currently no diagnostic is returned.
     */
    deploy: function(filename, data, onSuccess, onFailure)
    {
        (this._request(
            {
                json: {
                    payload_name: filename,
                    payload: Base64.encode(data)
                }
            })
            .on("response", this._onDeployResponse.bind(this, onSuccess, onFailure))
            .on("error", this._onDeployError.bind(this, onFailure))
        );
    },

    _onDeployResponse: function(onSuccess, onFailure, response)
    {
        if(response.statusCode == 200) {
            onSuccess();
        } else {
            console.log("_onDeployResponse: status!=200: %o", response);
            onFailure();
        }
    },

    _onDeployError: function(onFailure, error)
    {
        console.log("_onDeployError: " + error);
        onFailure();
    }
};


module.exports = ZatoClient;