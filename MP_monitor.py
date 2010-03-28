#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import signal
import socket
from PyQt4 import QtCore

MAX_NAME_SERVER = 30
DNS_INTERVAL = 5 # seconds


###############################################
## Thread that looks up the DNS servers
###############################################
class DnsLookupThread(QtCore.QThread):

	def __init__(self, parent):
		QtCore.QThread.__init__(self, parent)
		#print "\t#Init DNS"

		self.timer = QtCore.QTimer(self)
		self.timer.setInterval(DNS_INTERVAL * 1000)
		self.connect(self.timer, QtCore.SIGNAL("timeout()"), self.on_timer)

		self.hosts = {}
		self.ips = {}
		#self.lookup_running = False

	def run(self):
		print "\t>> DNS Thread Started"
		#self.timer.start()
		#return
		servers = self.lookup_all()
		print "\t\t<< %s servers" % len(servers)
		return

	def on_timer(self):
		if self.lookup_running == False:
			print "run lookup"
			self.lookup_running == True
			self.timer.stop()
			servers = self.lookup_all()
			self.lookup_running == False
			#self.timer.start()
		else:
			print "lookup running"

	def lookup_all(self):
		"""Looks up all servers in range 1 to MAX_NAME_SERVER"""
		print "\tLookup All"
		results = {}
		for server_no in range(1, MAX_NAME_SERVER + 1):
			ok, domain_or_error, ip_address = self.lookup(server_no)
			if ok:
				results[domain_or_error] = ip_address
		return results

	def lookup(self, server_no):
		"""Looks up a server"""
		domain_name = "mpserver%02d.flightgear.org" % server_no
		#print "\tLookup: %s" % domain_name
		try:
			ip_address = socket.gethostbyname(domain_name)
			self.emit(QtCore.SIGNAL("domain_found"), domain_name, ip_address)
			return True, domain_name,  ip_address
		except socket.gaierror, e:
			return False, e, None



###############################################
## Main Handler Lookup Class
###############################################
class MP_MonitorBot(QtCore.QThread):

	def __init__(self):
		QtCore.QThread.__init__(self)	

		self.timer = QtCore.QTimer(self)
		self.connect(self.timer, QtCore.SIGNAL("timeout()"), self.on_timer)

		self.dnsLookupThread = DnsLookupThread(self)
		self.connect(self.dnsLookupThread, QtCore.SIGNAL("domain_found"), self.on_domain_found)


	def run(self):
		#self.dnsLookupThread.start()
		self.timer.start(1000)


	def on_timer(self):
		epo = QtCore.QDateTime.currentDateTime().toTime_t()
		print epo
		if epo % 2 == 0:
			#print "do dns"
			
			#if self.dnsLookupThread.isRunning():
			#	print "running"
			#else:
			#	pass #self.dnsLookupThread.start()
			pass
			

	#######################################################
	## Events
	def on_domain_found(self, host_name, ip_address):
		print "domain=", host_name


##################
## Run code
##################
def main():
	app = QtCore.QCoreApplication(sys.argv)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	monitorBot = MP_MonitorBot()
	monitorBot.start()
	return app.exec_()

if __name__ == '__main__':
	main()
	#print query_server("mpserver02.flightgear.org")



###########################
## Telnet Queery
############################
import commands
def query_server(host_name_pref_ip):
	timeout=5
	cmd = "nc -w %s %s 5001" % (timeout, host_name_pref_ip)
	status, result = commands.getstatusoutput(cmd)
	print "status=", status
	lines = result.split("\n")
	pilots = []
	for line in lines:
		if line.startswith("#") or line == "":
			## reserved bits
			pass
		else:
			parts =  line.split(" ")
			pilot = {}
			pilot['callsign'] = parts[0].split("@")[0]
			pilot['ident'] = parts[0]
			pilot['lat'] = parts[1]
			pilot['lng'] = parts[2]
			pilots.append(pilot)
			# self.emit(QtCore.SIGNAL("pilot"), pilot)
	return pilots
