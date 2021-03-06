#!/usr/bin/env python
# -*- coding: utf-8 -*-



### rought points
# rwy 28r at KSFO ]
"""
print "KSFO 28R ", calc_heading(37.613721, -122.357225, 37.6287, -122.3932)

# London City to Heathrow - across meridian
print "EGLC TO EGLL ", calc_heading(51.50995, 0.059566, 51.470477, -0.460224 )
print "EGLL TO  EGLC", calc_heading( 51.470477, -0.460224, 51.50995, 0.059566)
print "EGLL TO  Luton", calc_heading( 51.470477, -0.460224, 51.86772, -0.304871)
print "Sstanstead TO EGLL ", calc_heading(51.881578, 0.247179, 51.470477, -0.460224 )


sys.exit(0)
"""

import sys
import signal
import time
from math import *

import simplejson as json
from PyQt4 import QtCore
from PyQt4 import QtNetwork


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
		
		self.last_calc = time.time()
		self.pilotsHistory = {}

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
		self.connect(self.server, QtCore.SIGNAL("newConnection()"), self.on_websocket_connection)
		self.server.listen(QtNetwork.QHostAddress(QtNetwork.QHostAddress.Any), 5050)
		self.clientSockets = {}
		self.increment = 0

	def on_websocket_connection(self):
		
		socket = self.server.nextPendingConnection()
		remote_host = str(socket.peerAddress().toString())
		#print "addr=", remote_host # socket.peerAddress().toString()
		if not self.clientSockets.has_key(remote_host):
			self.clientSockets[remote_host] = socket
			self.connect(self.clientSockets[remote_host], QtCore.SIGNAL("disconnected()"), lambda argg=remote_host: self.on_websocket_delete_later(argg))
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

	## Nuke Socket
	def on_websocket_delete_later(self, remote_address):
		self.clientSockets[remote_address].disconnectFromHost()
		del self.clientSockets[remote_address]
		print "Dropped a connection, remaining = ", (", ").join(self.clientSockets.keys())

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
		if not self.host2ip.has_key("mpserver04.flightgear.org"):
			return
		host_address = self.host2ip["mpserver04.flightgear.org"]
		#print "host_address=", host_address
		#for ip in self.ip2host:
		#host_address = self.ip2host[ip]
		if not self.telnetSocket.has_key(host_address):
			self.telnetSocket[host_address] = QtNetwork.QTcpSocket(self)
			#print "create sock"
			self.connect(self.telnetSocket[host_address], QtCore.SIGNAL("connected()"), lambda argg=host_address: self.on_telnet_connected(argg))
			self.connect(self.telnetSocket[host_address], QtCore.SIGNAL("disconnected()"), lambda argg=host_address: self.on_telnet_disconnected(argg))
			self.connect(self.telnetSocket[host_address], QtCore.SIGNAL("readyRead()"), lambda argg=host_address: self.on_telnet_ready_read(argg))
			#self.connect(self.telnetSocket, QtCore.SIGNAL("finished()"), self.on_socket_finished)
		if self.telnetSocket[host_address].state() == QtNetwork.QAbstractSocket.UnconnectedState:
			#print "connect,", host_address, "=", self.telnetSocket[host_address].state()
			self.telnetString[host_address] = ''
			self.telnetTimer[host_address] = QtCore.QTime.currentTime()
			self.telnetSocket[host_address].connectToHost(host_address, 5001, QtCore.QIODevice.ReadOnly)
		else:
			#print "working", host_address
			pass


	def on_telnet_connected(self, host_address):
		#print "con", host_address, self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() )
		pass

	## Data to read, so append the telnetString
	def on_telnet_ready_read(self, host_address):
		self.telnetString[host_address] = self.telnetString[host_address] + str(self.telnetSocket[host_address].readAll())

	def on_telnet_disconnected(self, host_address):
		#print "\t>> Recieved", host_address, self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() ),  len(self.telnetString[host_address])
		#print self.telnetString[host_address]
		if len(self.telnetString[host_address]) == 0: ## Nothing there - happens sometimes
			return

		## We calculate studd (eg alt) every five seconds
		do_calc_update = False
		epoch = time.time()
		if (epoch - self.last_calc) > mp_config.CALC_UPDATE_INTERNAL:
			self.last_calc = epoch
			do_calc_update = True
			print "-------------------------\nupdate cycle"
		lines = self.telnetString[host_address].split("\n")
		pilots = {}
		for line in lines:
			if line.startswith("#") or line == "":
				## TODO parse server details
				pass
			else:
				parts =  line.split(" ")
				## ta xiii
				# Origin, LastPos[X], LastPos[Y], LastPos[Z],
				# PlayerPosGeod[Lat], PlayerPosGeod[Lon], PlayerPosGeod[Alt],
				# LastOrientation[X], LastOrientation[Y], LastOrientation[Z], ModelName
				call_ident = parts[0].split("@")
				callsign = call_ident[0].strip()
							
				if callsign != '':
					pilot = {}
					pilot_ip = call_ident[1][:-1]
					#print host_address, server_ip
					if pilot_ip == 'LOCAL':
						pilot_ip = host_address
					pilot['server'] = self.ip2host[pilot_ip].split('.')[0] if self.ip2host.has_key(pilot_ip) else pilot_ip
					pilot['aircraft'] = parts[10].split("/")[-1].replace('.xml', '')

					#pilot['ident'] = parts[0]
					try:
						lat = float(parts[4])
					except:
						print "ERR", parts
					pilot['lat'] = lat
					lng = float(parts[5])
					pilot['lng'] = lng

					pilot['alt'] = parts[6].split(".")[0] if parts[6].find('.') > 0 else parts[6]

					## Pilot not in history so add
					if not self.pilotsHistory.has_key(callsign):
						self.pilotsHistory[callsign] =  {	'alt': pilot['alt'], 'alt_trend': 'level', 
															'lat': lat, 'lng': lng, 
															'hdg': 0, 'dist': 0
														}
					## Pilot has history
					else:
						## Update cycle so calc altitude trend, heading and airspeed
						if do_calc_update == True:
							
							prev_pilot = self.pilotsHistory[callsign]

							## Altitude trend
							alt_diff =  int(pilot['alt']) - int(prev_pilot['alt'])
							if alt_diff > mp_config.ALT_DIFF_THRESHOLD:
								alt_trend = 'climb'
							elif alt_diff < - mp_config.ALT_DIFF_THRESHOLD:
								alt_trend = 'descend'
							else:
								alt_trend = 'level'
							pilot['alt_trend'] = alt_trend
	
							## Heading
							dist = None
							pilot['hdg'] = calc_heading(prev_pilot['lat'], lat, prev_pilot['lng'], lng)
							#if prev_pilot['lat'] != lat:
								#print  callsign, self.pilotsHistory[callsign]['hdg'] == pilot['hdg'], self.pilotsHistory[callsign]['hdg'], pilot['hdg'], prev_pilot['lat'], lat, prev_pilot['lng'], lng
							#pilot['hdg'] = hdg
							self.pilotsHistory[callsign] = {'alt': pilot['alt'], 'alt_trend': alt_trend, 
															'lat': lat, 'lng': lng, 
															'hdg': pilot['hdg'], 'dist': dist}
							
						else:
							pilot['alt_trend'] = self.pilotsHistory[callsign]['alt_trend']
							pilot['hdg'] = self.pilotsHistory[callsign]['hdg']
							pilot['dist'] = self.pilotsHistory[callsign]['dist']
							#print "=", pilot['alt_trend']
						
					pilots[callsign] = pilot
					#print pilot
	
				#return
				# self.emit(QtCore.SIGNAL("pilot"), pilot)
		#print len(pilots)

		#print "\t>>", "p=", len(pilots),  "ms=", self.telnetTimer[host_address].msecsTo( QtCore.QTime.currentTime() ), "\thost=", host_address
		#return
		json_str = json.dumps({'success': True, 'pilots': pilots}, ensure_ascii=False)
		ba = QtCore.QByteArray('\x00' + json_str + '\xff')
		if len(self.clientSockets) > 0:
			for idx in self.clientSockets:
				self.clientSockets[idx].write(ba)
			#print "send", (", ").join(self.clientSockets.keys())
			if self.increment % 10 == 0:
				print "online=", len(pilots)
		self.increment += 1




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

