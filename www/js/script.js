$(document).on('pageinit', function() {
	var id = "181783637", client_id ="f36abe5e283bc2059b1f55507af890eb";
	$.getJSON("http://api.soundcloud.com/tracks/?client_id="+client_id+"&user_id="+id, function(tracks) {
		$(tracks).each(function(index,value) {
			$("#tracks").append("track.html");
			$(".title").html(value.title);
			$(".description").html(value.description);
		});
	});
});