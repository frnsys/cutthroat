// =============================================
// Views
// =============================================	

// game swiching no working

$(function() {
	window.GameView = Backbone.View.extend({
		tagName: 'div',
		className: 'game',
		template: _.template( $('#game-template').html() ),	
		initialize: function(options) {
			this.socketid = options.socketid;
			_.bindAll( this, 'render', 'remove' );
			this.model.bind( 'change', this.render );
			this.model.bind( 'reset', this.render );
			this.render();
		},
		render: function() {
			var $players,
				game = this.model,
				$chat = $(this.el).find('.talk').html();
			$(this.el).html( this.template );
			$players = this.$('.players');

			var playersView = new PlayerListView({
				collection: game.players,
				game: game
			});
			$players.append( playersView.render().el );

			// Check if game is in progress
			if ( !this.model.get( 'inProgress') ) {
				var settingsView = new GameSettingsView({
					model: game,
					// Get this socket's player
					player: game.players.where({ 'socketid': this.socketid })[0]
				});
				$players.append( settingsView.render().el );
			}

			// Now render the actual game view
			$('.gamebox').append( $(this.el) );
			$(this.el).find('.talk').html( $chat );
			return this;
		}
	});

	window.PlayerView = Backbone.View.extend({
		tagName: 'li',
		className: 'player',
		template: _.template( $('#player-template').html() ),
		events: {
			// events go here
		},
		initialize: function(options) {
			_.bindAll( this, 'render', 'remove' );
			this.model.bind( 'change', this.render );
			this.model.bind( 'reset', this.render );
			this.model.bind( 'destroy', this.remove );
			this.inprogress = this.options.inprogress;
		},
		render: function() {
			var renderedContent = this.template( this.model.toJSON() );
			$(this.el).attr( 'data-id', this.model.get( 'socketid' ) ).html( renderedContent );

			// Check if ready
			if ( this.model.get( 'ready' ) && !this.inprogress ) {
				$(this.el).prepend( $('#readyimg').html() );
			}

			return this;
		}
	});

	window.PlayerListView = Backbone.View.extend({
		tagName: 'div',
		template: _.template( $('#playerlist-template').html() ),
		initialize: function() {
			_.bindAll( this, 'render', 'remove' );
			this.collection.bind( 'change', this.render );
			this.collection.bind( 'reset', this.render );
			this.game = this.options.game;
		},
		render: function() {
			var $playersList,
				collection = this.collection;

			$(this.el).html( this.template( { name: this.game.get( 'name' ) } ) );
			$playersList = this.$('.players-list');
			collection.each( function( player ) {
				var view = new PlayerView({
					model: player,
					collection: collection,
					inprogress: this.game.get( 'inProgress' )
				});
				$playersList.append( view.render().el );
			});
			return this;
		}
	});

	window.GameSettingsView = Backbone.View.extend({
		tagName: 'div',
		className: 'panel',
		initialize: function(options) {
			_.bindAll( this, 'render', 'remove' );
			this.player = options.player;
			this.model.bind(' change', this.render );
			this.model.bind( 'reset', this.render );
			this.player.bind( 'change', this.render );
		},
		render: function() {
			if ( this.player.get( 'admin' ) ) {
				this.template = _.template( $('#adminsettings-template').html() );
			} else {
				this.template = _.template( $('#gamesettings-template').html() );
			}
			var renderedContent = this.template( this.model.toJSON() );

			// Set the max players dropdown
			$(this.el).html( renderedContent ).find('#max_players').val( this.model.get( 'maxPlayers' ) );

			// Check if this player is ready
			if ( this.player.get( 'ready' ) ) {
				$(this.el).find('.ready').html( 'Nope' );
			}

			// Check if there are too many players...
			if ( this.model.players.length > this.model.get( 'maxPlayers' ) ) {
				var $toofull = _.template( $('#toofull-template').html() );
				$(this.el).prepend( $toofull( { 'excess': this.model.players.length - this.model.get( 'maxPlayers' ) } ) );	
			}
			return this;
		}
	});
});
