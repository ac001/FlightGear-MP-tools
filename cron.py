#!/usr/bin/env python
# -*- coding: utf-8 -*-

import simplejson as json

from app.DnsLookup import DnsLookup

if __name__ == "__main__":
	

	dns = DnsLookup()
	servers = dns.lookup_all()
	print servers


