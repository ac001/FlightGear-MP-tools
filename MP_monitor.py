#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import signal
import json
from PyQt4 import QtCore
from PyQt4 import QtNetwork

#MAX_NAME_SERVER = 20
#NS_INTERVAL = 300 # seconds

import mp_config


###############################################
## Thread that looks up the DNS servers
###############################################
class DnsLookupThread(QtCore.QThread):

	def __init__(self, parent):
		QtCore.QThread.__init__(self, parent)
		#print "\t#Init DNS"

		self.timer = QtCore.QTimer(self)
		self.timer.setInterval(mp_config.DNS_INTERVAL * 1000)
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
		for server_no in range(1, mp_config.MAX_NAME_SERVER + 1):
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

	def __init__(self, parent):
		QtCore.QObject.__init__(self, parent)	

		self.host2ip = {}
		self.ip2host = {}
		

		self.timer = QtCore.QTimer(self)
		self.connect(self.timer, QtCore.SIGNAL("timeout()"), self.on_timer)

		self.dnsLookupThread = DnsLookupThread(self)
		self.connect(self.dnsLookupThread, QtCore.SIGNAL("domain_found"), self.on_domain_found)

		#def run(self):
		self.dnsLookupThread.start()
		self.timer.start(100)

		self.telnetString = {}
		self.telnetTimer = {}
		self.telnetSocket = {}
		self.lastUpdate = None

		self.server = QtNetwork.QTcpServer(self)
		self.connect(self.server, QtCore.SIGNAL("newConnection()"), self.on_server_connection)
		self.server.listen(QtNetwork.QHostAddress(QtNetwork.QHostAddress.Any), 5050)
		self.clientSockets = {}
		self.increment = 0

	def on_server_connection(self):
		
		socket = self.server.nextPendingConnection()
		remote_host = str(socket.peerAddress().toString())
		print "addr=", remote_host # socket.peerAddress().toString()
		if not self.clientSockets.has_key(remote_host):
			self.clientSockets[remote_host] = socket
			self.connect(self.clientSockets[remote_host], QtCore.SIGNAL("disconnected()"), self.on_socket_delete_later)
			print "-------------------------------------\nconnection", socket, socket.state()
			foo_str = "%s" % QtCore.QTime.currentTime()
			os = QtCore.QByteArray()
			os.append("HTTP/1.1 101 Web Socket Protocol Handshake\r\n")
			os.append("Upgrade: WebSocket\r\n")
			os.append("Connection: Upgrade\r\n")
			os.append("WebSocket-Origin: http://%s\r\n" % mp_config.WWW)
			os.append("WebSocket-Location: ws://%s:5050/\r\n" % mp_config.WWW)
			#os.append("WebSocket-Protocol: sample\r\n\r\n")
			os.append("\r\n")
			os.append('\x00' + foo_str + '\xff')

			#print repr(s.recv(4096))
			#resp = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n"
			#resp += "Upgrade: WebSocket\r\n"
			#resp +=	"Connection: Upgrade\r\n"
			#resp += "WebSocket-Origin: http://localhost\r\n"
			#resp += "WebSocket-Location: ws://localhost:5050/\r\n"
			#resp += "\r\n"
			#resp += '\x00hello\xff'
			#s.send(resp)

			#os.append("\r\n")
			#os.append("\r\n")
			"""
			os.append("HTTP/1.0 200 Ok\r\n")
			os.append("Content-Type: text/html; charset=\"utf-8\"\r\n")
			os.append("Content-length: %s\r\n" % len(foo_str))
			os.append("\r\n")
			"""
			#os.append(foo_str);
			socket.write(os)
			
			#print socket.bytesToWrite()
			#socket.flush()
			#print socket.bytesToWrite()
			#socket.disconnectFromHost()

	def on_socket_delete_later(self):
		print "delete later"

	def on_timer(self):
		self.increment += 1
		epo = QtCore.QDateTime.currentDateTime().toTime_t()
		print epo, len(self.ip2host)
		for idx in self.clientSockets:
			ba = QtCore.QByteArray('\x00' + str(epo) + " " + str(self.increment) + '\xff')
			self.clientSockets[idx].write(ba)
		if len(self.ip2host) == 0:
			return
		return
		#print self.host2ip	
		#return
		#host_address = "mpserver02.flightgear.org"
		for ip in self.ip2host:
			host_address = self.ip2host[ip]
			if not self.telnetSocket.has_key(host_address):
				self.telnetSocket[host_address] = QtNetwork.QTcpSocket(self)
				#print "create sock"
				self.connect(self.telnetSocket[host_address], QtCore.SIGNAL("connected()"), lambda argg=host_address: self.on_socket_connected(argg))
				self.connect(self.telnetSocket[host_address], QtCore.SIGNAL("disconnected()"), lambda argg=host_address: self.on_socket_disconnected(argg))
				self.connect(self.telnetSocket[host_address], QtCore.SIGNAL("readyRead()"), lambda argg=host_address: self.on_socket_ready_read(argg))
				#self.connect(self.telnetSocket, QtCore.SIGNAL("finished()"), self.on_socket_finished)
			if self.telnetSocket[host_address].state() == QtNetwork.QAbstractSocket.UnconnectedState:
				#print "connect,", host_address, "=", self.telnetSocket[host_address].state()
				self.telnetString[host_address] = ''
				self.telnetTimer[host_address] = QtCore.QTime.currentTime()
				self.telnetSocket[host_address].connectToHost(host_address, 5001, QtCore.QIODevice.ReadOnly)
			else:
				#print "working", host_address
				pass

	#def on_socket_connected(self):
		#print "on_socket_connected"
		#pass
	def on_socket_connected(self, host_address):
		print "con", host_address, self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() )


	def on_socket_ready_read(self, host_address):
		self.telnetString[host_address] = self.telnetString[host_address] + str(self.telnetSocket[host_address].readAll())

	def on_socket_disconnected(self, host_address):
		#print "\t>> done", host_address, self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() ),  len(self.telnetString[host_address])
		#sprint self.telnetString
		if len(self.telnetString[host_address]) == 0:
			return
		lines = self.telnetString[host_address].split("\n")
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
		#print "\t>>", "p=", len(pilots),  "ms=", self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() ), "\thost=", host_address
		#print json.dumps({'pilots': pilots})
		
		

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



##################
## Run code
##################
def main():
	app = QtCore.QCoreApplication(sys.argv)
	signal.signal(signal.SIGINT, signal.SIG_DFL)
	monitorBot = MP_MonitorBot(app)
	#monitorBot.run()
	return app.exec_()

if __name__ == '__main__':
	main()
	#print query_server("mpserver02.flightgear.org")


