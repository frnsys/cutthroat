(function($) {

	// =============================================
	// Models & Collections
	// =============================================

	window.User = Backbone.Model.extend({
		defaults: {
			'name': 'bleh',
			'words': [],
			'color': '000000'
		},

		getScore: function() {
			return this.get('words').each();	// need to get it so it calculates the score
		}
	});

	window.Letter = Backbone.Model.extend({
			defaults: {
				'value': 1,
				'flipped': false
			}
	});

	window.Word = Backbone.Collection.extend({
		model: Letter
	});

	window.Room = Backbone.Model.extend({
		defaults: {
			'name': 'my room',
			'private': false,
			'maxPlayers': 4,
			'admin': '' //user object
		}
	});


	// =============================================
	// Views
	// =============================================

	window.RoomItemView = Backbone.View.extend({
		tagName: 'li',

		events: {
			'click': 'toggleComplete',
			'click .destroy': 'clear'
		},

		initialize: function() {
			_.bindAll( this, 'render', 'remove' );
			this.model.bind( 'change', this.render );
			this.model.bind( 'destroy', this.remove );
			this.template = _.template( $('#roomitem-template').html() );
		},

		render: function() {
			var renderedContent = this.template( this.model.toJSON() );
			$(this.el).html( renderedContent );
			$(this.el).toggleClass( 'completed', this.model.get('complete') );
			return this;
		},

		toggleComplete: function() {
			this.model.toggleComplete();
		},

		clear: function() {
			this.model.clear();
		}
	});

	window.RoomsView = Backbone.View.extend({
		tagName: 'div',

		initialize: function() {
			_.bindAll(this, 'render');
			this.collection.bind( 'reset', this.render );
			this.template = _.template( $('#rooms-template').html()) ;
		},

		render: function() {
			var $todos,
				collection = this.collection;

			$(this.el).html(this.template({}));
			$todos = this.$('.todos');
			collection.each( function(todo) { 
				var view = new TodoView({
					model:todo,
					collection:collection
				});
				$todos.append(view.render().el)
			});
			return this;
		}
	});

	window.Cutthroat = Backbone.Router.extend({
		routes: {
			'': 'home'
		},

		initialize: function() {
			this.todosView = new TodosView({
				collection: window.todos
			})
		},

		home: function() {
			var $container = $('#container');
			$container.empty();
			$container.append( this.todosView.render().el )
		}

	});

	$(function() {
		window.App = new Cutthroat();
		Backbone.history.start();
	});


// ---------------- examples:

	window.Todo = Backbone.Model.extend({
		defaults: {
			'complete': false
		},

		isComplete: function() {
			return this.get('complete');
		},

		toggleComplete: function() {
			this.set({ complete: !this.get('complete') });
		},

		clear: function() {
			this.destroy();
		}
	});

	window.Todos = Backbone.Collection.extend({
		model: Todo,
		url: '/todos.json'
	});

	window.todos = new Todos();

	window.TodoView = Backbone.View.extend({
		tagName: 'li',
		className: 'todo', 

		events: {
			'click': 'toggleComplete',
			'click .destroy': 'clear'
		},

		initialize: function() {
			_.bindAll( this, 'render', 'remove' );
			this.model.bind( 'change', this.render );
			this.model.bind( 'destroy', this.remove );
			this.template = _.template( $('#todo-template').html() );
		},

		render: function() {
			var renderedContent = this.template( this.model.toJSON() );
			$(this.el).html( renderedContent );
			$(this.el).toggleClass( 'completed', this.model.get('complete') );
			return this;
		},

		toggleComplete: function() {
			this.model.toggleComplete();
		},

		clear: function() {
			this.model.clear();
		}
	});

	window.TodosView = Backbone.View.extend({
		tagName: 'section',

		initialize: function() {
			_.bindAll(this, 'render');
			this.collection.bind( 'reset', this.render );
			this.template = _.template( $('#todos-template').html()) ;
		},

		render: function() {
			var $todos,
				collection = this.collection;

			$(this.el).html(this.template({}));
			$todos = this.$('.todos');
			collection.each( function(todo) { 
				var view = new TodoView({
					model:todo,
					collection:collection
				});
				$todos.append(view.render().el)
			});
			return this;
		}
	});


	window.BackboneTodo = Backbone.Router.extend({
		routes: {
			'': 'home'
		},

		initialize: function() {
			this.todosView = new TodosView({
				collection: window.todos
			})
		},

		home: function() {
			var $container = $('#container');
			$container.empty();
			$container.append( this.todosView.render().el )
		}

	});

	$(function() {
		window.App = new BackboneTodo();
		Backbone.history.start();
	});


})(jQuery);
