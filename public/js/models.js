(function() {

	// This stuff sets it up so this can be 'require'd in node (app.js)
	// Server var to see if this is being executed client or server side
	var server = false, models;
	if (typeof exports !== 'undefined') {
		_ = require('underscore')._;
		Backbone = require('backbone');
		cutthroat = exports;
		server = true;
	} else {
		cutthroat = this.cutthroat || {};
	}

	// =============================================
	// Models & Collections
	// =============================================

	cutthroat.Player = Backbone.Model.extend({
		defaults: {
			'name': '',
			'socketid': 0,
			'color': '#000000',
			'score': 0,
			'admin': false,
      'ready': false,
			'game': null
		},
		initialize: function() {
			this.bind( 'remove', function() {
				this.destroy();
			});
		}
	});

	cutthroat.Players = Backbone.Collection.extend({
		model: cutthroat.Player
	});

	cutthroat.Letter = Backbone.Model.extend({
		defaults: {
			'value': 'A',
			'flipped': false
		}
	});

	cutthroat.Word = Backbone.Collection.extend({
		model: cutthroat.Letter
	});

	cutthroat.Game = Backbone.Model.extend({
		defaults: {
			'name': 'default',
			'maxPlayers': 4,
      'inProgress': false
		},
		initialize: function() {
			this.players = new cutthroat.Players();
			// The following bit is so this model saves whenever
			// it's internal collection is changed
			var model = this;
			this.players.bind( 'change', function() {
				model.change();
			});
		}
	});


	// =============================================
	// Model Exporting/Importing
	// by Henrik (http://andyet.net/blog/henrik/) 
	// Updated by Francis Tseng (yadonchow.com / @yadonchow)
	// =============================================
    
    Backbone.Model.prototype.xport = function(opt) {
      var process, result, settings;
      result = {};
      settings = _({
        recurse: true
      }).extend(opt || {});
      process = function(targetObj, source) {
        targetObj.id = source.id || null;
        targetObj.cid = source.cid || null;
        targetObj.attrs = source;
        return _.each(source, function(value, key) {
          if (settings.recurse) {
            if (key !== 'collection' && source[key] instanceof Backbone.Collection) {
              targetObj.collections = targetObj.collections || {};
              targetObj.collections[key] = {};
              targetObj.collections[key].models = [] || null;
              targetObj.collections[key].id = source[key].id || null;
              return _.each(source[key].models, function(mod, index) {
                return process(targetObj.collections[key].models[index] = {}, mod);
              });
            } else if (source[key] instanceof Backbone.Model) {
              targetObj.models = targetObj.models || {};
              return process(targetObj.models[key] = {}, value);
            }
          }
        });
      };
      process(result, this);
      return result;
    };


    Backbone.Model.prototype.mport = function(data, silent) {
    	var process;
    	process = function(targetObj, data) {
    		// targetObj is the new instance of the model
    		// data is the imported JSON object of the server-side instance of that model
    		targetObj.id = data.id || null;

    		// Load imported instance's attributes into this new instance
    		targetObj.set( data.attrs, { silent: silent } );

    		// If the imported instance contains collections
    		if ( data.collections ) {
    			// Iterate over each collection
    			_.each( data.collections, function(collection, name) {
            targetObj[name].length = 0;
            targetObj[name].models.length = 0;
    				targetObj[name].id = collection.id || null;
    				// Iterate over each model in the collection
    				return _.each( collection.models, function(modelData, index) {
    					// Add a new model to the collection
    					/* Note: as long as a model is explicitly defined in the collection,
								 passing an empty set of params for .add() will create an 
								 and instance of that model */
    					var newObj = targetObj[name].add( {}, { silent: silent } );	
    					return process(newObj.models[index], modelData);
    				});
    			});
    		}
    		if ($.type(data.models) !== "undefined") {
          return _.each(data.models, function(modelData, name) {
            return process(targetObj[name], modelData);
          });
        }
    	}
    	if ($.type(data) == "string") {
        process(this, JSON.parse(data));
      } else {
        process(this, data);
      }
      return this;
    }

})();
