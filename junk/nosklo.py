#!/usr/bin/env python
# -*- coding: utf-8 -*-

# -*- coding: utf-8 -*-
from pprint import pprint
from twisted.internet import defer
from twisted.internet import reactor, protocol
from twisted.protocols import basic
from twisted.python import log
import sys
log.startLogging(sys.stdout)

MAX_SERVERS = 20

class FGPilotsProtocol(basic.LineReceiver):
    delimiter = '\n'
    
    def lineReceived(self, line):
        line = line.strip()
        # parse the line
        if line and not line.startswith("#"):
            parts = line.split()
            pilot = {}
            pilot['callsign'] = parts[0].split("@")[0]
            pilot['ident'] = parts[0]
            pilot['lat'] = parts[1]
            pilot['lng'] = parts[2]
            self.factory.pilots.append(pilot)

    def connectionLost(self, reason):
        self.factory._d.callback(self.factory.pilots)

class FGPilotsFactory(protocol.ClientFactory):
    protocol = FGPilotsProtocol
    def __init__(self, server, readyDeferred):
        self.pilots = []
        self.server = server
        self._d = readyDeferred
    def clientConnectionFailed(self, connector, reason):
        self._d.errback(reason)
    def __repr__(self):
        return '<Connection to %s>' % (self.server,)
        
def fetchServer(server, timeout=5):
    d = defer.Deferred()
    reactor.connectTCP(server, 5001, FGPilotsFactory(server, d), timeout=timeout)
    d.addErrback(lambda failure: failure.getErrorMessage())
    return d

def printResults(results, servers):
    for server, result in zip(servers, results):
        print '**** SERVER:', server
        pprint(result)
    print 'Total pilots retrieved:', sum(len(result) for result in results)
    
if __name__ == '__main__':
    servers = ['mpserver%02d.flightgear.org' % n for n in xrange(1, MAX_SERVERS + 1)]
    dl = defer.gatherResults([fetchServer(server) for server in servers])
    dl.addCallback(printResults, servers)
    dl.addBoth(lambda ign: reactor.stop())
    reactor.run()    