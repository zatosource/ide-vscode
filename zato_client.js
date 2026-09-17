'use strict';

const axios = require('axios').default;
const Base64 = require('js-base64').Base64;

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;

const MSG = {
    PING_OK: 'Zato server connection pinged OK.',
    BAD_CREDENTIALS: 'The Zato server rejected the username or password',
    NO_CHANNEL: 'No /ide-deploy channel at this address',
    HTTP_STATUS: 'Server returned HTTP status ',
    SERVER_FAILURE: 'Server indicated failure: '
};

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

// Every HTTP status is delivered to the response handler rather than thrown.
function acceptAnyStatus() {
    return true;
}

ZatoClient.prototype = {
    IDE_DEPLOY_SERVICE_SUFFIX: '/ide-deploy',

    /**
     * Turns an axios error into one line naming what failed and the URL that was tried.
     *
     * @param {Error} error
     * @returns {string}
     */
    describeError: function(error) {

        var out;

        // An HTTP response came back with an error status ..
        if(error.response) {
            out = MSG.HTTP_STATUS + error.response.status + ' - ' + error.response.data + ' - ' + this._url;
        }

        // .. or the connection itself failed, with a code either on the error or on the first of its members.
        else {
            var code = error.code;
            if(!code) {
                if(error.errors) {
                    code = error.errors[0].code;
                }
            }
            if(!code) {
                code = error.message;
            }
            out = code + ' - ' + this._url;
        }

        return out;
    },

    _onRequestError: function(onFailure, error) {
        var description = this.describeError(error);
        onFailure(description);
    },

    /**
     * Arrange for a dummy request to be made through the admin.invoke mechanism.
     *
     * @param {function} onSuccess
     *      Callback invoked as onSuccess(msg) on success.
     * @param {function} onFailure
     *      Callback invoked as onFailure(msg) on failure.
     */
    ping: function(onSuccess, onFailure) {
        (
        axios.post(this._url, {}, {
            auth: {
                username: this._username,
                password: this._password
            },
            validateStatus: acceptAnyStatus
            })
        .then(this._onPingResponse.bind(this, onSuccess, onFailure))
        .catch(this._onRequestError.bind(this, onFailure))
        );
    },

    _onPingResponse: function(onSuccess, onFailure, response) {

        var status = response.status;

        // A server whose hot-deploy service answers an empty body replies with its own message ..
        if(status === HTTP_OK) {
            onSuccess(response.data.zato_ide_deploy_create_response.msg);
        }

        // .. the credentials were not accepted ..
        else if(status === HTTP_UNAUTHORIZED) {
            onFailure(MSG.BAD_CREDENTIALS + ' - ' + this._url);
        }

        // .. nothing is mounted at this path ..
        else if(status === HTTP_NOT_FOUND) {
            onFailure(MSG.NO_CHANNEL + ' - ' + this._url);
        }

        // .. any other status came from the channel itself, so the server was reached and the credentials
        // were accepted - a server whose hot-deploy service requires a payload rejects an empty body this way.
        else {
            onSuccess(MSG.PING_OK);
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
     *      Callback invoked as onFailure(msg) on failure.
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
        .catch(this._onRequestError.bind(this, onFailure))
        );
    },

    _onDeployResponse: function(onSuccess, onFailure, response)
    {
        var result = response.data.zato_ide_deploy_create_response;

        if(result.success) {
            onSuccess(result.msg);
        } else {
            onFailure(MSG.SERVER_FAILURE + result.msg);
        }
    }
};


module.exports = ZatoClient;
