#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import signal
import simplejson as json
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
		self.timer.start(1000)

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
		#print "addr=", remote_host # socket.peerAddress().toString()
		if not self.clientSockets.has_key(remote_host):
			self.clientSockets[remote_host] = socket
			self.connect(self.clientSockets[remote_host], QtCore.SIGNAL("disconnected()"), lambda argg=remote_host: self.on_socket_delete_later(argg))
			#print "-------------------------------------\nconnection", socket, socket.state()
			foo_str = "{handshake: 'ok'}"; "%s" % QtCore.QTime.currentTime()
			os = QtCore.QByteArray()
			os.append("HTTP/1.1 101 Web Socket Protocol Handshake\r\n")
			os.append("Upgrade: WebSocket\r\n")
			os.append("Connection: Upgrade\r\n")
			os.append("WebSocket-Origin: http://%s\r\n" % mp_config.WWW)
			os.append("WebSocket-Location: ws://%s:5050/\r\n" % mp_config.WWW)
			#os.append("WebSocket-Protocol: sample\r\n\r\n")
			os.append("\r\n")
			os.append('\x00' + foo_str + '\xff')
			socket.write(os)
		print "Connection >>", (", ").join(self.clientSockets.keys())

	def on_socket_delete_later(self, remote_address):
		##print "delete later", remote_address
		del self.clientSockets[remote_address]
		print "Dropped >>", (", ").join(self.clientSockets.keys())

	def on_timer(self):
		self.increment += 1
		epo = QtCore.QDateTime.currentDateTime().toTime_t()
		#print epo, len(self.ip2host)
		#for idx in self.clientSockets:
		#	ba = QtCore.QByteArray('\x00' + str(epo) + " " + str(self.increment) + '\xff')
		#	self.clientSockets[idx].write(ba)
		if len(self.ip2host) == 0:
			return
		#return
		#print self.host2ip	
		#return
		host_address = "mpserver02.flightgear.org"
		#for ip in self.ip2host:
		#host_address = self.ip2host[ip]
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
		#print "con", host_address, self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() )
		pass

	def on_socket_ready_read(self, host_address):
		self.telnetString[host_address] = self.telnetString[host_address] + str(self.telnetSocket[host_address].readAll())

	def on_socket_disconnected(self, host_address):
		#print "\t>> done", host_address, self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() ),  len(self.telnetString[host_address])
		#print self.telnetString[host_address]
		if len(self.telnetString[host_address]) == 0:
			return
		lines = self.telnetString[host_address].split("\n")
		pilots = {}
		for line in lines:
			if line.startswith("#") or line == "":
				## reserved bits
				pass
			else:
				parts =  line.split(" ")
				#print parts
				#sc3@LOCAL: -4854301.177206 4143809.601100 94760.548555 0.856340 139.514712 
				#  0            1              2            3            4       5
				##16404.199475 1.825307 -0.713956 1.824345 Aircraft/c172p/Models/c172p.xml
				# 6             7          8         9        10
				#return
				## ta xiii
				#Origin, LastPos[X], LastPos[Y], LastPos[Z], PlayerPosGeod[Lat], PlayerPosGeod[Lon], PlayerPosGeod[Alt],
				#LastOrientation[X], LastOrientation[Y], LastOrientation[Z], ModelName
				callsign = parts[0].split("@")[0].strip()
				if callsign != '':
					pilot = {}
					
					pilot['callsign'] = callsign
					pilot['ident'] = parts[0]
					pilot['lat'] = parts[4]
					pilot['lng'] = parts[5]
					pilot['alt'] = parts[6]
					pilot['model'] = parts[10].split("/")[-1].replace('.xml', '')
					pilots[callsign] = pilot
					#print pilot
					if callsign == "crazy-b":
						#print parts
						pass
				#return
				# self.emit(QtCore.SIGNAL("pilot"), pilot)
		print len(pilots)
		#print "\t>>", "p=", len(pilots),  "ms=", self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() ), "\thost=", host_address
		json_str = json.dumps({'pilots': pilots})
		ba = QtCore.QByteArray('\x00' + json_str + '\xff')
		if len(self.clientSockets) > 0:
			for idx in self.clientSockets:
				self.clientSockets[idx].write(ba)
			#print "send", (", ").join(self.clientSockets.keys())
		

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


