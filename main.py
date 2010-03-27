# -*- coding: utf-8 -*-

import json
import web

from app.DnsLookup import DnsLookup

urls = (
	'/(.*)/', 'MainHandler'
)
app = web.application(urls, globals())

class MainHandler:        
	def GET(self, action):
		print "action=", action
		if action == 'dns':
			dns = DnsLookup()
			dic =  {'servers': dns.lookup_all()}
			return json.dumps(dic)

		if not action: 
			action = 'World'
		return 'Hello, ' + action + '!'




if __name__ == "__main__":
	app.run()