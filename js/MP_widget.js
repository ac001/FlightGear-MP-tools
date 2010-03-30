
//*******************************************************************************
// Callsign Overlay Object
//*******************************************************************************
function CallsignOverlay(callsign, latlng, map) {
	this.latlng_ = latlng;
	this.callsign_ = callsign;

	this.map_ = map;
	this.div_ = null;
	this.setMap(map);
}

CallsignOverlay.prototype = new google.maps.OverlayView();

CallsignOverlay.prototype.onAdd = function() {
	var div = document.createElement('DIV');
	div.className = 'pilot_marker';

	var para = document.createElement("p");
	para.appendChild(document.createTextNode(this.callsign_));
	div.appendChild(para);

	this.div_ = div;
	var panes = this.getPanes();
	panes.overlayLayer.appendChild(div);
}

CallsignOverlay.prototype.draw = function() {
	var point = this.getProjection().fromLatLngToDivPixel(this.latlng_);
	var div = this.div_;
	div.style.left = point.x + 'px';
	div.style.top = point.y + 'px';
}

CallsignOverlay.prototype.setPosition = function(latlng) {
	var point =  this.getProjection().fromLatLngToDivPixel(latlng);
	this.div_.style.left = point.x + 'px';
	this.div_.style.top = point.y + 'px';
}

//*******************************************************************************
// Core Object
//*******************************************************************************
function MP_Widget(){

var self = this;

this.epoch = new Date().getTime();

this.webSocket = null;
this.Map = null
this.callsignOverlays = {}

this.markers = {} //* Aircraft Markers
this.markersInfo = {} //** Experimantal info window
this.polyLines = {} //* Poly line object
this.polyCoordinates = {} //* Coordinated from polyLines

this.icons = {};
this.icons.blip_red 		= 'images/red_dot.png';
this.icons.blip_yellow 		= 'images/yellow_dot.png';

this.icons.level_blue		= 'images/level_blue.png';
this.icons.up_blue			= 'images/up_blue.png';
this.icons.down_blue		= 'images/down_blue.png';


this.map_initialize =  function () {
	//return
    var latlng = new google.maps.LatLng(37.613545, -122.357237); // KSFO
    var myOptions = {
      zoom: 12,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.TERRAIN
    };
    self.Map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
	//google.maps.event.addDomListener(self.Map, 'idle', function(latlng) {
		//FIXME - wtf this doent exist as event
		//console.log("mousemove", latlng);
	//});
	//self.myOverlay = new MyOverlay(self.Map);
	
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
	return "<span style='color:" + color + ";'>" + Ext.util.Format.number(v, '0,000'); + '</span>';
}

this.statusLabel = new Ext.Toolbar.TextItem({text:'Socket Status'});

this.chkTrackSelectedRow = new Ext.form.Checkbox({
	boxLabel: 'Track Selected Row',
	checked: false
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
	{name: "altp", type: 'int'},
	{name: "altd", type: 'string'},
	{name: "heading", type: 'string'},
	{name: "pheading", type: 'string'},
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
				{name: "altp", type: 'int'},
				{name: "altd", type: 'string'},
				{name: "heading", type: 'string'},
				{name: "pheading", type: 'string'},
				{name: "pitch", type: 'string'},
				{name: "roll", type: 'string'}
	]
	//, sortInfo: {field: "callsign", direction: 'ASC'}
});


