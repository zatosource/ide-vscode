"use strict";

const request = require('request-promise-native');
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
        },
        json: true,
        resolveWithFullResponse: true
    });
}

ZatoClient.prototype = {
    IDE_DEPLOY_SERVICE_SUFFIX: "/ide-deploy",

    /**
     * Arrange for a dummy request to be made through the admin.invoke mechanism.
     *
     * @param {function} onSuccess
     *      Callback invoked as onSuccess(msg) on success.
     * @param {function} onFailure
     *      Callback invoked as onFailure(e) on failure. The passed
     *      argument may be used as an internal diagnostic only.
     */
    ping: function(onSuccess, onFailure) {
        (this._request({})
            .then(this._onPingResponse.bind(this, onSuccess, onFailure))
            .catch(onFailure));
    },

    _onPingResponse: function(onSuccess, onFailure, response) {
        if(response.statusCode != 200) {
            console.log("_onPingResponse: status!=200: %o", response);
            onFailure('Cluster returned HTTP status ' + response.statusCode);
        } else if(! response.body.zato_ide_deploy_create_response.success) {
            console.log("_onPingResponse: success=false: %o", response.body);
            onFailure('Cluster indicated failure: ' + response.body.zato_ide_deploy_create_response.msg);
        } else {
            onSuccess(response.body.zato_ide_deploy_create_response.msg);
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
     *      Callback invoked as onSuccess(msg) on success.
     * @param {function} onFailure
     *      Callback invoked as onFailure(e) on failure. The passed
     *      argument may be used as an internal diagnostic only.
     */
    deploy: function(filename, data, onSuccess, onFailure)
    {
        var json = {
            payload_name: filename,
            payload: Base64.encode(data)
        };

        (this._request({json: json})
            .then(this._onDeployResponse.bind(this, onSuccess, onFailure))
            .catch(onFailure));
    },

    _onDeployResponse: function(onSuccess, onFailure, response)
    {
        console.log("_onDeployResponse %o", response);
        if(response.statusCode != 200) {
            console.log("_onDeployResponse: status!=200: %o", response);
            onFailure('Cluster returned HTTP status ' + response.statusCode);
        } else if(! response.body.zato_ide_deploy_create_response.success) {
            console.log("_onPingResponse: success=false: %o", response.body);
            onFailure('Cluster indicated failure: ' + response.body.zato_ide_deploy_create_response.msg);
        } else {
            onSuccess(response.body.zato_ide_deploy_create_response.msg);
        }
    }
};


module.exports = ZatoClient;
