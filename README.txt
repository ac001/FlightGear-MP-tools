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

