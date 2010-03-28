#!/usr/bin/env python
# -*- coding: utf-8 -*-

import socket
import simplejson as json
import urllib
import urllib2
#import

import config

class DnsLookup:

	def lookup_all(self):
		"""Looks up all servers in range 1 to MAX_NAME_SERVER"""
		results = {}
		for server_no in range(1, config.MAX_NAME_SERVER + 1):
			ok, domain, details = self.lookup(server_no)
			if ok:
				results[domain] = details
		return results

	def lookup(self, server_no):
		"""Looks up a server"""
		domain_name = "mpserver%02d.flightgear.org" % server_no
		try:
			ip_address = socket.gethostbyname(domain_name)
			return True, domain_name,  {'no': server_no, 'ip': ip_address}
		except socket.gaierror, e:
			return False, e, None

	def update_master(self):

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