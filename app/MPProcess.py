# -*- coding: utf-8 -*-

import signal
import threading
import time

import config

class MPProcess(threading.Thread):

	def __init__(self):
		
		self._mp_servers = {}
		self.dns_timer = None 
		threading.Thread.__init__(self)

	def run(self):
		
		#pass
		if self.dns_timer == None:
			print "DNS_ timer start"
			self.dns_timer = threading.Timer(config.DNS_INTERVAL, self.do_dns_scan)
			self.dns_timer.start()

		while True:
			time.sleep(1)

	def servers(self):
		return self._mp_servers


	def do_dns_scan(self):
		print "\tdo_dns_scan"
		print self.dns_timer