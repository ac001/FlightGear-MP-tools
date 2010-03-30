
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
CallsignOverlay.prototype.onRemove = function() {
  this.div_.parentNode.removeChild(this.div_);
  this.div_ = null;
}
//*******************************************************************************
// Core Object
//*******************************************************************************
function MP_Widget(){

var self = this;

this.epoch = new Date().getTime();
this.precessing_request = false;

this.webSocket = null;
this.Map = null
this.callsignOverlays = {}

this.markers = {} //* Aircraft Markers
this.markersInfo = {} //** Experimantal info window
this.polyLines = {} //* Poly line object
this.polyCoordinates = {} //* Coordinated from polyLines

this.icons = {};

this.icons.level = {}
this.icons.level.blue		= 'images/level_blue.png';
this.icons.level.red		= 'images/level_red.png';

this.icons.climb = {}
this.icons.climb.blue		= 'images/climb_blue.png';
this.icons.climb.red		= 'images/climb_red.png';

this.icons.descend = {}
this.icons.descend.blue		= 'images/descend_blue.png';
this.icons.descend.red		= 'images/descend_red.png';


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

//*****************************************
//** Altirude Related
//*****************************************
this.render_altitude = function (v, meta, rec, rowIdx, colIdx, store){
	return "<span style='color:" + self.altitude_color(v) + ";'>" + Ext.util.Format.number(v, '0,000'); + '</span>';
}
this.render_altitude_trend = function (v, meta, rec, rowIdx, colIdx, store){
	return "<img src='" + self.altitude_image(v, rec.get('check') == 1) + "'>";
}
this.altitude_image = function(alt_trend, is_selected){
	var color = is_selected ? 'red' : 'blue';
	if(alt_trend == 'level'){
		return self.icons.level[color];
	}
	return alt_trend == 'climb' ? self.icons.climb[color] : self.icons.descend[color];
}
this.altitude_color = function(v){
	if(v < 1000){
		color = 'red';
	}else if(v < 2000){
		color = '#FA405F';
	}else if(v < 4000){
		color = '#A47F24';
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
	return color;

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
	{name: 'check', type: 'int'},
	{name: "callsign", type: 'string'},
	{name: "server", type: 'string'},
	{name: "aircraft", type: 'string'},
	{name: "lat", type: 'float'},
	{name: "lng", type: 'float'},
	{name: "alt", type: 'int'},
	{name: "alt_trend", type: 'string'},
	{name: "hdg", type: 'string'},
	{name: "dist", type: 'string'}
]);

//* Pilots Datastore
this.pilotsStore = new Ext.data.Store({
	idProperty: 'callsign',
	fields: [ 	{name: 'flag', type: 'int'},
				{name: 'check', type: 'int'},
				{name: "callsign", type: 'string'},
				{name: "server", type: 'string'},
				{name: "aircraft", type: 'string'},
				{name: "lat", type: 'float'},
				{name: "lng", type: 'float'},
				{name: "alt", type: 'int'},
				{name: "alt_trend", type: 'string'},
				{name: "hdg", type: 'string'},
				{name: "dist", type: 'string'}
	],
	remoteSort: false,
	sortInfo: {field: "callsign", direction: 'ASC'}
});


//************************************************
//** Pilots Grid in Lookup SideBar Grid
//************************************************
//** selection model for grid below
this.checkSelectionModel = new Ext.grid.CheckboxSelectionModel({singleSelect:false});
this.checkSelectionModel.on('rowselect', function(selmodel, idx, rec){
	var callsign = rec.get('callsign');
	self.markers[callsign].setIcon(self.altitude_image(callsign, true));
	self.polyLines[callsign].setOptions({'strokeColor':  'red'});
	rec.set('check', 1);
});
this.checkSelectionModel.on('rowdeselect', function(selmodel, idx, rec){
	var callsign = rec.get('callsign');
	self.markers[callsign].setIcon(self.altitude_image(callsign, false));
	self.polyLines[callsign].setOptions({'strokeColor':  'blue'});
	rec.set('check', 0);
});

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
	sm: this.checkSelectionModel,
	store: this.pilotsStore,
	loadMask: true,
	//TODO sm: pilotsSelectionModel,
	columns: [  this.checkSelectionModel,
				{header: 'CallSign',  dataIndex:'callsign', sortable: true, renderer: this.render_callsign},
						{header: 'Alt', dataIndex:'alt', sortable: true, align: 'right',
					renderer: this.render_altitude
				},
				{header: '', dataIndex:'alt_trend', sortable: true, align: 'center', width: 20,	renderer: this.render_altitude_trend},
				/*
				{header: 'Lat', dataIndex:'lat', sortable: true, align: 'right', hidden: true,
					renderer: function(v, meta, rec, rowIdx, colIdx, store){
						return Ext.util.Format.number(v, '0.000');
					}
				},
				{header: 'Lng', dataIndex:'lng', sortable: true, align: 'right', hidden: true,
					renderer: function(v, meta, rec, rowIdx, colIdx, store){
						return Ext.util.Format.number(v, '0.000');
					}
				}, */
				{header: 'Dist', dataIndex:'dist', sortable: true, align: 'left'},
				{header: 'Hdg', dataIndex:'hdg', sortable: true, align: 'left'}
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
		{header: 'F',  dataIndex:'flag', sortable: true, width: 40, hidden: true},
		{header: 'CallSign',  dataIndex:'callsign', sortable: true, renderer: this.render_callsign},
		{header: 'Aircraft',  dataIndex:'aircraft', sortable: true, sssrenderer: this.render_callsign},
		{header: 'Alt', dataIndex:'alt', sortable: true, align: 'right',
			renderer: this.render_altitude
		},
		{header: '', dataIndex:'alt_trend', sortable: true, align: 'center', width: 20,	renderer: this.render_altitude_trend},
		{header: 'Heading', dataIndex:'hdg', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return v; //Ext.util.Format.number(v, '0');
			}
		},
		{header: 'Dist', dataIndex:'dist', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return v; //Ext.util.Format.number(v, '0');
			}
		},
		{header: 'Airspeed', dataIndex:'airspeed', sortable: true, align: 'right',
			renderer: function(v, meta, rec, rowIdx, colIdx, store){
				return Ext.util.Format.number(v, '0');
			}
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
		},
		{header: 'Server', dataIndex:'server', sortable: true, align: 'left',
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
		{title: 'FlightGear WebSocket Map <small>v0.1-exp</small>', 
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
		if(self.processing_request){
			console.log("STILL PROCESS");
			return;
		}
		self.processing_request = true;

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

		var selectedRecord = self.pilotsLookupGrid.getSelectionModel().getSelected();
		var selected_callsign = selectedRecord ? selectedRecord.get('callsign') : '';

		//console.log(altitude_update, curr_epoch, self.epoch, (curr_epoch - self.epoch));
		if(self.pilotsStore.getCount() > 0){
			//for(var idx=0; idx <= pilotsStore.getCount(); idx++){
			self.pilotsStore.each( function(rec){	
				//var rec = pilotsStore.getAt(idx);
				if(rec){
					//#console.log( rec.id);
					var callsign = rec.get('callsign');
					if( pilots[callsign] ){
						//console.log(callsign);
						
						//* Pilot exists so update
						var pilot = pilots[callsign]
						rec.set('flag', 0);
						rec.set('lat', pilot.lat);
						rec.set('lng', pilot.lng);
						rec.set('alt', pilot.alt);
						rec.set('alt_trend', pilot.alt_trend);		
						rec.set('hdg', pilot.hdg);
						rec.set('dist', pilot.dist);

						//** Update Icon Marker
						var latlng = new google.maps.LatLng(pilot.lat, pilot.lng);
						self.markers[callsign].setPosition(latlng); 
						self.markers[callsign].setIcon( self.altitude_image(pilot.alt_trend, rec.get('check') == 1) ); 		

						//** Update callsign overlay
						self.callsignOverlays[callsign].setPosition(latlng);

						//** Update Polylines	
						//self.polyLines[callsign].setOptions({'strokeColor': selected_callsign == callsign ? 'red' : 'blue'});
						var path = self.polyLines[callsign].getPath();
						if(path.getLength() == 50){
							path.pop() //(9);
						}
						if(latlng.lat() == 0 && latlng.lng() == 0){
							console.log("dropped", latlng);
						}else{
							path.insertAt(0, latlng);
						}

						delete pilots[callsign]
					}else{
						//## TODO delete dead items
						var f = rec.get('flag');
						if(f < -10){
							
							var callsign = rec.get('callsign');
							console.log('NUKED', callsign)
							//* remove store
							self.pilotsStore.removeAt( self.pilotsStore.indexOfId(callsign));
							//* remove markers
							self.markers[callsign].setMap(null);
							delete self.markers[callsign];
							//* Callsign
							self.callsignOverlays[callsign].setMap(null);
							delete self.callsignOverlays[callsign];
							//* remove poly lines
							self.polyLines[callsign].setMap(null);
							delete self.polyLines[callsign];
							delete self.polyCoordinates[callsign];
							
						}else{
							if(f > 0){
								rec.set('flag', -1);	
							}else{
								f = f -1;
								rec.set('flag', f);	
							}
						}
					}
				}else{
					//console.log("errOR");
				}
			}, self);
		}
		//******** Create Pilots ********
		//* add new pilots_list
		for(var callsign in pilots){
			
			var pilot = pilots[callsign];

			//** create new record
			var pRec = new PilotRecord(pilot, callsign);
			pRec.set('callsign', callsign);
			pRec.set('flag', 0);
			pRec.set('check', 0);
			self.pilotsStore.add(pRec);

			//** Create New Marker and callsign overlay
			var latlng = new google.maps.LatLng(pilot.lat, pilot.lng);
			self.markers[callsign] = new google.maps.Marker({
									position: latlng, 
									map: self.Map,
									title: callsign,
									icon: self.altitude_image(pilot.alt_trend, false)
			});

			//** Create callsign overlay
			self.callsignOverlays[callsign] = new CallsignOverlay(callsign, latlng, self.Map);
	
			//** Create the PolyLines and Coordinates object
			self.polyCoordinates[callsign] = new google.maps.MVCArray();
			var polyOptions = {
				path: self.polyCoordinates[callsign],
				strokeColor: 'blue',
				strokeOpacity: 1.0,
				strokeWeight: 1
			}
			self.polyLines[callsign] = new google.maps.Polyline(polyOptions);
			self.polyLines[callsign].setMap(self.Map);

			delete pilots[callsign]
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
		self.processing_request = false;
	}
}



} /*** MP_Widget() */


Ext.onReady(function(){
	var widget = new MP_Widget();
	widget.map_initialize();
	setTimeout(widget.create_socket, 3000);
	
	
});






