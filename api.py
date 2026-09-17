# -*- coding: utf-8 -*-
# zato: ide-deploy=True

# Zato
from zato.server.service import Service

class MyService(Service):
    def handle(self):
        self.response.payload = 'Hello!'
