#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import time
import threading
import signal
import socket

import mp_config

DNS_INTERVAL = 5
MAX_NAME_SERVER = 20

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
		for server_no in range(1, MAX_NAME_SERVER + 1):
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



class Main:

	def __init__(self):
		self._mp_servers = {}

		self.dnsThread = DnsLookupThread()
		self.dnsThread.start()
		
		while True:
			tim = time.time()
			print tim
			if int(tim) % DNS_INTERVAL == 0:
				if self.dnsThread.is_alive():
					print "running"
				else:
					
		
			time.sleep(1)

if __name__ == "__main__":

	def signal_handler(signal, frame):
		print 'Process killed'
		sys.exit(0)

	signal.signal(signal.SIGINT, signal_handler)
	print 'Press Ctrl-C to stop'

	Main()
