# -*- coding: utf-8 -*-

"""
Copyright (C) 2026, Zato Source s.r.o. https://zato.io

Licensed under AGPLv3, see LICENSE.txt for terms and conditions.
"""

# stdlib
from argparse import ArgumentParser
from base64 import b64decode, b64encode
from http.client import INTERNAL_SERVER_ERROR, NOT_FOUND, OK, UNAUTHORIZED
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from json import dumps, loads
from threading import Lock
from typing import Any

# ################################################################################################################################
# ################################################################################################################################

any_           = Any
stranydict     = dict[str, any_]
stranydictlist = list[stranydict]

# ################################################################################################################################
# ################################################################################################################################

_host = '127.0.0.1'

# The path an IDE plugin posts to and the path the test reads the recorded requests from
_deploy_path   = '/ide-deploy'
_requests_path = '/requests'

# What the hot-deploy service replies with, element name and messages alike
_response_element   = 'zato_ide_deploy_create_response'
_msg_server_reached = 'OK, server reached'
_msg_deployed       = 'OK, deployed to server'

# What a server whose hot-deploy service requires a payload replies to an empty body
_msg_missing_input = 'Element `payload_name` missing on input'

# A payload name that is answered with success=false, the way a service can report a failed deployment
_failing_payload_name  = 'fail_me.py'
_msg_simulated_failure = 'Simulated failure'

_content_type_json = 'application/json'
_content_type_text = 'text/plain'

_auth_challenge = 'Basic realm="Zato"'

# ################################################################################################################################
# ################################################################################################################################

class _ServerState:
    """ Credentials to check against and everything the server has received so far.
    """

    def __init__(self, username:'str', password:'str', reject_empty_body:'bool') -> 'None':

        credentials = f'{username}:{password}'
        encoded = b64encode(credentials.encode()).decode()

        self.expected_auth = f'Basic {encoded}'
        self.reject_empty_body = reject_empty_body
        self.lock = Lock()
        self.requests:'stranydictlist' = []

# ################################################################################################################################

    def record(self, item:'stranydict') -> 'None':
        with self.lock:
            self.requests.append(item)

# ################################################################################################################################

    def snapshot(self) -> 'stranydictlist':
        with self.lock:
            out = list(self.requests)
            return out

# ################################################################################################################################
# ################################################################################################################################

class _Handler(BaseHTTPRequestHandler):
    """ Answers the way a Zato server's /ide-deploy channel does and records what it received.
    """
    state:'_ServerState'

# ################################################################################################################################

    def _send(self, status:'int', content_type:'str', body:'bytes') -> 'None':

        body_length = len(body)

        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(body_length))
        self.end_headers()
        _ = self.wfile.write(body)

# ################################################################################################################################

    def _send_json(self, success:'bool', msg:'str') -> 'None':

        response = {
            _response_element: {
                'success': success,
                'msg': msg,
            }
        }
        body = dumps(response).encode()

        self._send(OK, _content_type_json, body)

# ################################################################################################################################

    def _send_unauthorized(self) -> 'None':

        body = b'Unauthorized'
        body_length = len(body)

        self.send_response(UNAUTHORIZED)
        self.send_header('WWW-Authenticate', _auth_challenge)
        self.send_header('Content-Type', _content_type_text)
        self.send_header('Content-Length', str(body_length))
        self.end_headers()
        _ = self.wfile.write(body)

# ################################################################################################################################

    def _read_body(self) -> 'bytes':

        content_length = self.headers['Content-Length']
        content_length = int(content_length)

        out = self.rfile.read(content_length)
        return out

# ################################################################################################################################

    def do_GET(self) -> 'None':

        # The test reads back everything received so far ..
        if self.path == _requests_path:
            snapshot = self.state.snapshot()
            body = dumps(snapshot).encode()
            self._send(OK, _content_type_json, body)

        # .. and nothing else is served.
        else:
            self._send(NOT_FOUND, _content_type_text, b'Not found')

# ################################################################################################################################

    def do_POST(self) -> 'None':

        # Only the deploy channel accepts requests ..
        if self.path != _deploy_path:
            self._send(NOT_FOUND, _content_type_text, b'Not found')
            return

        # .. the body is read before anything is answered so the connection stays in step ..
        body = self._read_body()

        # .. the header is absent when the plugin sends no credentials at all.
        auth_header = self.headers.get('Authorization')
        auth_ok = auth_header == self.state.expected_auth

        item:'stranydict' = {
            'path': self.path,
            'auth_ok': auth_ok,
            'payload_name': '',
            'source': '',
        }

        # Wrong credentials are recorded and challenged ..
        if not auth_ok:
            self.state.record(item)
            self._send_unauthorized()
            return

        data = loads(body)

        # .. a file name with a payload is a deployment ..
        if payload_name := data.get('payload_name'):

            source = b64decode(data['payload']).decode('utf8')
            item['payload_name'] = payload_name
            item['source'] = source
            self.state.record(item)

            if payload_name == _failing_payload_name:
                self._send_json(False, _msg_simulated_failure)
            else:
                self._send_json(True, _msg_deployed)

        # .. and an empty body is a connection test, answered either the way a server that requires
        # a payload does or the way a server that recognises the test does.
        else:
            self.state.record(item)

            if self.state.reject_empty_body:
                self._send(INTERNAL_SERVER_ERROR, _content_type_text, _msg_missing_input.encode())
            else:
                self._send_json(True, _msg_server_reached)

# ################################################################################################################################
# ################################################################################################################################

def main() -> 'None':

    parser = ArgumentParser()
    _ = parser.add_argument('port', type=int)
    _ = parser.add_argument('username')
    _ = parser.add_argument('password')
    _ = parser.add_argument('--reject-empty-body', action='store_true')
    args = parser.parse_args()

    _Handler.state = _ServerState(args.username, args.password, args.reject_empty_body)

    server = ThreadingHTTPServer((_host, args.port), _Handler)

    # The bound port is printed once the socket is open, which is what the test waits for.
    print(f'listening {_host}:{server.server_port}', flush=True)

    server.serve_forever()

# ################################################################################################################################
# ################################################################################################################################

if __name__ == '__main__':
    main()

# ################################################################################################################################
# ################################################################################################################################
