// Set up the server...
var express = require('express'),
  	http = require('http'),
		app = express(),
		server = http.createServer(app),
		io = require('socket.io').listen(server),
		_ = require('underscore'),
		cutthroat = require('./public/js/models.js');

// npm install validator
sanitize = require('validator').sanitize;

server.listen(8000);

// Set up static files directory
app.configure(function() {
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Set up routing to game rooms
app.get( '/*', function(req, res) {
	var gameName = req.params[0] || 'default';
	res.redirect('/#' + gameName);
});

// For storing data
var players = new cutthroat.Players();
var games = {}; 

// When a new user connects...
io.sockets.on( 'connection', function(socket) {

	create_user(socket);
	socket.on( 'disconnect', function() {
		delete_user(socket);
	});

	// Chatting & talking
	talk(socket);
	typing(socket);

	// Game
	create_game(socket);
	switch_game(socket);
	socket.on( 'leave_game', function() {
		leave_game(socket);
	});
	socket.on( 'check_game', function(gameName) {
		check_game( socket, gameName );
	});

	change_maxplayers(socket);
	change_ready(socket);
	start_game(socket)

});

// =================================
// Managing Users
// =================================

// Creates a new user
function create_user(socket) {
	socket.on( 'create_user', function(name) {
		delete_user(socket);	// One name per socket/user...

		if ( name != null && name != '' ) {
			var newPlayer = new cutthroat.Player({
				'name': sanitize(name).entityEncode(),
				'color': genColor(),
				'socketid': socket.id
			});
			players.add( newPlayer );
		}
	});
}

// Delete user's player model, then leave game
function delete_user(socket) {
	leave_game(socket);
	delete players[socket.id];
}

// =================================
// Games
// =================================


// Check if the game already exists,
// If so, join it,
// Otherwise, create a new one
function check_game(socket, gameName) {
	if ( games[gameName] ) {
		join_game(socket, gameName);	
	} else {
		new_game(socket, gameName);
	}
}

// Create a new game (via the create game window)
function create_game(socket) {
	socket.on( 'new_game', function(gameName, gamePlayers ) {
		new_game( socket, gameName, gamePlayers );
		socket.emit( 'created_game', gameName );
	});
}

// Creates a new Game instance, then joins to that game
function new_game(socket, gameName, gamePlayers) {
	console.log('making new game making new game');

	var gameName = gameName.toLowerCase();
	var gamePlayers = gamePlayers || 4;

	// Create a new Game and put it in our hash
	games[gameName] = new cutthroat.Game({
		'name': gameName,
		'maxPlayers': gamePlayers
	});

	join_game(socket, gameName);
}

// joins this socket to a game
function join_game(socket, gameName) {
	var game = games[gameName.toLowerCase()];
	var numUsers = game.players.length;
	var maxPlayers = game.get( 'maxPlayers' );
	var id = socket.id;
	var player = getPlayer( id );

	console.log('is player null?')
	console.log(player);
	console.log('socket id is:');
	console.log(id);

	console.log(players.models);

	if ( player != null ) {

		// if this is the first user, make them admin
		if ( numUsers == 0 ) {
			player.set( 'admin', true );
		} else {
			player.set( 'admin', false );
		}

		// Check to see if the game's full
		if ( numUsers >= maxPlayers ) {
			socket.emit( 'game_full', gameName );
		} else if ( game.get( 'inProgress' ) ) {
		// Or in progress
			socket.emit( 'game_inprogress', gameName );
		} else {
			// Join the socket to the game
			socket.join( gameName );

			// Keep track of what game this player is in
			player.set( 'game', gameName );

			// Add Player to Game's Players collection
			game.players.add( player );

			// Notify other players, welcome new player
			console.log('newly made game');
			console.log(game);

			socket.emit( 'game_joined', { 'game': game.xport(), 'player': player.xport() } );
			socket.broadcast.to( gameName ).emit( 'user_joined', { 'player': player.xport() } );
			socket.emit( 'welcome', { 'player': player.xport() } );

			// New player is not ready
			io.sockets.in( gameName ).emit( 'not_ready' );
		}

	}
}

// Leave a game
function leave_game(socket) {

	// Check if the player is actually in a game;
	var id = socket.id;
	var player = getPlayer( id );

	if ( player != null ) {
		var gameName = player.get( 'game' );
		if ( gameName != null ) {
			var game = games[gameName];

			// Check if the admin left
			if ( player.get( 'admin' ) && game.players.models[1] != null ) {
				var newAdmin = game.players.models[1];
				newAdmin.set( 'admin', true );
				player.set( 'admin', false );
				player.set( 'ready', false );
				// update all players in game
				io.sockets.in( gameName ).emit( 'update_player', { 'player': newAdmin.xport() } );
				socket.broadcast.to( gameName ).emit( 'new_admin', { 'player': newAdmin.xport() } );
			}

			// If this is the last player
			if ( game.players.models.length == 1 ) {
				// Delete the game
				game.players.models.length = 0;
				delete games[gameName];
			} else {
				socket.broadcast.to( gameName ).emit( 'user_left', { 'player': player.xport() } );

				console.log('removing player');
				console.log(players.models);
				game.players.remove( player );
				console.log(players.models);
				socket.leave( gameName );
				check_ready( gameName );
			}

		}
	}
}

// Switching games
function switch_game(socket) {
	socket.on( 'switch_game', function(gameName) {
		leave_game( socket );

		console.log('gameName hash');
		console.log(gameName);
		check_game( socket, gameName.substring(1) ); 
	});
}

// Starting the game
function start_game(socket) {
	socket.on( 'start_game', function() {
		var player = getPlayer( socket.id );
		var gameName = player.get( 'game' );
		var game = games[gameName];
		game.set( 'inProgress', true );
		io.sockets.in( gameName ).emit( 'update_game', { 'game': game.xport() } );
	});
}

// =================================
// Talking
// =================================

// Talk!!
function talk(socket) {
	socket.on( 'send_talk', function(talk) {
		if ( talk != null && talk != '' ) {
			var player = getPlayer( socket.id );
			if ( player != null ) {
				var gameName = player.get( 'game' );
				io.sockets.in( gameName ).emit( 'update_talk', { 'player': getPlayer( socket.id ).xport(), 'talk': sanitize(talk).entityEncode() } );
			}
		}
	});
}

// Typing...
function typing(socket) {
	socket.on( 'typing', function(typing) {
		var id = socket.id;
		var player = getPlayer( id );
		if ( player != null ) {
			var gameName = player.get( 'game' );
			if ( typing == true ) {
				io.sockets.in( gameName ).emit( 'is_typing', socket.id );
			}
			else {
				io.sockets.in( gameName ).emit( 'not_typing', socket.id );
			}
		}
	});
}

function change_maxplayers(socket) {
	socket.on( 'change_maxplayers', function(maxPlayers) {
		var gameName = getPlayer( socket.id ).get( 'game' );
		games[gameName].set( 'maxPlayers', maxPlayers );
		io.sockets.in( gameName ).emit( 'update_game', { 'game': games[gameName].xport() } );
	});
}

function change_ready(socket) {
	socket.on( 'change_ready', function() {
		var player = getPlayer( socket.id );
		if ( player != null ) {
			var gameName = player.get( 'game' );
			var ready = player.get( 'ready' );
			player.set( 'ready', !ready );
			io.sockets.in( gameName ).emit( 'update_player', { 'player': player.xport() } )
		}

		// Check if all players are ready
		check_ready( gameName );
	});
}

function is_ready( readies ) {
	for ( var i=0; i < readies.length; i++ ) {
		if ( readies[i] == false ) {
			return false;
		}
	}
	return true;
}

function check_ready( gameName ) {
	var readies = players.pluck( 'ready' );
	var game = games[gameName];
	if ( is_ready( readies ) && game.players.length <= game.get( 'maxPlayers' ) ) {
		io.sockets.in( gameName ).emit( 'all_ready' );
	} else {
		io.sockets.in( gameName ).emit( 'not_ready' );
	}
}

// =================================
// Helpful Stuff
// =================================

// For getting this socket's player model
function getPlayer( userid ) {
	return players.where({ 'socketid': userid })[0];
}

// For generating a hex color
// adapted from: http://paulirish.com/2009/random-hex-color-code-snippets/
function genColor() {
	return '#'+Math.floor(Math.random()*16777215).toString(16);
}