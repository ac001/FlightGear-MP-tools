FlightGear MultiPlayer Tools

The idea is to create a webservice/cron that can 
work with the GAE powered http://fg-online.appspot.com website.

Site is currenty at http://flightgear.daffodil.uk.com

As the GAE cannot speak anything other than port 80,
then this service will act as a "proxy/slave" 
pushing to the master machine

=== Ideas ===
* Automatically search for new MpServers via DNS
* create a service wherby mpserves can update, eg a wget on a cron



## Install ##
On debian with python 2.5 installed (may vary)

-------------------------
# require "easy_install" which is in "setuptools" to install web.py
apt-get install python-setuptools

# install web.py
easy_install web.py

# install the python wsgi gateway (cgi), which in in "flup"
apt-get install python-flup 


-------------------------
# need "json"
#on python25
apt-get install python-simplejson
apt-get install python-cjson






#####################

Experimantal Idea:
Currently the MP serverstatus, DNS entries and mapservers are seperate.

Idea is to consolidate all of this into a "service" (maybe even websockets)
visible at http://fg-online.flightgear.org (Google App Engine)

Google App Engien only talks port 80,
So instead, set up a server to both be a service and push to GAE

## psuedo code	

class MainMonitor:
	def init()
		pilots_list = {}

		## first get the list of servers from dns
		server_list = None
		if serverList == None:
			self.fetch_server()

		for server in server_list:
			start_telent_thread(server, every=2 seconds, callback=update_pilots)

	def update_pilots(pilots):
		for pilot in pilots:
			update_pilot(pilot)
		write_to_file_js_xml()

	def update_pilot():
		# calc airspeed and trend
		# update the pilots_list ? multipthreaded

	def fetch_servers()
		#go and get list
		server_list = DoDnsThread()


		

## run it
MainMonitor()	



