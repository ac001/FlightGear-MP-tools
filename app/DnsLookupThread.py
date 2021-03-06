#!/usr/bin/env python
# -*- coding: utf-8 -*-

import socket
import simplejson as json
import urllib
import urllib2
import threading

import config

class DnsLookupThread(threading.Thread):

	def __init__(self):
		threading.Thread.__init__(self)
		print "\t#Init DNS"

	def run(self):
		print "\t>> DNS Lookup"
		servers = self.lookup_all()
		print "\t\t<< %s servers" % len(servers)

	def lookup_all(self):
		"""Looks up all servers in range 1 to MAX_NAME_SERVER"""
		print "\tLookup All"
		results = {}
		for server_no in range(1, config.MAX_NAME_SERVER + 1):
			ok, domain, details = self.lookup(server_no)
			if ok:
				results[domain] = details
		return results

	def lookup(self, server_no):
		"""Looks up a server"""
		domain_name = "mpserver%02d.flightgear.org" % server_no
		print "\tLookup: %s" % domain_name
		try:
			ip_address = socket.gethostbyname(domain_name)
			return True, domain_name,  {'no': server_no, 'ip': ip_address}
		except socket.gaierror, e:
			return False, e, None

	def update_master(self):
		print "\tUpdate DNS to Master"
		## dump servers into a json string
		request_vars = {}
		request_vars['servers'] =  json.dumps(self.lookup_all())
		request_vars['max_server'] = config.MAX_NAME_SERVER
		payload = urllib.urlencode( request_vars )

		## send update
		request = urllib2.Request(config.UPDATE_DNS, payload)
		try:
			response = urllib2.urlopen(request)

		except urllib2.URLError, e: 
			if hasattr(e, 'reason'):
				print "   URL =", e.reason, config.UPDATE_DNS
				return False
			elif hasattr(e, 'code'):
				print "   HTTP =", e.code, config.UPDATE_DNS
				#print BaseHTTPServer.BaseHTTPRequestHandler.responses

		else:
			print response.read()