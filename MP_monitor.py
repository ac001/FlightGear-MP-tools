#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import signal
#import socket
from PyQt4 import QtCore
from PyQt4 import QtNetwork

MAX_NAME_SERVER = 20
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
		
		#return
		servers = self.lookup_all()
		self.timer.start()
		#print "\t\t<< %s servers" % len(servers)
		return

	def on_timer(self):
		print "timer"
		servers = self.lookup_all()
		return
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
			self.lookup(server_no)
			#ok, domain_or_error, ip_address = self.lookup(server_no)
			#if ok:
			#	results[domain_or_error] = ip_address
		#return results

	def lookup(self, server_no):
		"""Looks up a server"""
		domain_name = "mpserver%02d.flightgear.org" % server_no
		#print "\tLookup: %s" % domain_name
		foo = QtNetwork.QHostInfo.lookupHost(domain_name, self.on_lookup_host)
		#return True, False, False
		#try:
			#ip_address = socket.gethostbyname(domain_name)
		#	self.emit(QtCore.SIGNAL("domain_found"), domain_name, ip_address)
		#	return True, domain_name,  ip_address
		#except socket.gaierror, e:
		#	return False, e, None


	def on_lookup_host(self, hostInfo):
		if hostInfo.error():
			#print hostInfo.errorString()
			self.emit(QtCore.SIGNAL("domain_not_found"), hostInfo.hostName())
		else:
			#print hostInfo.hostName(), hostInfo.addresses()[0].toString()
			self.emit(QtCore.SIGNAL("domain_found"), hostInfo.hostName(), hostInfo.addresses()[0].toString())

###############################################
## Main Handler Lookup Class
###############################################
class MP_MonitorBot(QtCore.QObject):

	def __init__(self):
		QtCore.QObject.__init__(self)	

		self.host2ip = {}
		self.ip2host = {}
		

		self.timer = QtCore.QTimer(self)
		self.connect(self.timer, QtCore.SIGNAL("timeout()"), self.on_timer)

		self.dnsLookupThread = DnsLookupThread(self)
		self.connect(self.dnsLookupThread, QtCore.SIGNAL("domain_found"), self.on_domain_found)

		#def run(self):
		self.dnsLookupThread.start()
		self.timer.start(1000)

		self.socketString = {}
		self.socketTimer = {}
		self.socket = {}
		self.lastUpdate = None

		
	def on_timer(self):
		epo = QtCore.QDateTime.currentDateTime().toTime_t()
		print epo, len(self.ip2host)
		if len(self.ip2host) == 0:
			return
		#print self.host2ip	
		#return
		#host_address = "mpserver02.flightgear.org"
		for ip in self.ip2host:
			host_address = self.ip2host[ip]
			if not self.socket.has_key(host_address):
				self.socket[host_address] = QtNetwork.QTcpSocket(self)
				#print "create sock"
				self.connect(self.socket[host_address], QtCore.SIGNAL("disconnected()"), lambda argg=host_address: self.on_socket_disconnected(argg))
				self.connect(self.socket[host_address], QtCore.SIGNAL("readyRead()"), lambda argg=host_address: self.on_socket_ready_read(argg))
				#self.connect(self.socket, QtCore.SIGNAL("finished()"), self.on_socket_finished)
			if self.socket[host_address].state() == QtNetwork.QAbstractSocket.UnconnectedState:
				#print "connect,", host_address, "=", self.socket[host_address].state()
				self.socketString[host_address] = ''
				self.socketTimer[host_address] = QtCore.QTime.currentTime()
				self.socket[host_address].connectToHost(host_address, 5001, QtCore.QIODevice.ReadOnly)
			else:
				#print "working", host_address
				pass
	#def on_socket_connected(self):
		#print "on_socket_connected"
		#pass

	def on_socket_ready_read(self, host_address):
		#print "on_socket_ready_read"
		self.socketString[host_address] = self.socketString[host_address] + str(self.socket[host_address].readAll())
		#print len(self.socketString)


	def on_socket_disconnected(self, host_address):
		#print "\t>> done", host_address, self.socketTimer[host_address].msecsTo( QtCore.QTime.currentTime() ),  len(self.socketString[host_address])
		#sprint self.socketString
		if len(self.socketString[host_address]) == 0:
			return
		lines = self.socketString[host_address].split("\n")
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
		#print len(pilots)
		print "\t>>", "p=", len(pilots),  "ms=", self.socketTimer[host_address].msecsTo( QtCore.QTime.currentTime() ), "\thost=", host_address

	#def on_socket_finished(self):
		#print "DEAD"
		
		

	#######################################################
	## Events
	def on_domain_found(self, host_name, ip_address):
		host_name = str(host_name)
		ip_address = str(ip_address)
		#print "domain=", host_name, ip_address

		## First check that the host_name exists
		if self.host2ip.has_key(host_name):

			## if Ip's same do nothing
			if self.host2ip[host_name] == ip_address:
				#print "same"
				pass

			## Ip address has changed, so delete from ip2host and update host_name
			else:
				del self.ip2host[ self.host2ip[host_name] ]
				self.ip2host[ip_address] = host_name
				self.host2ip[host_name] = ip_address
				print "rename ip"
				
		else:
			## New Host and IP
			self.ip2host[ip_address] = host_name
			self.host2ip[host_name] = ip_address
			self.send_to_master(host_name, ip_address)

	def send_to_master(self, host_name, ip_address):
		#print "send_to_master", host_name, ip_address
		pass


###########################
## Telnet Query
############################
import commands
def query_server(host_name_pref_ip):
	
	socket = QtNetwork.QTcpSocket()
	socket.connectToHost(host_name_pref_ip, 5001, QtCore.QIODevice.ReadOnly)
	

	return
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



##################
## Run code
##################
def main():
	app = QtCore.QCoreApplication(sys.argv)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	monitorBot = MP_MonitorBot()
	#monitorBot.run()
	return app.exec_()

if __name__ == '__main__':
	main()
	#print query_server("mpserver02.flightgear.org")


