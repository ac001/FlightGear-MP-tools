# -*- coding: utf-8 -*-

from PyQt4 import QtCore

MAX_NAME_SERVER = 30 

MASTER_MACHINE = 'http://localhost:8080'
#MASTER_MACHINE = 'http://fg-online.appspot.com'
UPDATE_DNS = "%s/update/dns/" % MASTER_MACHINE

## Check with the nameservers
DNS_INTERVAL = 500

## Time between updates of position, trends
CALC_UPDATE_INTERNAL = 10

ALT_DIFF_THRESHOLD = 75 ## only changes more (interval above) will show climb or descend

#LOCAL = fileInfo.exists()
fileInfo = QtCore.QFileInfo('./LOCAL.txt')
if  fileInfo.exists():
	WWW = 'localhost'  
else:
	WWW = 'flightgear.daffodil.uk.com'
	