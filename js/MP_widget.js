//var FG = {};
//FG.map = {};
//FG.pilots_list = {};

function MP_Widget(){

var self = this;
this.webSocket = '';


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
	{name: "alt", type: 'float'},
	{name: "heading", type: 'string'},
	{name: "pitch", type: 'string'},
	{name: "roll", type: 'string'}
]);

//* list of pilot markers (atmo there is no ID etc in api3)
this.pilotMarkers = {};

//* Pilots Datastore
this.pilotsStore = new Ext.data.Store({
	fields: [ 	{name: 'flag', type: 'int'},
				{name: "callsign", type: 'string'},
				{name: "server_ip", type: 'string'},
				{name: "model", type: 'string'},
				{name: "lat", type: 'float'},
				{name: "lng", type: 'float'},
				{name: "alt", type: 'float'},
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
			'-',// this.actionLabSelectToolbarButton,
			'->',
			//Geo2.widgets.goto_www('Online', 'View rates on website', '/rates.php'),
			{text: 'Connect', iconCls: 'iconRefresh', handler: function(){
				//pilotsStore.reload();
				self.create_socket()
				}
			}    
	],
	viewConfig: {emptyText: 'No pilots online', forceFit: true}, 
	//sm: this.selModel,
	store: this.pilotsStore,
	loadMask: true,
	//TODO sm: pilotsSelectionModel,
	columns: [  //TODO pilotsSelectionModel,
				{header: 'CallSign',  dataIndex:'callsign', sortable: true, renderer: this.render_callsign},
				{header: 'Aircraft',  dataIndex:'model', sortable: true}
	],
	listeners: {},
	bbar: [this.pilotsSummaryCountLabel, '->',  this.statusLabel]
});
    
this.pilotsMainGrid = new Ext.grid.GridPanel({
	title: 'Pilots Data',
	iconCls: 'iconPilots',
	autoScroll: true,
	autoWidth: true,
	viewConfig: {emptyText: 'No pilots online', forceFit: true}, 
	store: this.pilotsStore,
	loadMask: true,
	columns: [  //this.selModel,	
		{header: 'F',  dataIndex:'flag', sortable: true, width: 20},
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
			activeTab: 1,
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
						//* Pilot exists so update
						rec.set('flag', 0);
						rec.set('lat', pilots[rec.id].lat);
						rec.set('lng', pilots[rec.id].lng);
						rec.set('alt', pilots[rec.id].alt);
						//rec.set('alt', pilots[rec.id].alt);
						//rec.set('heading', pilots[rec.id].heading);
						//rec.set('pitch', pilots[rec.id].pitch);
						//rec.set('roll', pilots[rec.id].roll);
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
			//console.log("add", p);
			pilots[p].flag = 1;
			var pRec = new PilotRecord(pilots[p], p);
			self.pilotsStore.add(pRec);
			delete pilots[p]
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

map_initialize();

} /*** MP_Widget() */


Ext.onReady(function(){
	var widget = new MP_Widget();
	setTimeout(widget.create_socket, 3000);
});






