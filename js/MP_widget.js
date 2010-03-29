//var FG = {};
//FG.map = {};
//FG.pilots_list = {};

function MP_Widget(){

var self = this;

this.webSocket = null;
this.Map = null

this.markers = {}
this.polyLines = {}
this.polyCoordinates = {}

this.map_initialize =  function () {
	//return
    var latlng = new google.maps.LatLng(37.613545, -122.357237); // KSFO
    var myOptions = {
      zoom: 12,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.TERRAIN
    };
    self.Map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
	google.maps.event.addDomListener(self.Map, 'idle', function(latlng) {
		//FIXME - wtf this doent exist as event
		//console.log("mousemove", latlng);
	});
  }


this.render_callsign = function (v, meta, rec){
	return v
	switch(rec.get('flag')){
		case 0: //* pilot is flying
			meta.css = 'fg_pilot_fly';
			break;
		case 1: //* pilot is new
			meta.css = 'fg_pilot_new';
			break;
		default: //* pilot is < 0 = delete timer
			meta.css = 'fg_pilot_dead';
			break;
	}
	return v;
}

this.render_altitude = function (v, meta, rec, rowIdx, colIdx, store){
	return v;
	if(v < 1000){
		color = '#931429';
	}else if(v < 2000){
		color = '#FA405F';
	}else if(v < 4000){
		color = '#CCFA40';
	}else if(v < 6000){
		color = '#7FFA40';
	}else if(v < 8000){
		color = '#40FA6E';
	}else if(v < 10000){
		color = '#40FAAA';
	}else if(v < 15000){
		color = '#FA405F';
	}else if(v < 20000){
		color = '#40FAFA';
	}else{
		color = '#331CDC';
	}
	return "<span style='color:" + color + ';">' + Ext.util.Format.number(v, '0,000'); + '</span>';
}

this.statusLabel = new Ext.Toolbar.TextItem({text:'Socket Status'});

this.chkTrackSelectedRow = new Ext.form.Checkbox({
	boxLabel: 'Track Selected Row'
});
//****************************************************************
this.latLabel = new Ext.Toolbar.TextItem({text:'Lat: -0.00'});
this.lngLabel = new Ext.Toolbar.TextItem({text:'Lng: -0.00'});

this.pilotsSummaryCountLabel = new Ext.Toolbar.TextItem({text:'No pilots'});
this.pilotsDataCountLabel = new Ext.Toolbar.TextItem({text:'No pilots'});

var PilotRecord = Ext.data.Record.create([
	{name: 'flag', type: 'int'},
	{name: "callsign", type: 'string'},
	{name: "server_ip", type: 'string'},
	{name: "model", type: 'string'},
	{name: "lat", type: 'float'},
	{name: "lng", type: 'float'},
	{name: "alt", type: 'int'},
	{name: "heading", type: 'string'},
	{name: "pitch", type: 'string'},
	{name: "roll", type: 'string'}
]);

//* list of pilot markers (atmo there is no ID etc in api3)
this.pilotMarkers = {};

//* Pilots Datastore
this.pilotsStore = new Ext.data.Store({
	idProperty: 'callsign',
	fields: [ 	{name: 'flag', type: 'int'},
				{name: "callsign", type: 'string'},
				{name: "server_ip", type: 'string'},
				{name: "model", type: 'string'},
				{name: "lat", type: 'float'},
				{name: "lng", type: 'float'},
				{name: "alt", type: 'int'},
				{name: "heading", type: 'string'},
				{name: "pitch", type: 'string'},
				{name: "roll", type: 'string'}
	]
	//, sortInfo: {field: "callsign", direction: 'ASC'}
});

//this.pilotsStore.on("exception", function(prx, typ, act){
//	//TODO
//	console.log("exception", prx, typ, act);
///});

this.pilotsLookupGrid = new Ext.grid.GridPanel({
	title: 'Pilots',
	iconCls: 'iconPilots',
	autoScroll: true,
	autoWidth: true,
	tbar:[  //this.actionAdd, this.actionEdit, this.actionDelete, 
			//'-',// this.actionLabSelectToolbarButton,
			this.chkTrackSelectedRow,
			'->',
			//Geo2.widgets.goto_www('Online', 'View rates on website', '/rates.php'),
			{text: 'Connect', iconCls: 'iconRefresh', handler: function(){
				//pilotsStore.reload();
				self.create_socket()
				}
			}    
	],
	viewConfig: {emptyText: 'No pilots online', forceFit: true}, 
	sm: new Ext.grid.RowSelectionModel({singleSelect:true}),
	store: this.pilotsStore,
	loadMask: true,
	//TODO sm: pilotsSelectionModel,
	columns: [  //TODO pilotsSelectionModel,
				{header: 'CallSign',  dataIndex:'callsign', sortable: true, renderer: this.render_callsign},
				{header: 'Aircraft',  dataIndex:'model', sortable: true, hidden: true},
				{header: 'Lat', dataIndex:'lat', sortable: true, align: 'right',
					renderer: function(v, meta, rec, rowIdx, colIdx, store){
						return Ext.util.Format.number(v, '0.000');
					}
				},
				{header: 'Lng', dataIndex:'lng', sortable: true, align: 'right',
					renderer: function(v, meta, rec, rowIdx, colIdx, store){
						return Ext.util.Format.number(v, '0.000');
					}
				}
	],
	listeners: {},
	bbar: [this.pilotsSummaryCountLabel, '->',  this.statusLabel]
});
this.pilotsLookupGrid.on("rowdblclick", function(grid, idx, e){
	var rec = self.pilotsStore.getAt(idx);
	var latlng = new google.maps.LatLng(rec.get('lat'), rec.get('lng'));
	self.Map.panTo(latlng);
	//alert(rec.get("callsign"));
});    


this.pilotsMainGrid = new Ext.grid.GridPanel({
	title: 'Pilots Data',
	iconCls: 'iconPilots',
	autoScroll: true,
	autoWidth: true,
	enableHdMenu: false,
	viewConfig: {emptyText: 'No pilots online', forceFit: true}, 
	store: this.pilotsStore,
	loadMask: true,
	columns: [  //this.selModel,	
		{header: 'F',  dataIndex:'flag', sortable: true, width: 40},
		{header: 'CallSign',  dataIndex:'callsign', sortable: true, renderer: this.render_callsign},
		{header: 'Aircraft',  dataIndex:'model', sortable: true},

		{header: 'Lat', dataIndex:'lat', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return Ext.util.Format.number(v, '0.000');
			}
		},
		{header: 'Lng', dataIndex:'lng', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return Ext.util.Format.number(v, '0.000');
			}
		},
		{header: 'Alt', dataIndex:'alt', sortable: true, align: 'right',
			DEADrenderer: this.render_altitude
		},
		{header: 'Heading', dataIndex:'heading', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return Ext.util.Format.number(v, '0');
			}
		},
		{header: 'Pitch', dataIndex:'pitch', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return Ext.util.Format.number(v, '0');
			}
		},
		{header: 'Roll', dataIndex:'roll', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return Ext.util.Format.number(v, '0');
			}
		},
		{header: 'Server', dataIndex:'server_ip', sortable: true, align: 'left',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return v;
			}
		}

	],
	listeners: {},
	bbar: [this.pilotsDataCountLabel]
});
        
