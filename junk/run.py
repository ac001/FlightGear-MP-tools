#!/usr/bin/env python
# -*- coding: utf-8 -*-

from twisted.internet import reactor, threads

def dns_lookup(foo):
	print "foo"

commands = [(dns_lookup, ['foo'], {})]

threads.callMultipleInThread(commands)
reactor.run()


		