#######################################################
## Calculations - thanks http://www.movable-type.co.uk/scripts/latlong.html
def calc_crow_distance(self, lat1, lng1, lat2, lng2):
	R = 6371;
	dLat = radians(lat2 - lat1)
	dLng = radians(lng2 - lng1)	
	a = sin(dLat/2) * sin(dLat/2) +  cos(radians(lat1)) * cos(radians(lat2)) * sin(dLng/2) * sin(dLng/2)
	c = 2 * atan2(sqrt(a), sqrt(1-a))
	return R * c


## decimal degree inputs from MP server
def calc_heading(deglat1, deglng1, deglat2, deglng2):
	lat1 = radians(deglat1) 
	lat2 = radians(deglat2)
	dLng = radians(deglng2 - deglng1)
	y = sin(dLng) * cos(lat2);
	x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng)
	brng = atan2(y, x)
	return (degrees(brng) + 360) % 360



if __name__ == '__main__':
	#main()

	print "KSFO 28R ", calc_heading(37.613721, -122.357225, 37.6287, -122.3932)

	# London City to Heathrow - across meridian
	print "EGLC TO EGLL ", calc_heading(51.50995, 0.059566, 51.470477, -0.460224 )
	print "EGLL TO  EGLC", calc_heading( 51.470477, -0.460224, 51.50995, 0.059566)
	print "EGLL TO  Luton", calc_heading( 51.470477, -0.460224, 51.86772, -0.304871)
	print "Sstanstead TO EGLL ", calc_heading(51.881578, 0.247179, 51.470477, -0.460224 )

	print "Sstanstead TO EGLL ", calc_heading(51.881578, 0.247179, 51.470477, -0.460224 )