//************************************************
//** Pilots Lookup SideBar Grid
//************************************************
this.pilotsLookupGrid = new Ext.grid.GridPanel({
	title: 'Pilots',
	iconCls: 'iconPilots',
	autoScroll: true,
	autoWidth: true,
	tbar:[ 	this.chkTrackSelectedRow,
			'->',
			{text: 'Connect', iconCls: 'iconRefresh', 
				handler: function(){
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
				{header: 'Alt', dataIndex:'alt', sortable: true, align: 'right',
					renderer: this.render_altitude
				},
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
});    

//************************************************
//** Pilots Main Grid
//************************************************
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

//************************************************
//** Main Viewport
//************************************************
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

//************************************************
//** WebSocket
//************************************************
this.create_socket = function (){

	var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	if(!is_chrome){
		var s = "This page uses websocket's and WebSocket is only available with Google Chrome atmo";
		alert(s);
		return;
	}

	//*** Create Socket
	self.webSocket = new WebSocket(WEB_SOCKET_ADDRESS);

	//* On Open Socket
	self.webSocket.onopen = function(msg) { 
		self.statusLabel.setText("Connected");
	}

	//* On Close Socket
	self.webSocket.onclose = function(msg) { 
		self.statusLabel.setText("Closed");
		setTimeout(self.create_socket, 3000); // reattempt login
	}

	//* On Message Resieved Socket
	self.webSocket.onmessage = function(msg) { 
		var json = Ext.decode(msg.data);
		//#console.log("ok-pilots", json);
		if(!json['pilots']){
			console.log("No pilots", json);
			return;
		}
		var pilots =  json['pilots'];
		self.statusLabel.setText(pilots.length);
		//var projection = self.myOverlay.getProjection();
		//console.log(pilots);
		//* loop thru existing pilots and update

		var curr_epoch =  new Date().getTime();
		var altitude_update = false;
		if( (curr_epoch - self.epoch) > 5000){
			altitude_update = true;
			self.epoch = curr_epoch;
		}
		//console.log(altitude_update, curr_epoch, self.epoch, (curr_epoch - self.epoch));
		if(self.pilotsStore.getCount() > 0){
			//for(var idx=0; idx <= pilotsStore.getCount(); idx++){
			self.pilotsStore.each( function(rec){	
				//var rec = pilotsStore.getAt(idx);
				if(rec){
					//#console.log( rec.id);

					if( pilots[rec.id] ){

						//* Pilot exists so update
						var r = pilots[rec.id]

						if(altitude_update){
							var icon = self.icons.level_blue;
							var alt_diff = r.alt - rec.get('altp');
							if(Math.abs(alt_diff) > 100){ //* only interested if its changed 100ft or more
								rec.set('altp', r.alt);
								icon = alt_diff > 0 ? self.icons.up_blue : self.icons.down_blue;
								//rec.set('altd', icon);
							}
							self.markers[r.callsign].setIcon(icon); 
						}
						//rec.set('altd', alt_diff);
						rec.set('flag', 0);
						rec.set('lat', r.lat);
						rec.set('lng', r.lng);
						rec.set('alt', r.alt);
	
						var latlng = new google.maps.LatLng(r.lat, r.lng);
						//** Update marker
						self.markers[r.callsign].setPosition(latlng); 
						self.callsignOverlays[r.callsign].setPosition(latlng);
					
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
			
			//pilots[p].flag = 1;

			//** create new record
			var pRec = new PilotRecord(pilots[p], p);
			pRec.set('altp', pilots[p].alt);
			pRec.set('flag', 1);
			self.pilotsStore.add(pRec);

			//** Add New Marker
			var latlng = new google.maps.LatLng(pilots[p].lat, pilots[p].lng);
			self.markers[pilots[p].callsign] = new google.maps.Marker({
									position: latlng, 
									map: self.Map,
									title: pilots[p].callsign,
									icon: self.icons.level_blue
			});

			self.callsignOverlays[pilots[p].callsign] = new CallsignOverlay(pilots[p].callsign, latlng, self.Map);
	

			//** Create the PolyLines and Coordinates object
			self.polyCoordinates[pilots[p].callsign] = new google.maps.MVCArray();
			var polyOptions = {
				path: self.polyCoordinates[pilots[p].callsign],
				strokeColor: 'blue',
				strokeOpacity: 1.0,
				strokeWeight: 1
			}
			self.polyLines[pilots[p].callsign] = new google.maps.Polyline(polyOptions);
			self.polyLines[pilots[p].callsign].setMap(self.Map);

			//var foo = new google.maps.
			//console.log(self.Map)
			//var points = self.myOverlay.getProjection().fromLatLngToDivPixel(latlng);
			//console.log(points);
			//var div = document.createElement("div");
			//div.appendChild(document.createTextNode("@@@@")) //pilots[p].callsign));
			//document.getElementById("map_canvas").appendChild(div);
			//document.body.appendChild(div);
			//div.style.position = "absolute";
			//div.style.top = 600;
			//div.style.left = 600;


			//#//var path = 

			delete pilots[p]
		}

		if(self.chkTrackSelectedRow.getValue()){
			var rec = self.pilotsLookupGrid.getSelectionModel().getSelected();
			//console.log("rec", rec.get('callsign'));
			if(rec){
				var pLatLng = self.markers[rec.get('callsign')].getPosition()
				self.Map.panTo(pLatLng);
			}
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