this.viewport = new Ext.Viewport({
	layout: 'border',
	plain: true,
	items: [
		//** Left/West area
		{title: 'FlightGear WebSocket Map <small>v0.1-experimental</small>', 
			region: 'west',
			split: true,
			width: 300,
			minSize: 175,
			maxSize: 400,
			collapsible: true,
			margins: '0 0 0 5',
			layout: {
				type: 'fit'
			},
			items: [ this.pilotsLookupGrid	]
        }, /* 'west' */
		new Ext.TabPanel({
			region: 'center', // a center region is ALWAYS required for border layout
			deferredRender: false,
			activeTab: 0,
			border: 0,
			items: [
				new Ext.Panel({
						contentEl: 'map_canvas',
						title: 'Map&nbsp;&nbsp;',
						iconCls: 'iconMap',
						tbar: [],
						autoScroll: true
				}),
				this.pilotsMainGrid
			]
        })
	]
});


this.create_socket = function (){

	var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	if(!is_chrome){
		var s = "This page uses websocket's and WebSocket is only available with Google Chrome atmo";
		alert(s);
		return;
	}

	self.webSocket = new WebSocket(SOCKET_ADDRESS);

	self.webSocket.onopen = function(msg) { 
		//foo.value="connected"
			//alert("connected");
		self.statusLabel.setText("Connected")

	}

	self.webSocket.onclose = function(msg) { 
		//alert("closed");
		//foo.value="closed"
		self.statusLabel.setText("Closed")
		setTimeout(self.create_socket, 3000)
	}

	self.webSocket.onmessage = function(msg) { 
		var json = Ext.decode(msg.data);
		//#console.log("ok-pilots", json);
		if(!json['pilots']){
			console.log("No pilots", json);
			return;
		}
		var pilots =  json['pilots'];
		self.statusLabel.setText(pilots.length)
		//console.log(pilots);
		//* loop thru existing pilots and update
		if(self.pilotsStore.getCount() > 0){
			//for(var idx=0; idx <= pilotsStore.getCount(); idx++){
			self.pilotsStore.each( function(rec){	
				//var rec = pilotsStore.getAt(idx);
				if(rec){
					//#console.log( rec.id);

					if(pilots[rec.id]){
						var r = pilots[rec.id]
						//* Pilot exists so update
						rec.set('flag', 0);
						rec.set('lat', r.lat);
						rec.set('lng', r.lng);
						rec.set('alt', r.alt);
						//rec.set('alt', pilots[rec.id].alt);
						//rec.set('heading', pilots[rec.id].heading);
						//rec.set('pitch', pilots[rec.id].pitch);
						//rec.set('roll', pilots[rec.id].roll);
						/* if(self.markers[r.callsign].length == 10){
							var marker = self.markers[r.callsign].pop();
							marker.setMap(null);
							
						}
						self.markers[r.callsign][0].setIcon(icons.yellow_blip);
						*/
						var latlng = new google.maps.LatLng(r.lat, r.lng);
						self.markers[r.callsign].setPosition(latlng); // = new google.maps.Marker({


						
						
			
						var path = self.polyLines[r.callsign].getPath();
						if(path.getLength() == 50){
							path.pop() //(9);
						}
						path.insertAt(0, latlng);
						//paths.insertAt(0, latlng);
						/* 
						var marker = new google.maps.Marker({
													position: latlng, 
													map: self.Map,
													title: r.callsign,
													icon: icons.red_blip
						});
						self.markers[r.callsign].unshift(marker);
						*/
						delete pilots[rec.id]
					}else{
						var f = rec.get('flag');
						if(f > 0){
							rec.set('flag', -1);	
						}else{
							f = f -1;
							rec.set('flag', f);	
						}
						//console.log("dead", );
						
						//
					}
				}else{
					//console.log("errOR");
				}
			}, self);
		}
		//* add new pilots_list
		for(var p in pilots){
			pilots[p].flag = 1;
			var pRec = new PilotRecord(pilots[p], p);
			self.pilotsStore.add(pRec);
			var latlng = new google.maps.LatLng(pilots[p].lat, pilots[p].lng);
			//self.markers[pilots[p].callsign] = new Array();
			self.polyCoordinates[pilots[p].callsign] = new google.maps.MVCArray();
			var polyOptions = {
				path: self.polyCoordinates[pilots[p].callsign],
				strokeColor: 'red',
				strokeOpacity: 1.0,
				strokeWeight: 1
			}
			self.polyLines[pilots[p].callsign] = new google.maps.Polyline(polyOptions);
			self.polyLines[pilots[p].callsign].setMap(self.Map);
			//#//var path = 

			var marker = new google.maps.Marker({
										position: latlng, 
										map: self.Map,
										title: pilots[p].callsign,
										icon: icons.red_blip
			});
			//self.markers[pilots[p].callsign].push(marker);
			self.markers[pilots[p].callsign] =  marker;
			delete pilots[p]
		}

		if(self.chkTrackSelectedRow.getValue()){
			var rec = self.pilotsLookupGrid.getSelectionModel().getSelected();
			//console.log("rec", rec.get('callsign'));
			var pLatLng = self.markers[rec.get('callsign')].getPosition()
			self.Map.panTo(pLatLng);
		}

		//* Update count labels
		var cnt = self.pilotsStore.getCount();
		//console.log("cnt", cnt, "pilots.length", pilots);
		var lbl = cnt == 0 ? "No Pilots Online" : cnt + " Pilots Online"
		self.pilotsSummaryCountLabel.setText(lbl);
		self.pilotsDataCountLabel.setText(lbl);
		//#refreshTimerLabel.setText(refresh_counter)
		//refresh_counter = REFRESH_RATE;
		//setTimeout(load_pilots, 1000);
	}
}



} /*** MP_Widget() */


Ext.onReady(function(){
	var widget = new MP_Widget();
	widget.map_initialize();
	setTimeout(widget.create_socket, 3000);
	
	
});






