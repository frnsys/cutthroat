// =============================================
// Controller
// =============================================	

var socket = io.connect();
var game;

// Talking

// When another user joins a game
socket.on( 'user_joined', function(data) {
	// Create the model of this user
	var player = updatePlayer( data['player'] );
	updateTalk( '<i><b style="color:' + player.get( 'color' ) + '">' + player.get( 'name' ) + '</b> has joined.</i><br />' );
});

// When user joins a game
socket.on( 'welcome', function(data) {
	var player = getPlayer(data);
	updateTalk( '<i>Welcome, <b style="color:' + player.get( 'color' ) + '">' + player.get( 'name' ) + '</b>!</i><br />');
});

// When another user leaves a game
socket.on( 'user_left', function(data) {
	var id = data['player'].attrs.socketid;
	var player = getPlayer(data);
	updateTalk( '<i><b style="color:' + player.get( 'color' ) + '">' + player.get( 'name' ) + '</b> has left.</i><br />' );
	// Remove the user from players
	game.players.remove( player );
});

// When a new user becomes admin
socket.on( 'new_admin', function(data) {
	var player = getPlayer(data);
	updateTalk( '<i><b style="color:' + player.get( 'color' ) + '">' + player.get( 'name' ) + '</b> is now admin.</i><br />' );
});

// When user talks
socket.on( 'update_talk', function(data) {
	var player = getPlayer(data);
	updateTalk( '<b style="color:' + player.get( 'color' ) + '">' + player.get( 'name' ) + ':</b> ' + data['talk'] + '<br />' );
});

// When user tries to connect to a full game
socket.on( 'game_full', function( gameName ) {
	$('.full').fadeIn();
  $('.full #gamename').focus();	  	
});

// When a user tries to connect a game in progress
socket.on( 'game_inprogress', function( gameName ) {
	$('.inprogress').fadeIn();
  $('.inprogress #gamename').focus();	  	
});

// When user or another user is typing
socket.on( 'is_typing', function(id) {
	$('.player[data-id=' + id + ']').find( '.typing' ).show();
});
socket.on( 'not_typing', function(id) {
	$('.player[data-id=' + id + ']').find( '.typing' ).hide();
});

// Update client-side Player model
// When its server-side version changes
socket.on( 'update_player', function(data) {
	updatePlayer( data['player'] );
});
// Same for the game
socket.on( 'update_game', function(data) {
	game.mport( data['game'] );
});

// When a game is successfully joined
socket.on( 'game_joined', function(data) {
		$('.overlay').fadeOut();
		$('.gameselect').fadeOut();
		$('.full').fadeOut();
		$('.inprogress').fadeOut();

		game = new cutthroat.Game();
		game.mport(data['game']);
		var player = new cutthroat.Player();
		player.mport(data['player']);

		document.location.hash = game.get('name').replace(/ /g,"_");

		window.view = new GameView({ 'model': game, 'socketid': player.get('socketid') });

		$('.gamebox').fadeIn();

		$('#talky').focus();
});

// When all users are ready (or not)
socket.on( 'all_ready', function() {
	$('.startgame').removeClass('inactive');
	$('.startgame').addClass('go');
});
socket.on( 'not_ready', function() {
	$('.startgame').addClass( 'inactive' );
	$('.startgame').removeClass( 'go' );
});

function updateTalk( talk ) {
	$('.talk').append( talk );
	$('.talktalk').stop().animate({ scrollTop: $('.talk').height() });
}

function updatePlayer( newData ) {
	// Try getting the server-side Player model by its socketid
	var id = newData.attrs['socketid'];
	// From the game's players collection
	var player = game.players.where({ 'socketid': id })[0];
	// If we didn't find anything...
	if ( player == null ) {
		// Create a new player
		player = new cutthroat.Player();
		// Add player to the game's players collection
		game.players.add( player );
	}
	// Import the data
	player.mport( newData );
	// Voila!
	return player;
}

function getPlayer( data ) {
	var player = game.players.where( { 'socketid': data['player'].attrs.socketid } )[0];
	return player;
}

$(function() {

	var hash = window.location.hash;

	$(window).bind( 'hashchange', function() {
		if ( hash !== "" ) {
			socket.emit( 'switch_game', window.location.hash );
			hash = window.location.hash;
		}
	});

	$('#name').focus();

	// Create user
	$('#join').live( 'click', function() {
		create_user();
	});
	$('#name').live( 'keypress', function(e) {
		if (e.keyCode == 13) {
			create_user();
		}
	});

	// Create talk (say something)
	$('#send_talk').live( 'click', function() {
		talk();
	});
	$('#talky').live( 'keypress', function(e) {
		if (e.keyCode == 13) {
			talk();
		}
	});

	// Typing...
	$('#talky').live( 'keypress', function() {
		socket.emit( 'typing', true );
	});
	$('#talky').live( 'keyup', function() {
		socket.emit( 'typing', false );
	});

	// Specifying a game name to join or create
	$('#join_game').live( 'click', function() {
		check_game();
	});
	$('#gamename').live( 'keypress', function(e) {
		if (e.keyCode == 13) {
			check_game();
		}
	});

	// Changing max players
	$('#max_players').live( 'change', function(){
		var gamePlayers = parseInt( $('#max_players').val() );
		socket.emit( 'change_maxplayers', gamePlayers );
	});

	// Changing readiness
	$('.ready').live( 'click', function() {
		socket.emit( 'change_ready' );
		$('#talky').focus();
	});

	// Begin game
	$('.go').live( 'click', function() {
		console.log('GAME HAS BEGUN!!');
		$('.panel').fadeOut( 'slow', function() {
			socket.emit( 'start_game' );
		});
		$('.player img').fadeOut( 'slow' );
	});


	// =======================
	// Functions...
	// =======================

	function talk() {
		socket.emit( 'send_talk', $('#talky').val() );
		$('#talky').val('').focus();
	}

	function create_user() {
	  socket.emit( 'create_user', $('#name').val() );
	  $('.join').fadeOut();

	  if ( window.location.hash != "" ) {
	  	check_game( window.location.hash.substring(1) );
	  } else {
		  $('.gameselect').fadeIn();
		  $('#gamename').focus();
		}
	}

	function check_game(game) {
		if ( game ) {
			var gameName = game;
		} else {
			if ( $('.full').is(':visible') ) {
			  var gameName = $('.full #gamename').val();
			} else if ( $('.gameselect').is(':visible') ) {
				var gameName = $('.gameselect #gamename').val();
			} else if ( $('.inprogress').is(':visible') ) {
				var gameName = $('.inprogress #gamename').val();
			}
  	}
		socket.emit( 'check_game', gameName );
	}

});
