document.addEventListener("deviceready", onDeviceReady, false);

//Al iniciar la página
function onDeviceReady() {
	checkConnection();
	ToneDenReady = window.ToneDenReady || [];
	ToneDenReady.push(function() {
		ToneDen.configure({
			soundcloudConsumerKey: 'f36abe5e283bc2059b1f55507af890eb'
		});
		// This is where all the action happens:
		ToneDen.player.create({
			dom: "#player",
			eq: "waves",
			skin: "dark",
			tracksPerArtist: 100,
			urls: [
				"https://soundcloud.com/djrajobosmusic"
			]
		});
	});
	
	//ID del usuario, ID Cliente, posicion inicial de cada cancion (para más adelante) y fecha de nacimiento
	var id = "181783637", client_id ="f36abe5e283bc2059b1f55507af890eb", canciones=[], nacimiento="1989-06-07";
	//Calculamos la edad y la pintamos en el sobre mi
	$(".edad").html(calcularEdad(nacimiento));
	//He añadido el SDK de SoundCloud porque si no, no deja hacer stream
	SC.initialize({
        client_id: client_id
    });
	//Limpiamos las listas para no duplicarlas
	$("#tracks-masnuevo").empty();
	$("#tracks-edits").empty();
	$("#tracks-sesiones").empty();
	//Se recuperan los datos de SoundCloud como un JSON
	$.getJSON("http://api.soundcloud.com/tracks/?client_id="+client_id+"&user_id="+id, function(tracks) {
		//Por cada objeto...
		$(tracks).each(function(index,value) {	
			//almaceno las urls de streaming de cada cancion para luego acceder rapidamente a ellas
			canciones.push(value.id);
			//Creamos un elemento li, con clase track para los estilos y su posicion
			var $li = $("<li>", { "class": "track", "data-position":index });
			//Cargamos la plantilla track.html...
			$li.load("track.html", function() {
				//Y se asignan los datos a la plantilla
				$li.find("img").attr("src",value.artwork_url);
				$li.find("h2").html(value.title);
				$li.find("p").html(parseDate(value.created_at));
				//Se añade el li creado dinamicamente y refrescamos el listview
				if(index<5) {
					var $clone = $li.clone();
					$("#tracks-masnuevo").append($clone).listview("refresh");
				}
				if(isEdit(value.duration)==true){
					$("#tracks-edits").append($li).listview("refresh");
				}else{
					$("#tracks-sesiones").append($li).listview("refresh");
				}	
			});
		});
	});
	
	//Al pulsar sobre una cancion, se recoge la url que se guardo en canciones y se reproduce
	$(".tracklist").on("click","li", function() {
		var id = $(this).attr("data-position");
		//var cover = $(this).find("img").attr("src");
		//var titulo = $(this).find("h2").html();
		
		//$("#reproductor").find(".coverPlayingNow").attr("src",cover);
		//$("#reproductor").find(".titlePlayingNow").html(titulo);
		ToneDen.player.getInstanceByDom("#player").skipTo(id);
		MusicControls.create({
			track       : $(this).find("h2").html(),        // optional, default : ''
			artist      : $(this).find("p").html(),                       // optional, default : ''
			cover       : $(this).find("img").attr("src"),      // optional, default : nothing
			// cover can be a local path (use fullpath 'file:///storage/emulated/...', or only 'my_image.jpg' if my_image.jpg is in the www folder of your app)
			//           or a remote url ('http://...', 'https://...', 'ftp://...')
			isPlaying   : true,                         // optional, default : true
			dismissable : true,                         // optional, default : false

			// hide previous/next/close buttons:
			hasPrev   : false,      // show previous button, optional, default: true
			hasNext   : false,      // show next button, optional, default: true
			hasClose  : true,       // show close button, optional, default: false

			// Android only, optional
			// text displayed in the status bar when the notification (and the ticker) are updated
			ticker    : 'Now playing "Time is Running Out"'
		});
		//SC.stream("/tracks/"+canciones[id]).then(function(player){
		//	player.play();
		//});
	});
	$(".ui-footer").on("swipeup",function() {alert("HOLA");});
	$(".ui-footer").find(".next").on("click",function() {
		ToneDen.player.getInstanceByDom("#player").next();
	});
	$(".ui-footer").find(".prev").on("click",function() {
		ToneDen.player.getInstanceByDom("#player").prev();
	});
	$(".ui-footer").find(".play").on("click",function() {
		if($(this).hasClass("tdicon-play-circle-outline")){
			$(this).removeClass("tdicon-play-circle-outline").addClass("tdicon-pause-circle-outline");
			ToneDen.player.getInstanceByDom("#player").togglePause(false);
		}else {
			$(this).removeClass("tdicon-pause-circle-outline").addClass("tdicon-play-circle-outline");
			ToneDen.player.getInstanceByDom("#player").togglePause(true);
		}
	});
}

