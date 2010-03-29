<?php
$domain = file_exists('./LOCAL.txt') ? 'localhost' : 'flightgear.daffodil.uk.com';

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>

<head>

<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1;">
<title>FlightGear Map</title>

<!--<link rel="SHORTCUT ICON" href="images/favicon.png">-->


<link rel="stylesheet" type="text/css" href="http://fg-cache.appspot.com/js/ext-3.1.1/resources/css/ext-all.css">
<!--<link rel="stylesheet" type="text/css" href="js/ext-3.1.0/resources/css/xtheme-gray.css">-->
<script type="text/javascript" src="http://fg-cache.appspot.com/js/ext-3.1.1/adapter/ext/ext-base.js"></script>
<script type="text/javascript" src="http://fg-cache.appspot.com/js/ext-3.1.1/ext-all.js"></script>
<!--<script type="text/javascript" src="js/ext-3.1.0/ext-all.js"></script>-->



<meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
<script type="text/javascript" src="http://maps.google.com/maps/api/js?sensor=false"></script>
<script type="text/javascript">

	var icons = {};
	icons.red_blip 		= 'images/red_dot.png';
	icons.yellow_blip 	= 'images/yellow_dot.png';

	var SOCKET_ADDRESS = "ws://<?php echo $domain; ?>:5050/";



</script>


<link rel="stylesheet" type="text/css" href="style_sheets/v3.css">
<!--<script type="text/javascript" src="js/FG_PilotsGrid.js"></script>-->

  
<script type="text/javascript"  src="js/MP_widget.js"></script> 

</head> 
<body> 
    <!-- use class="x-hide-display" to prevent a brief flicker of the content --> 
    
    <div id="center2" sssclass="x-hide-display" style="width: 100%; height: 100%;"> 
        <iframe id="mp_status_iframe" style="width: 100%; height: 100%;"></iframe>
    </div> 
    <div id="map_canvas" ssclass="x-hide-display" style="width: 100%; height: 100%;"></div> 
    
</body> 
</html>

