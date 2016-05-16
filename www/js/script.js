//Al iniciar la página
$(document).on('pageinit', function() {
	//ID del usuario, ID Cliente y posicion inicial de cada cancion (para más adelante)
	var id = "181783637", client_id ="f36abe5e283bc2059b1f55507af890eb"; var position=1, canciones=[];
	//He añadido el SDK de SoundCloud porque si no, no deja hacer stream
	SC.initialize({
        client_id: client_id
    });
	//Se recuperan los datos de SoundCloud como un JSON
	$.getJSON("http://api.soundcloud.com/tracks/?client_id="+client_id+"&user_id="+id, function(tracks) {
		//Por cada objeto...
		$(tracks).each(function(index,value) {
			//alameceno las urls de streaming de cada cancion para luego acceder rapidamente a ellas
			canciones.push(value.id);
			//Creamos un elemento li, con clase track para los estilos y su posicion
			var $li = $("<li>", { "class": "track", "data-position":position });
			//Cargamos la plantilla track.html...
			$li.load("track.html", function() {
				//Y se asignan los datos a la plantilla
				$li.find("img").attr("src",value.artwork_url);
				$li.find("h2").html(value.title);
				$li.find("p").html(value.user.username);
				//Se añade el li creado dinamicamente y refrescamos el listview
				$("#tracks").append($li).listview("refresh");
				//Se suma la posicion para el siguiente
				
			});
			position++;	
		});
	});
	
	//Al pulsar sobre una cancion, se recoge la url que se guardo en canciones y se reproduce
	$("#tracks").on("click","li", function() {
		var id = $(this).attr("data-position");
		SC.stream("/tracks/"+canciones[id]).then(function(player){
			player.play();
		});
	});
});

/* @Author: Mario
   @Description: Convert MilliSecond to Second's and save if is Edit or not (not = sesion)
   @Param Input: Duration audio in milliseconds
   @Param Output: False = audio is a sesion, True = audio is a edit
*/
function isEdit(mil){	
	var isEdit = false;
    var durationAudioInSeconds =  (mil/1000/60);
	var minToIsSesion = 600; // seconds
	
	// min to edit 600 seconds or 10 minutes.
	if(durationAudioInSeconds <= minToIsSesion){
		isEdit = true;
	}
	
    return isEdit;
}