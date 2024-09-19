"use strict";

const axios = require('axios').default;
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
        (
        axios.post(this._url, {}, {
            auth: {
                username: this._username,
                password: this._password
            }
            })
        .then(this._onPingResponse.bind(this, onSuccess, onFailure))
        .catch(onFailure)
        );
    },

    _onPingResponse: function(onSuccess, onFailure, response) {
        if(response.status != 200) {
            console.log("_onPingResponse: status!=200: %o", response.data);
            onFailure('Server returned HTTP status ' + response.status);
        } else {
            console.log("_onPingResponse.status OK: %o", response.status);
            onSuccess(response.data.zato_ide_deploy_create_response.msg);
        }
    },

    /**
     * Arrange for a source file to be hot-deployed to the server.
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

        (
        axios.post(this._url, json, {
            auth: {
              username: this._username,
              password: this._password
            }
          })
        .then(this._onDeployResponse.bind(this, onSuccess, onFailure))
        .catch(onFailure)
        );
    },

    _onDeployResponse: function(onSuccess, onFailure, response)
    {

        console.log("_onDeployResponse.status %o", response.status);
        if(response.status != 200) {
            console.log("_onDeployResponse: status!=200: %o", response.data);
            onFailure('Server returned HTTP status ' + response.status);
        } else if(! response.data.zato_ide_deploy_create_response.success) {
            console.log("_onPingResponse: success=false: %o", response.data);
            onFailure('Server indicated failure: ' + response.data.zato_ide_deploy_create_response.msg);
        } else {
            onSuccess(response.data.zato_ide_deploy_create_response.msg);
        }
    }
};


module.exports = ZatoClient;
