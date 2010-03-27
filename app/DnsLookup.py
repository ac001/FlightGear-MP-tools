#!/usr/bin/env python
# -*- coding: utf-8 -*-

import socket

import config

class DnsLookup:

	def lookup_all(self):
		"""Looks up all servers in range 1 to MAX_NAME_SERVER"""
		results = []
		for server_no in range(1, config.MAX_NAME_SERVER + 1):
			ok, host_info = self.lookup(server_no)
			if ok:
				results.append(host_info)
		return results

	def lookup(self, server_no):
		"""Looks up a server"""
		domain_name = "mpserver%02d.flightgear.org" % server_no
		try:
			ip_address = socket.gethostbyname(domain_name)
			return True, {domain_name: ip_address}
		except socket.gaierror, e:
			return False, e