/* @Author: Mario
   @Description: Convert MilliSecond to Second's and keep if is Edit or not (not = sesion)
   @Param Input: Duration audio in milliseconds
   @Param Output: False = audio is a sesion, True = audio is a edit
*/
function isEdit(mil){	
	var isEdit = false;
    var durationAudioInSeconds =  (mil/1000);
	var minToIsSesion = 600; // seconds
	
	// min to edit 600 seconds or 10 minutes.
	if(durationAudioInSeconds <= minToIsSesion){
		isEdit = true;
	}
	
    return isEdit;
}

/*	@Author: Kevin
	@Description: Parse timesamp date to friendly date
	@Param Ipunt: Timesamp date
	@Param Output: Friendly Date
*/
function parseDate(date) {
	
	var fecha = date.split(' ');   //yyyy/mm/dd
	var fechaParts = fecha[0].split('/');	
	var mes = "";
	
	switch (fechaParts[1])
	{
		case "01": mes = "Enero";   break;
		case "02": mes = "Febrero"; break;
		case "03": mes = "Marzo";   break;
		case "04": mes = "Abril";   break;
		case "05": mes = "Mayo";    break;
		case "06": mes = "Junio";   break;
		case "07": mes = "Julio";   break;
		case "08": mes = "Agosto";  break;
		case "09": mes = "Septiembre"; break;
		case "10": mes = "Octubre";    break;
		case "11": mes = "Noviembre"; break;
		case "12": mes = "Diciembre"; break;
	}
	
	var fechaBuild = fechaParts[2] + " " + mes + " " + fechaParts[0];
	return fechaBuild;// Note: months are 0-based
}

/*	@Author: Kevin
	@Description: Calc the age from date
	@Param Ipunt: Birthday
	@Param Output: Age
*/
function calcularEdad(fecha) {
	//split date in variables
	var values=fecha.split("-");
	var dia = values[2];
	var mes = values[1];
	var ano = values[0];

	//get actual values
	var fecha_hoy = new Date();
	var ahora_ano = fecha_hoy.getYear();
	var ahora_mes = fecha_hoy.getMonth()+1;
	var ahora_dia = fecha_hoy.getDate();

	//do the calc
	var edad = (ahora_ano + 1900) - ano;
	if ( ahora_mes < mes ){
		edad--;
	}
	if ((mes == ahora_mes) && (ahora_dia < dia)){
		edad--;
	}
	if (edad > 1900) {
		edad -= 1900;
	}
	//Return age
	return edad;
}

function checkConnection() {
	var networkState = navigator.network.connection.type;

	var states = {};
	states[Connection.UNKNOWN]  = 'Conexión desconocida';
	states[Connection.ETHERNET] = 'Conexión ethernet';
	states[Connection.WIFI]     = 'Conexión WiFi';
	states[Connection.CELL_2G]  = 'Conexión movil 2G';
	states[Connection.CELL_3G]  = 'Conexión movil 3G';
	states[Connection.CELL_4G]  = 'Conexión movil 4G';
	states[Connection.NONE]     = 'Sin conexión';

	alert('Tipo de conexión: ' + states[networkState]);
}