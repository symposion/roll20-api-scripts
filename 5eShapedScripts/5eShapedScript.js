// Github:    https://github.com/symposion/roll20-api-scripts/
// By:       Mark Lenser, Lucian Holland

var ShapedScripts = ShapedScripts || (function () {
	'use strict';

	/////////////////////////////
	// General helpers
	/////////////////////////////

	var version = '0.1',
	schemaVersion = 0.1,
	myState = state.ShapedScripts,
	hpBar = 'bar1',

	//All the main functions sit inside a module object so that I can
	//wrap them for log tracing purposes
	module = {
		handleInput: function (msg) {
			if (msg.type !== "api") {
				return;
			}
			try {
				var args = msg.content.split(/\s+--/);
				var command = args.shift();
				switch (command) {
					case '!5es-config':
						this.configure(this.makeOpts(args, this.configOptionsSpec));
						break;
				}
			}
			catch (e) {
				if (typeof e === 'string') {
					report('An error occurred: ' + e);
					logger.error("Error: $$$", e)
				}
				else {
					logger.error('Error: ' + e.toString());
					report('An error occurred. Please see the log for more details.');
				}
			}
			finally {
				logger.prefixString = '';
			}
		},

		configOptionsSpec: {
			logLevel: function (value) {
				var converted = value.toUpperCase();
				return {valid: _.has(logger, converted), converted: converted};
			}
		},

		makeOpts: function (args, spec) {
			return _.reduce(args, function (options, arg) {
				var parts = arg.split(/\s+/);
				if (parts.length <= 2) {
					//Allow for bare switches
					var value = parts.length == 2 ? parts[1] : true;
					var validator = spec[parts[0]];
					if (validator) {
						var result = validator(value);
						if (result.valid) {
							options[parts[0]] = result.converted;
							return options;
						}
					}
				}
				logger.error('Unrecognised or poorly formed option [$$$]', arg);
				report('ERROR: unrecognised or poorly formed option --' + arg + '');
				return options;
			}, {});
		},

		processSelection: function (msg, constraints) {
			var selection = msg.selected ? msg.selected : [];
			return _.reduce(constraints, function (result, constraintDetails, type) {
				var objects = _.chain(selection)
				.where({_type: type})
				.map(function (selected) {
					return getObj(selected._type, selected._id);
				})
				.compact()
				.value();
				if (_.size(objects) < constraintDetails.min || _.size(objects) > constraintDetails.max) {
					throw ('Wrong number of objects of type [' + type + '] selected, should be between ' + constraintDetails.min + ' and ' + constraintDetails.max);
				}
				switch (_.size(objects)) {
					case 0:
						break;
					case 1:
						if (constraintDetails.max === 1) {
							result[type] = objects[0];
						}
						else {
							result[type] = objects;
						}
						break;
					default:
						result[type] = objects;
				}
				return result;
			}, {});
		},

		/////////////////////////////////////////
		// Command handlers
		/////////////////////////////////////////
		configure: function (options) {
			_.each(options, function (value, key) {
				logger.info('Setting configuration option $$$ to $$$', key, value);
				myState.config[key] = value;
			});

			report('Configuration is now: ' + JSON.stringify(myState.config));
		},

		addedTokenIds: [],

		/////////////////////////////////////////////////
		// Event Handlers
		/////////////////////////////////////////////////
		handleAddToken: function (token) {
			var represents = token.get('represents');
			if (_.isEmpty(represents)) return;
			var character = getObj('character', represents);
			if (!character) return;
			module.addedTokenIds.push(token.id);
		},

		handleChangeToken: function (token) {
			if (_.contains(module.addedTokenIds, token.id)) {
				module.addedTokenIds = _.without(module.addedTokenIds, token.id);
				var represents = token.get('represents');
				var character = getObj('character', represents);
				var hpBarLink = token.get(hpBar + '_link');
				if (hpBarLink) return;
				var formula = getAttrByName(represents, 'hp_formula');
				if (!formula) return;


				sendChat('', '%{' + character.get('name') + '|npc_hp}', function (results) {
					if (results && results.length === 1) {
						var message = module.processInlinerolls(results[0]);
						var total = results[0].inlinerolls[0].results.total;
						sendChat('HP Roller', '/w GM &{template:5e-shaped} ' + message);
						token.set(hpBar + '_value', total);
						token.set(hpBar + '_max', total);
					}
				});
			}
		},

		processInlinerolls: function (msg) {
			if (_.has(msg, 'inlinerolls')) {
				return _.chain(msg.inlinerolls)
				.reduce(function (previous, current, index) {
					previous['$[[' + index + ']]'] = current.results.total || 0;
					return previous;
				}, {})
				.reduce(function (previous, current, index) {
					return previous.replace(index, current);
				}, msg.content)
				.value();
			} else {
				return msg.content;
			}
		},

		checkInstall: function () {
			logger.info('-=> ShapedScripts v$$$ <=-', version);
			if (!_.has(state, 'ShapedScripts') || myState.version !== schemaVersion) {
				logger.info('  > Updating Schema to v$$$ from $$$<', schemaVersion, myState && myState.version);
				logger.info('Preupgrade state: $$$', myState);
				switch (myState && myState.version) {
					default:
						if (!myState) {
							state.ShapedScripts = {
								version: schemaVersion,
								config: {
									logLevel: 'INFO'
								}
							};
							myState = state.ShapedScripts;
							logger.info('Making new state object $$$', myState);
						}
						else {
							logger.fatal('Unknown schema version for state $$$', myState);
							report('Serious error attempting to upgrade your global state, please see log for details. '
							+ 'ShapedScripts will not function correctly until this is fixed');
							myState = undefined;
						}
						break;
				}
				logger.info('Upgraded state: $$$', myState);
			}
		},

		logWrap: 'module'
	};

	var report = function (msg) {
		//Horrible bug with this at the moment - seems to generate spurious chat
		//messages when noarchive:true is set
		//sendChat('ShapedScripts', '' + msg, null, {noarchive:true});
		sendChat('ShapedScripts', '/w gm ' + msg);
	},

	logger = (function () {
		var logger = {
			OFF: 0,
			ERROR: 1,
			WARN: 2,
			INFO: 3,
			DEBUG: 4,
			TRACE: 5,
			prefixString: ''
		};

		logger.getLabel = function (logLevel) {
			var logPair = _.chain(this).pairs().find(function (pair) {
				return pair[1] === logLevel;
			}).value();
			return logPair ? logPair[0] : 'UNKNOWN';
		};

		var stringify = function (object) {
			if (typeof object === 'undefined') return object;
			var result = (typeof object === 'string') ? object : JSON.stringify(object);
			if (result) result = result.replace(/"/g, '');
			return result;
		};

		var shouldLog = function (level) {
			var logLevel = logger.INFO;
			if (myState && myState.config && myState.config.logLevel !== undefined) {
				logLevel = logger[myState.config.logLevel]
			}

			return level <= logLevel;
		};

		var outputLog = function (level, message) {

			if (!shouldLog(level)) return;

			var args = arguments.length > 2 ? _.toArray(arguments).slice(2) : [];
			message = stringify(message);
			if (message) {
				message = message.replace(/\$\$\$/g, function () {
					return stringify(args.shift());
				});
			}
			log('ShapedScripts ' + Date.now()
			+ ' ' + logger.getLabel(level) + ' : '
			+ (shouldLog(logger.TRACE) ? logger.prefixString : '')
			+ message);
		};

		_.each(logger, function (level, levelName) {
			logger[levelName.toLowerCase()] = _.partial(outputLog.bind(logger), level);
		});

		logger.wrapModule = function (modToWrap) {
			if (shouldLog(logger.TRACE)) {
				_.chain(modToWrap)
				.functions()
				.each(function (funcName) {
					var origFunc = modToWrap[funcName];
					modToWrap[funcName] = logger.wrapFunction(funcName, origFunc, modToWrap.logWrap);
				});
				modToWrap.isLogWrapped = true;
			}
		};

		logger.wrapFunction = function (name, func, moduleName) {
			if (shouldLog(logger.TRACE)) {
				if (name === 'toJSON') {
					return func;
				}
				return function () {
					logger.trace('$$$.$$$ starting with args $$$', moduleName, name, arguments);
					logger.prefixString = logger.prefixString + '  ';
					var retVal = func.apply(this, arguments);
					logger.prefixString = logger.prefixString.slice(0, -2);
					logger.trace('$$$.$$$ ending with return value $$$', moduleName, name, retVal);
					if (retVal && retVal.logWrap && !retVal.isLogWrapped) {
						logger.wrapModule(retVal, retVal.logWrap);
					}
					return retVal;
				};
			}
			return func;
		};
		return logger;
	})(),

	registerEventHandlers = function () {
		on('chat:message', module.handleInput.bind(module));
		on('add:token', module.handleAddToken.bind(module));
		on('change:token', module.handleChangeToken.bind(module));
	};
	logger.wrapModule(module);


	return {
		RegisterEventHandlers: registerEventHandlers,
		CheckInstall: module.checkInstall.bind(module)
	};
}());


on("ready", function () {
	'use strict';
	ShapedScripts.CheckInstall();
	ShapedScripts.RegisterEventHandlers();
});





