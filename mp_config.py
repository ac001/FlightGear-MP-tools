# -*- coding: utf-8 -*-

from PyQt4 import QtCore

MAX_NAME_SERVER = 30 

MASTER_MACHINE = 'http://localhost:8080'
#MASTER_MACHINE = 'http://fg-online.appspot.com'

UPDATE_DNS = "%s/update/dns/" % MASTER_MACHINE


DNS_INTERVAL = 500


fileInfo = QtCore.QFileInfo('./LOCAL.txt')

LOCAL = fileInfo.exists()

WWW = 'localhost'  if  fileInfo.exists() else 'flightgear.daffodil.uk.com'
	